import subprocess
import threading
import logging
from typing import Callable, Optional

from ..logging.manager import log_manager
from ..logging import parse_log_level_from_message
from ..models import WorkflowStatus

logger = logging.getLogger('temporal_process_monitor')

class ProcessMonitor:
    """Monitors subprocess execution and handles logging"""
    
    def __init__(self, workflow_id: int, process: subprocess.Popen, run_id: str, 
                 timeout_minutes: int, on_complete: Optional[Callable] = None):
        """
        Initialize process monitor
        
        Args:
            workflow_id: The workflow ID
            process: The subprocess to monitor
            run_id: Unique run identifier
            timeout_minutes: Timeout in minutes
            on_complete: Callback function when process completes
        """
        self.workflow_id = workflow_id
        self.process = process
        self.run_id = run_id
        self.timeout_minutes = timeout_minutes
        self.on_complete = on_complete
        self.monitoring_thread = None
    
    def start_monitoring(self) -> threading.Thread:
        """Start monitoring the process in a separate thread"""
        self.monitoring_thread = threading.Thread(
            target=self._monitor_process, 
            daemon=True
        )
        self.monitoring_thread.start()
        return self.monitoring_thread
    
    def _monitor_process(self):
        """Monitor process execution and handle output"""
        try:
            log_manager.add_log(self.workflow_id, {
                "level": "debug",
                "message": f"Starting process monitor for PID {self.process.pid}",
                "component": "temporal_monitor",
                "run_id": self.run_id
            })
            
            # Use communicate with timeout instead of readline loop
            try:
                stdout, stderr = self.process.communicate(timeout=self.timeout_minutes * 60)
                exit_code = self.process.returncode
                status = WorkflowStatus.COMPLETED if exit_code == 0 else WorkflowStatus.FAILED
                
            except subprocess.TimeoutExpired:
                logger.error(f"Workflow {self.workflow_id} timed out after {self.timeout_minutes} minutes")
                
                log_manager.add_log(self.workflow_id, {
                    "level": "error",
                    "message": f"Workflow execution timed out after {self.timeout_minutes} minutes",
                    "component": "temporal_monitor",
                    "run_id": self.run_id
                })
                
                # Kill the process and get remaining output
                self.process.kill()
                try:
                    stdout, stderr = self.process.communicate(timeout=10)
                except subprocess.TimeoutExpired:
                    stdout, stderr = "", "Process killed due to timeout"
                
                exit_code = -1
                status = WorkflowStatus.TIMEOUT
            
            # Process stdout output
            if stdout:
                log_manager.add_log(self.workflow_id, {
                    "level": "debug",
                    "message": f"Processing stdout output ({len(stdout)} characters)",
                    "component": "temporal_monitor",
                    "run_id": self.run_id
                })
                
                self._process_output_lines(stdout, 'stdout')
            
            # Process stderr output
            if stderr:
                log_manager.add_log(self.workflow_id, {
                    "level": "debug",
                    "message": f"Processing stderr output ({len(stderr)} characters)",
                    "component": "temporal_monitor",
                    "run_id": self.run_id
                })
                
                self._process_output_lines(stderr, 'stderr')
            
            # Log completion
            log_manager.add_log(self.workflow_id, {
                "level": "info" if exit_code == 0 else "error",
                "message": f"Temporal workflow process completed with exit code: {exit_code}",
                "component": "temporal_monitor",
                "run_id": self.run_id
            })
            
            # Call completion callback if provided
            if self.on_complete:
                self.on_complete(self.workflow_id, self.run_id, status, exit_code)
                
        except Exception as e:
            logger.error(f"Error in process monitor: {e}")
            log_manager.add_log(self.workflow_id, {
                "level": "error",
                "message": f"Error monitoring process: {str(e)}",
                "component": "temporal_monitor",
                "run_id": self.run_id
            })
            
            # Call completion callback with failure status
            if self.on_complete:
                self.on_complete(self.workflow_id, self.run_id, WorkflowStatus.FAILED, -1)
    
    def _process_output_lines(self, output: str, stream_type: str):
        """Process output lines and add them as log entries"""
        for line in output.split('\n'):
            line_clean = line.strip()
            if line_clean:
                detected_level = parse_log_level_from_message(line_clean, stream_type)
                log_manager.add_log(self.workflow_id, {
                    "level": detected_level,
                    "message": line_clean,
                    "component": "temporal_process",
                    "stream": stream_type,
                    "run_id": self.run_id
                })
    
    def stop_monitoring(self):
        """Stop the monitoring thread"""
        if self.monitoring_thread and self.monitoring_thread.is_alive():
            # Note: We can't actually stop a thread in Python, but we can
            # kill the process which will cause the thread to complete
            try:
                if self.process.poll() is None:
                    self.process.terminate()
            except Exception as e:
                logger.error(f"Error stopping process: {e}")
    
    def is_monitoring(self) -> bool:
        """Check if monitoring is still active"""
        return (self.monitoring_thread is not None and 
                self.monitoring_thread.is_alive())