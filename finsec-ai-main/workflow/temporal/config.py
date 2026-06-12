import os
import logging
from datetime import timezone, timedelta
from secret_key import temporal_host, temporal_namespace, temporal_task_queue, temporal_port, spark_submit, spark_master, Java_home

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Timezone settings
IST = timezone(timedelta(hours=5, minutes=30))

# Temporal server connection settings
TEMPORAL_HOST = f'{temporal_host}:{temporal_port}'
TEMPORAL_NAMESPACE = temporal_namespace
TEMPORAL_TASK_QUEUE = temporal_task_queue

# Paths
LOGS_DIR = os.path.join(os.getcwd(), "logs")
SPARK_SUBMIT_PATH = spark_submit
SPARK_MASTER_URL = spark_master

# Process settings
DEFAULT_TIMEOUT_MINUTES = 30

JAVA_HOME = Java_home

# Check availability of required packages
try:
    from temporalio.client import Client
    from temporalio.common import RetryPolicy
    from temporalio import workflow
    import psutil
    TEMPORAL_AVAILABLE = True
except ImportError:
    print("Warning: Temporal SDK or psutil not available")
    TEMPORAL_AVAILABLE = False

# Create logs directory
os.makedirs(LOGS_DIR, exist_ok=True)