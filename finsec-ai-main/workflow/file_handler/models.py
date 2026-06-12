from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

@dataclass
class FileUploadRequest:
    """Data model for file upload requests"""
    component_id: int
    param_name: str
    file_content: bytes
    filename: str

@dataclass
class FileUploadResponse:
    """Data model for file upload responses"""
    success: bool
    message: str
    file_path: str
    file_name: str
    file_size: int
    component_id: int
    param_name: str
    unique_filename: Optional[str] = None

@dataclass
class FileInfo:
    """Data model for file information"""
    file_name: str
    file_path: str
    file_size: int
    uploaded_at: str
    modified_at: str
    component_id: Optional[int]
    param_name: Optional[str]
    file_extension: str
    exists: bool
    mime_type: Optional[str] = None

@dataclass
class ComponentFilesResponse:
    """Data model for component files listing"""
    component_id: int
    param_name: Optional[str]
    files: List[FileInfo]

@dataclass
class ExecutionRequest:
    """Data model for component execution requests"""
    component_id: int
    parameters: Dict[str, Any]

@dataclass
class ExecutionResponse:
    """Data model for component execution responses"""
    success: bool
    message: str
    result: Optional[Any]
    component_id: int
    error: Optional[str] = None

class FileHandlerError(Exception):
    """Custom exception for file handler errors"""
    pass

class ComponentExecutionError(Exception):
    """Custom exception for component execution errors"""
    pass

class SecurityError(Exception):
    """Custom exception for security-related errors"""
    pass