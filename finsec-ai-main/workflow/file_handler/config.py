import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# File upload configuration
UPLOAD_DIR = Path("uploads")
TEMP_DIR = Path("temp")

# File size limits
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB general limit
MAX_CSV_SIZE = 50 * 1024 * 1024    # 50MB for CSV files
MAX_JAR_SIZE = 200 * 1024 * 1024   # 200MB for JAR files

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    '.csv', '.txt', '.json', '.xml', '.yaml', '.yml',
    '.jar', '.zip', '.tar', '.gz',
    '.py', '.sql', '.sh', '.bat',
    '.png', '.jpg', '.jpeg', '.gif', '.svg'
}

# MIME type mappings
MIME_TYPES = {
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.yaml': 'application/x-yaml',
    '.yml': 'application/x-yaml',
    '.jar': 'application/java-archive',
    '.zip': 'application/zip',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.py': 'text/x-python',
    '.sql': 'application/sql',
    '.sh': 'application/x-sh',
    '.bat': 'application/x-msdos-program',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
}

# Security settings
SAFE_EXTENSIONS = {'.csv', '.txt', '.json', '.xml', '.yaml', '.yml'}
EXECUTABLE_EXTENSIONS = {'.jar', '.py', '.sql', '.sh', '.bat'}

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)