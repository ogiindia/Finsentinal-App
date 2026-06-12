import os
import uuid
import base64
import logging
from pathlib import Path
from typing import Optional

from .config import COMPONENTS_DIR, ALLOWED_PYTHON_EXTENSIONS, ALLOWED_ICON_EXTENSIONS
from .models import FileUploadResult, FileUploadError

logger = logging.getLogger('components_utils')

def generate_unique_filename(original_filename: str, base_dir: Path) -> str:
    """Generate a unique filename to avoid conflicts"""
    # Extract file extension
    file_ext = Path(original_filename).suffix
    base_name = Path(original_filename).stem
    
    # Generate unique filename using UUID
    unique_id = str(uuid.uuid4())[:8]
    unique_filename = f"{base_name}_{unique_id}{file_ext}"
    
    # Ensure uniqueness
    counter = 1
    while (base_dir / unique_filename).exists():
        unique_filename = f"{base_name}_{unique_id}_{counter}{file_ext}"
        counter += 1
    
    return unique_filename

def validate_python_file(filename: str, content: bytes) -> bool:
    """Validate Python file (legacy - for uploads)"""
    file_ext = Path(filename).suffix.lower()
    
    if file_ext not in ALLOWED_PYTHON_EXTENSIONS:
        raise FileUploadError(f"Invalid file extension. Allowed: {ALLOWED_PYTHON_EXTENSIONS}")
    
    # Basic content validation - check if it's text
    try:
        content.decode('utf-8')
    except UnicodeDecodeError:
        raise FileUploadError("File must be valid Python text")
    
    return True

def validate_python_file_path(file_path: str) -> bool:
    """NEW: Validate Python file path exists and is accessible"""
    if not file_path:
        raise FileUploadError("File path cannot be empty")
    
    # Convert to Path object for easier handling
    path_obj = Path(file_path)
    
    # Check if path is absolute or relative
    if not path_obj.is_absolute():
        # For relative paths, you might want to resolve them relative to a base directory
        # For now, we'll accept them as-is but log a warning
        logger.warning(f"Using relative path: {file_path}")
    
    # Check if file exists
    if not path_obj.exists():
        raise FileUploadError(f"File does not exist at path: {file_path}")
    
    # Check if it's actually a file (not a directory)
    if not path_obj.is_file():
        raise FileUploadError(f"Path exists but is not a file: {file_path}")
    
    # Check file extension
    if path_obj.suffix.lower() not in ALLOWED_PYTHON_EXTENSIONS:
        raise FileUploadError(f"File must have a Python extension (.py). Found: {path_obj.suffix}")
    
    # Check if file is readable
    try:
        with open(path_obj, 'r', encoding='utf-8') as f:
            # Try to read the first 100 characters to ensure it's readable
            f.read(100)
    except PermissionError:
        raise FileUploadError(f"Permission denied reading file: {file_path}")
    except UnicodeDecodeError:
        raise FileUploadError(f"File is not valid UTF-8 text: {file_path}")
    except Exception as e:
        raise FileUploadError(f"Error reading file {file_path}: {str(e)}")
    
    logger.info(f"Validated Python file path: {file_path}")
    return True

def validate_icon_file(filename: str, content: bytes) -> bool:
    """Validate icon file"""
    file_ext = Path(filename).suffix.lower()
    
    if file_ext not in ALLOWED_ICON_EXTENSIONS:
        raise FileUploadError(f"Invalid icon extension. Allowed: {ALLOWED_ICON_EXTENSIONS}")
    
    return True

def save_uploaded_file(file_content: bytes, filename: str, directory) -> FileUploadResult:
    """Save uploaded file to directory and return result (legacy - for icons)"""
    try:
        # Ensure directory is a Path object
        if isinstance(directory, str):
            directory = Path(directory)
        elif not isinstance(directory, Path):
            directory = Path(str(directory))
        
        # Ensure directory exists
        directory.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        unique_filename = generate_unique_filename(filename, directory)
        file_path = directory / unique_filename
        
        # Write file content
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        logger.info(f"Saved file: {file_path}")
        
        return FileUploadResult(
            success=True,
            file_path=str(file_path.absolute()),
            original_filename=filename,
            unique_filename=unique_filename,
            file_size=len(file_content),
            message="File saved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error saving file {filename}: {str(e)}")
        raise FileUploadError(f"Failed to save file: {str(e)}")

def delete_file_if_exists(file_path: str):
    """Delete file if it exists (legacy - not used for path-based components)"""
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
            logger.info(f"Deleted file: {file_path}")
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {str(e)}")

def convert_icon_to_base64(icon_data: bytes) -> Optional[str]:
    """Convert icon binary data to base64 string"""
    try:
        if isinstance(icon_data, bytes):
            return base64.b64encode(icon_data).decode('utf-8')
    except Exception as e:
        logger.warning(f"Error converting icon to base64: {str(e)}")
    return None

def validate_file_size(content: bytes, max_size: int, file_type: str):
    """Validate file size"""
    if len(content) > max_size:
        size_mb = max_size / (1024 * 1024)
        raise FileUploadError(f"{file_type} file too large. Maximum size is {size_mb}MB.")

def get_file_info(file_path: str) -> dict:
    """Get file information"""
    if not os.path.exists(file_path):
        return {
            "exists": False,
            "size": 0,
            "name": "",
            "extension": "",
            "readable": False
        }
    
    path_obj = Path(file_path)
    
    try:
        stat = path_obj.stat()
        
        # Test readability
        readable = True
        try:
            with open(path_obj, 'r', encoding='utf-8') as f:
                f.read(100)  # Try to read first 100 characters
        except:
            readable = False
        
        return {
            "exists": True,
            "size": stat.st_size,
            "name": path_obj.name,
            "extension": path_obj.suffix,
            "readable": readable,
            "is_file": path_obj.is_file(),
            "is_python": path_obj.suffix.lower() == '.py',
            "created": stat.st_ctime,
            "modified": stat.st_mtime,
            "absolute_path": str(path_obj.absolute())
        }
    except Exception as e:
        logger.error(f"Error getting file info for {file_path}: {str(e)}")
        return {
            "exists": True,
            "size": 0,
            "name": path_obj.name,
            "extension": path_obj.suffix,
            "readable": False,
            "error": str(e)
        }

def resolve_file_path(file_path: str, base_directory: Optional[str] = None) -> str:
    """
    Resolve file path to absolute path
    If relative path is provided, resolve it relative to base_directory or current working directory
    """
    path_obj = Path(file_path)
    
    if path_obj.is_absolute():
        return str(path_obj)
    else:
        # Handle relative paths
        if base_directory:
            base_path = Path(base_directory)
            resolved_path = base_path / path_obj
        else:
            # Use current working directory
            resolved_path = Path.cwd() / path_obj
        
        return str(resolved_path.resolve())

def validate_file_path_format(file_path: str) -> bool:
    """
    Validate file path format (basic checks)
    """
    if not file_path or not file_path.strip():
        raise FileUploadError("File path cannot be empty")
    
    # Check for invalid characters (basic validation)
    invalid_chars = ['<', '>', '"', '|', '?', '*']
    for char in invalid_chars:
        if char in file_path:
            raise FileUploadError(f"File path contains invalid character: {char}")
    
    # Check path length (Windows has 260 character limit for full paths)
    if len(file_path) > 250:
        logger.warning(f"File path is very long ({len(file_path)} characters): {file_path}")
    
    return True