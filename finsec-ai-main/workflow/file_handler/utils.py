import os
import uuid
import logging
import magic
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime

from .config import (
    UPLOAD_DIR, ALLOWED_EXTENSIONS, MAX_FILE_SIZE, 
    SAFE_EXTENSIONS, EXECUTABLE_EXTENSIONS, MIME_TYPES
)
from .models import FileHandlerError, SecurityError

logger = logging.getLogger('file_handler_utils')

def generate_unique_filename(original_filename: str, upload_dir: Path) -> str:
    """Generate a unique filename to avoid conflicts"""
    file_extension = Path(original_filename).suffix
    base_name = Path(original_filename).stem
    
    # Generate unique filename using UUID
    unique_id = str(uuid.uuid4())[:8]
    unique_filename = f"{base_name}_{unique_id}{file_extension}"
    
    # Ensure uniqueness
    counter = 1
    while (upload_dir / unique_filename).exists():
        unique_filename = f"{base_name}_{unique_id}_{counter}{file_extension}"
        counter += 1
    
    return unique_filename

def validate_file_extension(filename: str) -> bool:
    """Validate file extension"""
    file_extension = Path(filename).suffix.lower()
    
    if file_extension not in ALLOWED_EXTENSIONS:
        raise FileHandlerError(
            f"File extension '{file_extension}' not allowed. "
            f"Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    
    return True

def validate_file_size(content: bytes, max_size: int = MAX_FILE_SIZE):
    """Validate file size"""
    if len(content) > max_size:
        size_mb = max_size / (1024 * 1024)
        actual_size_mb = len(content) / (1024 * 1024)
        raise FileHandlerError(
            f"File too large: {actual_size_mb:.1f}MB. Maximum allowed: {size_mb:.1f}MB"
        )

def validate_file_security(filename: str, content: bytes):
    """Perform security validation on file"""
    file_extension = Path(filename).suffix.lower()
    
    # Check for potentially dangerous files
    if file_extension in EXECUTABLE_EXTENSIONS:
        logger.warning(f"Uploading executable file: {filename}")
    
    # Additional security checks for specific file types
    if file_extension == '.py':
        # Basic Python file validation
        try:
            content.decode('utf-8')
        except UnicodeDecodeError:
            raise SecurityError("Python file contains non-UTF-8 content")
    
    # Check for suspicious content patterns
    content_str = content[:1024].decode('utf-8', errors='ignore').lower()
    
    suspicious_patterns = [
        'exec(', 'eval(', '__import__', 'subprocess',
        'os.system', 'shell=true', 'rm -rf', 'del /f'
    ]
    
    for pattern in suspicious_patterns:
        if pattern in content_str:
            logger.warning(f"Suspicious pattern '{pattern}' found in file: {filename}")

def get_mime_type(filename: str) -> str:
    """Get MIME type for file"""
    file_extension = Path(filename).suffix.lower()
    return MIME_TYPES.get(file_extension, 'application/octet-stream')

def save_uploaded_file(file_content: bytes, original_filename: str, 
                      component_id: int, param_name: str) -> Tuple[str, str]:
    """
    Save uploaded file to organized directory structure
    
    Returns:
        tuple: (absolute_file_path, unique_filename)
    """
    try:
        # Create organized directory structure
        upload_dir = UPLOAD_DIR / f"component_{component_id}" / param_name
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        unique_filename = generate_unique_filename(original_filename, upload_dir)
        file_path = upload_dir / unique_filename
        
        # Write file content
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        logger.info(f"Saved file: {file_path}")
        
        return str(file_path.absolute()), unique_filename
        
    except Exception as e:
        logger.error(f"Error saving file {original_filename}: {str(e)}")
        raise FileHandlerError(f"Failed to save file: {str(e)}")

def delete_file_safely(file_path: str) -> bool:
    """Delete file with safety checks"""
    try:
        # Security check: ensure file is within allowed directories
        abs_file_path = os.path.abspath(file_path)
        abs_upload_dir = os.path.abspath(UPLOAD_DIR)
        
        if not abs_file_path.startswith(abs_upload_dir):
            raise SecurityError("Access denied: File outside allowed directory")
        
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Deleted file: {file_path}")
            return True
        else:
            logger.warning(f"File not found for deletion: {file_path}")
            return False
            
    except Exception as e:
        logger.error(f"Error deleting file {file_path}: {str(e)}")
        raise FileHandlerError(f"Failed to delete file: {str(e)}")

def validate_file_access(file_path: str):
    """Validate that file access is allowed"""
    # Security check: ensure file is within allowed directories
    abs_file_path = os.path.abspath(file_path)
    abs_upload_dir = os.path.abspath(UPLOAD_DIR)
    
    if not abs_file_path.startswith(abs_upload_dir):
        raise SecurityError("Access denied: File outside allowed directory")
    
    if not os.path.exists(file_path):
        raise FileHandlerError("File not found")

def get_file_stats(file_path: str) -> dict:
    """Get detailed file statistics"""
    try:
        validate_file_access(file_path)
        
        file_path_obj = Path(file_path)
        stat = file_path_obj.stat()
        
        return {
            "size": stat.st_size,
            "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "accessed": datetime.fromtimestamp(stat.st_atime).isoformat(),
            "is_file": file_path_obj.is_file(),
            "is_dir": file_path_obj.is_dir(),
            "extension": file_path_obj.suffix,
            "name": file_path_obj.name,
            "stem": file_path_obj.stem
        }
        
    except Exception as e:
        logger.error(f"Error getting file stats for {file_path}: {str(e)}")
        raise FileHandlerError(f"Failed to get file stats: {str(e)}")

def extract_component_info_from_path(file_path: str) -> Tuple[Optional[int], Optional[str]]:
    """Extract component ID and parameter name from file path"""
    try:
        file_path_obj = Path(file_path)
        relative_path = file_path_obj.relative_to(UPLOAD_DIR)
        path_parts = relative_path.parts
        
        component_id = None
        param_name = None
        
        if len(path_parts) >= 2 and path_parts[0].startswith('component_'):
            try:
                component_id = int(path_parts[0].replace('component_', ''))
            except ValueError:
                pass
            
            if len(path_parts) >= 3:
                param_name = path_parts[1]
        
        return component_id, param_name
        
    except (ValueError, IndexError) as e:
        logger.warning(f"Could not extract component info from path {file_path}: {e}")
        return None, None

def clean_old_files(days_old: int = 30):
    """Clean up old uploaded files"""
    try:
        import time
        cutoff_time = time.time() - (days_old * 24 * 60 * 60)
        deleted_count = 0
        
        for file_path in UPLOAD_DIR.rglob("*"):
            if file_path.is_file():
                try:
                    if file_path.stat().st_mtime < cutoff_time:
                        file_path.unlink()
                        deleted_count += 1
                        logger.info(f"Cleaned up old file: {file_path}")
                except Exception as e:
                    logger.error(f"Error cleaning up file {file_path}: {e}")
        
        logger.info(f"Cleanup completed: {deleted_count} files deleted")
        return deleted_count
        
    except Exception as e:
        logger.error(f"Error during file cleanup: {e}")
        raise FileHandlerError(f"File cleanup failed: {str(e)}")

def get_directory_size(path: Path) -> int:
    """Get total size of directory"""
    total_size = 0
    try:
        for file_path in path.rglob("*"):
            if file_path.is_file():
                total_size += file_path.stat().st_size
    except Exception as e:
        logger.error(f"Error calculating directory size: {e}")
    
    return total_size