"""
File Handler module for managing file uploads and component execution

This module provides a complete restructured solution for managing file uploads,
downloads, validation, and component execution with proper security and organization.
"""

from .routes import router
from .service import file_handler_service
from .models import FileHandlerError, ComponentExecutionError, SecurityError
from .config import UPLOAD_DIR, ALLOWED_EXTENSIONS

__version__ = "1.0.0"

__all__ = [
    'router',
    'file_handler_service',
    'FileHandlerError',
    'ComponentExecutionError', 
    'SecurityError',
    'UPLOAD_DIR',
    'ALLOWED_EXTENSIONS'
]