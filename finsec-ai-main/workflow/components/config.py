import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Component storage configuration - ensure it's always a Path object
COMPONENTS_DIR = Path(os.getcwd()) / "component"

# File size limits
MAX_ICON_SIZE = 50 * 1024 * 1024  # 50MB for icons
MAX_PYTHON_FILE_SIZE = 100 * 1024 * 1024  # 100MB for Python files

# Allowed file extensions
ALLOWED_PYTHON_EXTENSIONS = {'.py'}
ALLOWED_ICON_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'}

# Default values
DEFAULT_ICON_CLASS = "fas fa-puzzle-piece"

# Ensure directories exist - create the directory immediately
try:
    COMPONENTS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Components directory created/verified at: {COMPONENTS_DIR}")
except Exception as e:
    print(f"Error creating components directory: {e}")