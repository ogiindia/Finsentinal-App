from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import subprocess

@dataclass
class ExecutionInfo:
    """Data model for workflow execution information"""
    run_id: str
    executed_at: str
    status: str
    parameters: Dict[str, Any]
    process_pid: Optional[int] = None
    temp_dir: Optional[str] = None
    runner_script_path: Optional[str] = None
    execution_type: str = "temporal"
    log_file: Optional[str] = None
    log_file_path: Optional[str] = None
    timeout_minutes: int = 30
    exit_code: Optional[int] = None
    completed_at: Optional[str] = None
    stopped_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'run_id': self.run_id,
            'executed_at': self.executed_at,
            'status': self.status,
            'parameters': self.parameters,
            'process_pid': self.process_pid,
            'temp_dir': self.temp_dir,
            'runner_script_path': self.runner_script_path,
            'execution_type': self.execution_type,
            'log_file': self.log_file,
            'log_file_path': self.log_file_path,
            'timeout_minutes': self.timeout_minutes,
            'exit_code': self.exit_code,
            'completed_at': self.completed_at,
            'stopped_at': self.stopped_at
        }

@dataclass
class LogEntry:
    """Data model for log entries"""
    timestamp: str
    level: str
    message: str
    component: str
    stream: Optional[str] = None
    run_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'timestamp': self.timestamp,
            'level': self.level,
            'message': self.message,
            'component': self.component,
            'stream': self.stream,
            'run_id': self.run_id
        }

@dataclass
class ProcessInfo:
    """Data model for process information"""
    process: subprocess.Popen
    run_id: str
    temp_dir: str

class WorkflowStatus:
    """Constants for workflow execution status"""
    NOT_STARTED = "NOT_STARTED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    STOPPED = "STOPPED"
    TIMEOUT = "TIMEOUT"

class LogLevel:
    """Constants for log levels"""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"
    DEBUG = "debug"
    SUCCESS = "success"