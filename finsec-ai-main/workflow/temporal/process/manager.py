import subprocess
import atexit
import signal
import sys
import logging
from typing import Dict, List, Optional

from ..config import TEMPORAL_AVAILABLE
from ..models import ProcessInfo

if TEMPORAL_AVAILABLE:
    import psutil

logger = logging.getLogger('temporal_process_manager')

class ProcessManager:
    """Manages workflow processes with proper cleanup"""
    
    def __init__(self):
        self.active_processes: Dict[int, ProcessInfo] = {}
        self._setup_cleanup()
    
    def _setup_cleanup(self):
        """Setup cleanup handlers for graceful shutdown"""
        atexit.register(self.cleanup_all_processes)
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, cleaning up processes...")
        self.cleanup_all_processes()
        sys.exit(0)
    
    def start_process(self, workflow_id: int, command: List[str], run_id: str, 
                     temp_dir: str, **kwargs) -> subprocess.Popen:
        """
        Start a new process for a workflow
        
        Args:
            workflow_id: The workflow ID
            command: Command to execute
            run_id: Unique run identifier
            temp_dir: Temporary directory for execution
            **kwargs: Additional arguments for subprocess.Popen
            
        Returns:
            subprocess.Popen: The started process
        """
        try:
            # Default subprocess arguments
            default_kwargs = {
                'cwd': temp_dir,
                'stdout': subprocess.PIPE,
                'stderr': subprocess.PIPE,
                'text': True,
                'bufsize': 0,
                'universal_newlines': True,
                'errors': 'replace',
                'start_new_session': True
            }
            
            # Update with provided kwargs
            default_kwargs.update(kwargs)
            
            # Start the process
            process = subprocess.Popen(command, **default_kwargs)
            
            # Store process info
            process_info = ProcessInfo(
                process=process,
                run_id=run_id,
                temp_dir=temp_dir
            )
            
            self.active_processes[workflow_id] = process_info
            
            logger.info(f"Started process for workflow {workflow_id} with PID: {process.pid}")
            return process
            
        except Exception as e:
            logger.error(f"Error starting process for workflow {workflow_id}: {e}")
            raise
    
    def stop_process(self, workflow_id: int, timeout: int = 5) -> bool:
        """
        Stop a specific process
        
        Args:
            workflow_id: The workflow ID
            timeout: Timeout for graceful shutdown in seconds
            
        Returns:
            bool: True if process was stopped successfully
        """
        if workflow_id not in self.active_processes:
            logger.warning(f"No active process found for workflow {workflow_id}")
            return False
        
        process_info = self.active_processes[workflow_id]
        process = process_info.process
        
        if not TEMPORAL_AVAILABLE:
            logger.warning("psutil not available, using basic process termination")
            try:
                process.terminate()
                try:
                    process.wait(timeout=timeout)
                except subprocess.TimeoutExpired:
                    process.kill()
                del self.active_processes[workflow_id]
                return True
            except Exception as e:
                logger.error(f"Error stopping process for workflow {workflow_id}: {e}")
                return False
        
        try:
            if not psutil.pid_exists(process.pid):
                logger.info(f"Process {process.pid} for workflow {workflow_id} already stopped")
                del self.active_processes[workflow_id]
                return True
            
            # Get process and all children
            try:
                ps_process = psutil.Process(process.pid)
                children = ps_process.children(recursive=True)
            except psutil.NoSuchProcess:
                logger.info(f"Process {process.pid} for workflow {workflow_id} no longer exists")
                del self.active_processes[workflow_id]
                return True
            
            # Terminate child processes first
            for child in children:
                try:
                    child.terminate()
                except psutil.NoSuchProcess:
                    pass
            
            # Terminate main process
            try:
                ps_process.terminate()
            except psutil.NoSuchProcess:
                pass
            
            # Wait for graceful shutdown
            try:
                ps_process.wait(timeout=timeout)
            except (psutil.TimeoutExpired, psutil.NoSuchProcess):
                # Force kill if not terminated gracefully
                try:
                    ps_process.kill()
                except psutil.NoSuchProcess:
                    pass
                
                # Force kill children
                for child in children:
                    try:
                        child.kill()
                    except psutil.NoSuchProcess:
                        pass
            
            # Remove from active processes
            del self.active_processes[workflow_id]
            
            logger.info(f"Stopped process for workflow {workflow_id} (PID: {process.pid})")
            return True
            
        except Exception as e:
            logger.error(f"Error stopping process for workflow {workflow_id}: {e}")
            return False
    
    def cleanup_all_processes(self):
        """Clean up all active processes on application shutdown"""
        if not self.active_processes:
            return
        
        logger.info(f"Cleaning up {len(self.active_processes)} active processes...")
        
        for workflow_id in list(self.active_processes.keys()):
            try:
                self.stop_process(workflow_id)
            except Exception as e:
                logger.error(f"Error cleaning up process for workflow {workflow_id}: {e}")
        
        logger.info("Process cleanup completed")
    
    def get_process_info(self, workflow_id: int) -> Optional[ProcessInfo]:
        """Get process information for a workflow"""
        return self.active_processes.get(workflow_id)
    
    def is_process_running(self, workflow_id: int) -> bool:
        """Check if a process is still running"""
        if workflow_id not in self.active_processes:
            return False
        
        process_info = self.active_processes[workflow_id]
        process = process_info.process
        
        if not TEMPORAL_AVAILABLE:
            # Basic check without psutil
            return process.poll() is None
        
        try:
            return psutil.pid_exists(process.pid)
        except Exception:
            return False
    
    def get_active_workflow_ids(self) -> List[int]:
        """Get list of workflow IDs with active processes"""
        return list(self.active_processes.keys())
    
    def get_process_status(self, workflow_id: int) -> Dict[str, any]:
        """Get detailed process status for a workflow"""
        if workflow_id not in self.active_processes:
            return {"status": "not_found", "message": "No active process found"}
        
        process_info = self.active_processes[workflow_id]
        process = process_info.process
        
        try:
            if not TEMPORAL_AVAILABLE:
                is_running = process.poll() is None
                return {
                    "status": "running" if is_running else "stopped",
                    "pid": process.pid,
                    "run_id": process_info.run_id,
                    "temp_dir": process_info.temp_dir
                }
            
            if psutil.pid_exists(process.pid):
                ps_process = psutil.Process(process.pid)
                return {
                    "status": "running",
                    "pid": process.pid,
                    "run_id": process_info.run_id,
                    "temp_dir": process_info.temp_dir,
                    "cpu_percent": ps_process.cpu_percent(),
                    "memory_info": ps_process.memory_info()._asdict(),
                    "create_time": ps_process.create_time()
                }
            else:
                return {
                    "status": "stopped",
                    "pid": process.pid,
                    "run_id": process_info.run_id,
                    "temp_dir": process_info.temp_dir
                }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "pid": process.pid,
                "run_id": process_info.run_id
            }

# Global instance
process_manager = ProcessManager()