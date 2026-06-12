import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Workflow configuration
WORKFLOW_LOGS_DIR = Path("logs") / "workflows"

# Validation settings
MIN_NODES_REQUIRED = 1
MAX_NODES_ALLOWED = 100
MAX_EDGES_ALLOWED = 200

# Default workflow settings
DEFAULT_WORKFLOW_DESCRIPTION = "A workflow created with the ML Pipeline Builder"

# Status constants
class WorkflowStatus:
    NOT_STARTED = "not_started"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"

# Ensure directories exist
WORKFLOW_LOGS_DIR.mkdir(parents=True, exist_ok=True)