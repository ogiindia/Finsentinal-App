import os
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import WebSocket

from ..config import IST, LOGS_DIR
from ..models import LogEntry

logger = logging.getLogger('temporal_log_manager')

class WorkflowLogManager:
    """Manages real-time logging for workflows with unique log files"""
    
    def __init__(self):
        self.workflow_logs: Dict[int, List[Dict]] = {}
        self.workflow_websockets: Dict[int, List[WebSocket]] = {}
        self.workflow_log_files: Dict[int, str] = {}
        
        # Ensure logs directory exists
        os.makedirs(LOGS_DIR, exist_ok=True)
    
    def create_unique_log_file(self, workflow_id: int) -> str:
        """Create a unique log file for the workflow with IST timestamp"""
        # Get current datetime in IST with milliseconds
        now_ist = datetime.now(IST)
        timestamp_str = now_ist.strftime("%Y%m%d_%H%M%S_%f")[:-3]  # Remove last 3 digits to get milliseconds
        
        # Create unique log filename
        log_filename = f"workflow_{workflow_id}_{timestamp_str}.log"
        log_file_path = os.path.join(LOGS_DIR, log_filename)
        
        # Store the log file path for this workflow
        self.workflow_log_files[workflow_id] = log_file_path
        
        # Create initial log entry
        initial_log = {
            "timestamp": now_ist.isoformat(),
            "level": "info",
            "message": f"Created unique log file for workflow {workflow_id}",
            "component": "temporal_log_manager",
            "log_file": log_filename
        }
        
        # Write initial log entry to file
        try:
            with open(log_file_path, 'w', encoding='utf-8') as f:
                f.write(json.dumps(initial_log) + '\n')
        except Exception as e:
            logger.error(f"Error creating log file {log_file_path}: {e}")
        
        logger.info(f"Created unique log file for workflow {workflow_id}: {log_filename}")
        return log_file_path
    
    def get_log_file_path(self, workflow_id: int) -> str:
        """Get the log file path for a workflow, create if doesn't exist"""
        if workflow_id not in self.workflow_log_files:
            return self.create_unique_log_file(workflow_id)
        return self.workflow_log_files[workflow_id]
    
    def add_log(self, workflow_id: int, log_entry: Dict):
        """Add a log entry for a workflow and save to its unique file"""
        if workflow_id not in self.workflow_logs:
            self.workflow_logs[workflow_id] = []
        
        # Add IST timestamp if not present
        if 'timestamp' not in log_entry:
            log_entry['timestamp'] = datetime.now(IST).isoformat()
        
        if 'level' in log_entry:
            log_entry['level'] = log_entry['level'].lower()
        
        # Add to in-memory storage
        self.workflow_logs[workflow_id].append(log_entry)
        
        # Get the unique log file for this workflow
        log_file_path = self.get_log_file_path(workflow_id)
        
        # Save to the workflow-specific log file
        try:
            with open(log_file_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception as e:
            logger.error(f"Error writing to log file {log_file_path}: {e}")
        
        # Send to WebSocket clients
        self._send_to_websockets(workflow_id, log_entry)
    
    def _send_to_websockets(self, workflow_id: int, log_entry: Dict):
        """Send log entry to all connected WebSocket clients"""
        if workflow_id in self.workflow_websockets:
            disconnected_clients = []
            for websocket in self.workflow_websockets[workflow_id]:
                try:
                    asyncio.create_task(websocket.send_text(json.dumps(log_entry)))
                except Exception as e:
                    logger.error(f"Error sending log to WebSocket: {e}")
                    disconnected_clients.append(websocket)
            
            # Remove disconnected clients
            for client in disconnected_clients:
                self.workflow_websockets[workflow_id].remove(client)
    
    def get_logs(self, workflow_id: int) -> List[Dict]:
        """Get all logs for a workflow"""
        return self.workflow_logs.get(workflow_id, [])
    
    def clear_logs(self, workflow_id: int):
        """Clear logs for a workflow and create new unique log file"""
        if workflow_id in self.workflow_logs:
            self.workflow_logs[workflow_id] = []
        
        # Create new unique log file for the cleared workflow
        self.create_unique_log_file(workflow_id)
    
    def get_log_file_info(self, workflow_id: int) -> Dict[str, Any]:
        """Get log file information for a workflow"""
        log_file_path = self.workflow_log_files.get(workflow_id)
        if not log_file_path:
            return {"log_file": None, "exists": False, "size": 0}
        
        try:
            file_exists = os.path.exists(log_file_path)
            file_size = os.path.getsize(log_file_path) if file_exists else 0
            return {
                "log_file": os.path.basename(log_file_path),
                "log_file_path": log_file_path,
                "exists": file_exists,
                "size": file_size
            }
        except Exception as e:
            logger.error(f"Error getting log file info: {e}")
            return {"log_file": None, "exists": False, "size": 0, "error": str(e)}
    
    def add_websocket(self, workflow_id: int, websocket: WebSocket):
        """Add a WebSocket connection for a workflow"""
        if workflow_id not in self.workflow_websockets:
            self.workflow_websockets[workflow_id] = []
        self.workflow_websockets[workflow_id].append(websocket)
    
    def remove_websocket(self, workflow_id: int, websocket: WebSocket):
        """Remove a WebSocket connection for a workflow"""
        if workflow_id in self.workflow_websockets and websocket in self.workflow_websockets[workflow_id]:
            self.workflow_websockets[workflow_id].remove(websocket)
    
    def get_total_logs_count(self, workflow_id: int) -> int:
        """Get total number of logs for a workflow"""
        return len(self.workflow_logs.get(workflow_id, []))
    
    def read_log_file(self, workflow_id: int) -> Optional[str]:
        """Read the entire log file content for a workflow"""
        log_file_path = self.workflow_log_files.get(workflow_id)
        if not log_file_path or not os.path.exists(log_file_path):
            return None
        
        try:
            with open(log_file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error reading log file {log_file_path}: {e}")
            return None

# Global instance
log_manager = WorkflowLogManager()