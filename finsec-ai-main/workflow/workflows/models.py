from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class WorkflowRequest:
    """Data model for workflow creation requests"""
    name: str
    description: Optional[str]
    configuration: Dict[str, Any]

@dataclass
class WorkflowResponse:
    """Data model for workflow API responses"""
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    node_count: int
    edge_count: int
    configuration: Optional[Dict[str, Any]] = None

@dataclass
class WorkflowLogEntry:
    """Data model for workflow log entries"""
    timestamp: str
    level: str
    logger: str
    message: str

@dataclass
class WorkflowLogsResponse:
    """Data model for workflow logs response"""
    workflow_id: int
    name: str
    status: str
    logs: List[WorkflowLogEntry]

@dataclass
class ValidationResult:
    """Data model for workflow validation results"""
    valid: bool
    message: str
    errors: List[str] = None
    warnings: List[str] = None

class WorkflowError(Exception):
    """Custom exception for workflow-related errors"""
    pass

class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass