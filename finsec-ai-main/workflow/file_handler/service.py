import os
import sys
import importlib.util
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app import Component
from .config import UPLOAD_DIR, MAX_CSV_SIZE, MAX_JAR_SIZE
from .models import (
    FileUploadResponse, FileInfo, ComponentFilesResponse, 
    ExecutionResponse, FileHandlerError, ComponentExecutionError
)
from .utils import (
    validate_file_extension, validate_file_size, validate_file_security,
    save_uploaded_file, delete_file_safely, validate_file_access,
    get_file_stats, extract_component_info_from_path, get_mime_type
)

logger = logging.getLogger('file_handler_service')

class FileHandlerService:
    """Service class for file handling operations"""
    
    def __init__(self):
        pass
    
    async def upload_file(
        self,
        file_content: bytes,
        filename: str,
        component_id: int,
        param_name: str,
        db: Session
    ) -> FileUploadResponse:
        """Upload a file for a component parameter"""
        try:
            # Verify component exists
            component = db.query(Component).filter(Component.id == component_id).first()
            if not component:
                raise FileHandlerError(f"Component with ID {component_id} not found")
            
            # Validate file
            validate_file_extension(filename)
            
            # Apply specific size limits based on file type
            file_ext = Path(filename).suffix.lower()
            if file_ext == '.csv':
                validate_file_size(file_content, MAX_CSV_SIZE)
            elif file_ext == '.jar':
                validate_file_size(file_content, MAX_JAR_SIZE)
            else:
                validate_file_size(file_content)
            
            # Security validation
            validate_file_security(filename, file_content)
            
            # Save the file
            file_path, unique_filename = save_uploaded_file(
                file_content, filename, component_id, param_name
            )
            
            logger.info(f"File uploaded successfully: {file_path}")
            
            return FileUploadResponse(
                success=True,
                message="File uploaded successfully",
                file_path=file_path,
                file_name=filename,
                file_size=len(file_content),
                component_id=component_id,
                param_name=param_name,
                unique_filename=unique_filename
            )
            
        except FileHandlerError:
            raise
        except Exception as e:
            logger.error(f"Error uploading file: {str(e)}")
            raise FileHandlerError(f"Failed to upload file: {str(e)}")
    
    def download_file(self, file_path: str) -> str:
        """Validate and prepare file for download"""
        try:
            validate_file_access(file_path)
            return file_path
            
        except Exception as e:
            logger.error(f"Error accessing file for download: {str(e)}")
            raise FileHandlerError(f"Cannot download file: {str(e)}")
    
    def delete_file(self, file_path: str) -> bool:
        """Delete a file with validation"""
        try:
            validate_file_access(file_path)
            return delete_file_safely(file_path)
            
        except Exception as e:
            logger.error(f"Error deleting file: {str(e)}")
            raise FileHandlerError(f"Cannot delete file: {str(e)}")
    
    def list_component_files(
        self,
        component_id: int,
        param_name: Optional[str],
        db: Session
    ) -> ComponentFilesResponse:
        """List all files uploaded for a component or specific parameter"""
        try:
            # Verify component exists
            component = db.query(Component).filter(Component.id == component_id).first()
            if not component:
                raise FileHandlerError(f"Component with ID {component_id} not found")
            
            # Determine directory to scan
            if param_name:
                scan_dir = UPLOAD_DIR / f"component_{component_id}" / param_name
            else:
                scan_dir = UPLOAD_DIR / f"component_{component_id}"
            
            files = []
            
            # Check if directory exists
            if scan_dir.exists():
                for file_path in scan_dir.rglob("*"):
                    if file_path.is_file():
                        try:
                            # Get file stats
                            stats = get_file_stats(str(file_path))
                            
                            # Determine parameter name from path
                            _, param_from_path = extract_component_info_from_path(str(file_path))
                            
                            file_info = FileInfo(
                                file_name=file_path.name,
                                file_path=str(file_path.absolute()),
                                file_size=stats["size"],
                                uploaded_at=stats["created"],
                                modified_at=stats["modified"],
                                component_id=component_id,
                                param_name=param_from_path,
                                file_extension=stats["extension"],
                                exists=True,
                                mime_type=get_mime_type(file_path.name)
                            )
                            
                            files.append(file_info)
                            
                        except Exception as e:
                            logger.error(f"Error processing file {file_path}: {e}")
                            continue
            
            # Sort by upload time (newest first)
            files.sort(key=lambda x: x.uploaded_at, reverse=True)
            
            return ComponentFilesResponse(
                component_id=component_id,
                param_name=param_name,
                files=files
            )
            
        except FileHandlerError:
            raise
        except Exception as e:
            logger.error(f"Error listing component files: {str(e)}")
            raise FileHandlerError(f"Failed to list files: {str(e)}")
    
    def get_file_info(self, file_path: str) -> FileInfo:
        """Get detailed information about a file"""
        try:
            validate_file_access(file_path)
            
            file_path_obj = Path(file_path)
            stats = get_file_stats(file_path)
            
            # Extract component and parameter info from path
            component_id, param_name = extract_component_info_from_path(file_path)
            
            return FileInfo(
                file_name=file_path_obj.name,
                file_path=file_path,
                file_size=stats["size"],
                uploaded_at=stats["created"],
                modified_at=stats["modified"],
                component_id=component_id,
                param_name=param_name,
                file_extension=file_path_obj.suffix,
                exists=True,
                mime_type=get_mime_type(file_path_obj.name)
            )
            
        except Exception as e:
            logger.error(f"Error getting file info: {str(e)}")
            raise FileHandlerError(f"Failed to get file info: {str(e)}")
    
    def execute_component(
        self,
        component_id: int,
        parameters: Dict[str, Any],
        db: Session
    ) -> ExecutionResponse:
        """Execute a component with given parameters"""
        try:
            # Get component from database
            component = db.query(Component).filter(Component.id == component_id).first()
            
            if not component:
                raise ComponentExecutionError(f"Component with ID {component_id} not found")
            
            if not component.file_path or not os.path.exists(component.file_path):
                raise ComponentExecutionError(f"Component Python file not found: {component.file_path}")
            
            # Load the component module
            spec = importlib.util.spec_from_file_location("component_module", component.file_path)
            if not spec or not spec.loader:
                raise ComponentExecutionError(f"Cannot load component module from {component.file_path}")
            
            module = importlib.util.module_from_spec(spec)
            
            # Execute the module in a controlled environment
            try:
                spec.loader.exec_module(module)
            except Exception as e:
                raise ComponentExecutionError(f"Error loading component module: {str(e)}")
            
            # Execute the component's main function
            result = None
            if hasattr(module, 'execute'):
                result = module.execute(parameters)
            elif hasattr(module, 'main'):
                result = module.main(parameters)
            else:
                raise ComponentExecutionError("Component must have an 'execute' or 'main' function")
            
            return ExecutionResponse(
                success=True,
                message="Component executed successfully",
                result=result,
                component_id=component_id
            )
            
        except ComponentExecutionError:
            raise
        except Exception as e:
            logger.error(f"Error executing component {component_id}: {str(e)}")
            return ExecutionResponse(
                success=False,
                message="Component execution failed",
                result=None,
                component_id=component_id,
                error=str(e)
            )
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        try:
            from .utils import get_directory_size
            
            total_size = get_directory_size(UPLOAD_DIR)
            file_count = sum(1 for _ in UPLOAD_DIR.rglob("*") if _.is_file())
            
            # Get component breakdown
            component_stats = {}
            for component_dir in UPLOAD_DIR.glob("component_*"):
                if component_dir.is_dir():
                    component_id = component_dir.name.replace("component_", "")
                    component_size = get_directory_size(component_dir)
                    component_files = sum(1 for _ in component_dir.rglob("*") if _.is_file())
                    
                    component_stats[component_id] = {
                        "size": component_size,
                        "file_count": component_files,
                        "size_mb": round(component_size / (1024 * 1024), 2)
                    }
            
            return {
                "total_size": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "file_count": file_count,
                "upload_dir": str(UPLOAD_DIR.absolute()),
                "components": component_stats
            }
            
        except Exception as e:
            logger.error(f"Error getting storage stats: {str(e)}")
            raise FileHandlerError(f"Failed to get storage statistics: {str(e)}")
    
    def cleanup_component_files(self, component_id: int, db: Session) -> Dict[str, Any]:
        """Clean up all files for a component"""
        try:
            # Verify component exists (or existed)
            component_dir = UPLOAD_DIR / f"component_{component_id}"
            
            if not component_dir.exists():
                return {
                    "success": True,
                    "message": f"No files found for component {component_id}",
                    "deleted_files": 0,
                    "freed_space": 0
                }
            
            # Count files and calculate space before deletion
            files_to_delete = list(component_dir.rglob("*"))
            file_count = sum(1 for f in files_to_delete if f.is_file())
            total_size = sum(f.stat().st_size for f in files_to_delete if f.is_file())
            
            # Delete the entire component directory
            import shutil
            shutil.rmtree(component_dir)
            
            logger.info(f"Cleaned up {file_count} files for component {component_id}, freed {total_size} bytes")
            
            return {
                "success": True,
                "message": f"Cleaned up all files for component {component_id}",
                "deleted_files": file_count,
                "freed_space": total_size,
                "freed_space_mb": round(total_size / (1024 * 1024), 2)
            }
            
        except Exception as e:
            logger.error(f"Error cleaning up component files: {str(e)}")
            raise FileHandlerError(f"Failed to cleanup component files: {str(e)}")

# Global instance
file_handler_service = FileHandlerService()