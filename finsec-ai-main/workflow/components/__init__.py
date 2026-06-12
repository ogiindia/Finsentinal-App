"""
Components module for managing workflow components

This module provides a complete restructured solution for managing components
with proper separation of concerns, file handling, and API endpoints.
"""

from .routes import router
from .service import component_service
from .models import ComponentError, FileUploadError
from .config import COMPONENTS_DIR

__version__ = "1.0.0"

__all__ = [
    'router',
    'component_service', 
    'ComponentError',
    'FileUploadError',
    'COMPONENTS_DIR'
]