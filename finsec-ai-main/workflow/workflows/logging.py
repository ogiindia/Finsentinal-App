import logging
from typing import Dict, List
from datetime import datetime
from .models import WorkflowLogEntry

class MemoryLogHandler(logging.Handler):
    """Custom log handler to capture logs in memory for workflows"""
    
    def __init__(self):
        super().__init__()
        self.logs = []
        self.formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    def emit(self, record):
        """Emit a log record"""
        log_entry = WorkflowLogEntry(
            timestamp=datetime.fromtimestamp(record.created).isoformat(),
            level=record.levelname.lower(),
            logger=record.name,
            message=self.formatter.format(record)
        )
        self.logs.append(log_entry)
    
    def get_logs(self) -> List[WorkflowLogEntry]:
        """Get all stored logs"""
        return self.logs
    
    def clear(self):
        """Clear all stored logs"""
        self.logs = []

class WorkflowLogManager:
    """Manages logging for individual workflows"""
    
    def __init__(self):
        self.workflow_log_handlers: Dict[int, MemoryLogHandler] = {}
    
    def get_workflow_logger(self, workflow_id: int) -> tuple:
        """
        Get or create a logger and handler for a workflow
        
        Args:
            workflow_id: The workflow ID
            
        Returns:
            tuple: (logger, handler)
        """
        if workflow_id not in self.workflow_log_handlers:
            # Create a new log handler for this workflow
            handler = MemoryLogHandler()
            handler.setLevel(logging.INFO)
            
            # Create a logger for this workflow
            workflow_logger = logging.getLogger(f"workflow_{workflow_id}")
            workflow_logger.setLevel(logging.INFO)
            
            # Remove any existing handlers
            for hdlr in workflow_logger.handlers:
                workflow_logger.removeHandler(hdlr)
            
            # Add our custom handler
            workflow_logger.addHandler(handler)
            
            # Store the handler
            self.workflow_log_handlers[workflow_id] = handler
        
        logger = logging.getLogger(f"workflow_{workflow_id}")
        handler = self.workflow_log_handlers[workflow_id]
        
        return logger, handler
    
    def get_workflow_logs(self, workflow_id: int) -> List[WorkflowLogEntry]:
        """Get logs for a specific workflow"""
        if workflow_id in self.workflow_log_handlers:
            handler = self.workflow_log_handlers[workflow_id]
            return handler.get_logs()
        return []
    
    def clear_workflow_logs(self, workflow_id: int):
        """Clear logs for a specific workflow"""
        if workflow_id in self.workflow_log_handlers:
            handler = self.workflow_log_handlers[workflow_id]
            handler.clear()
    
    def remove_workflow_logger(self, workflow_id: int):
        """Remove logger and handler for a workflow"""
        if workflow_id in self.workflow_log_handlers:
            # Remove handler from logger
            logger = logging.getLogger(f"workflow_{workflow_id}")
            handler = self.workflow_log_handlers[workflow_id]
            logger.removeHandler(handler)
            
            # Remove from our tracking
            del self.workflow_log_handlers[workflow_id]
    
    def get_active_workflows(self) -> List[int]:
        """Get list of workflow IDs that have active loggers"""
        return list(self.workflow_log_handlers.keys())

# Global instance
workflow_log_manager = WorkflowLogManager()