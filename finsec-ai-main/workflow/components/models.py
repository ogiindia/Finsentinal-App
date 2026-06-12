from typing import Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ComponentRequest:
    """Data model for component creation/update requests"""
    name: str
    section: str
    parameters: Dict[str, Any]
    description: Optional[str] = None
    icon_class: Optional[str] = None

@dataclass
class ComponentResponse:
    """Data model for component API responses"""
    id: int
    name: str
    section_id: int
    section_name: str
    parameters: Dict[str, Any]
    description: Optional[str]
    icon_class: str
    file_path: str
    python_file_exists: bool
    icon_base64: Optional[str]
    has_icon: bool
    created_at: datetime
    updated_at: datetime

@dataclass
class SectionResponse:
    """Data model for section API responses"""
    id: int
    name: str
    components: list
    created_at: datetime

@dataclass
class FileUploadResult:
    """Data model for file upload results"""
    success: bool
    file_path: str
    original_filename: str
    unique_filename: str
    file_size: int
    message: str

class ComponentError(Exception):
    """Custom exception for component-related errors"""
    pass

class FileUploadError(Exception):
    """Custom exception for file upload errors"""
    pass