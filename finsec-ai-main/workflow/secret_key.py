from dotenv import load_dotenv
import os

load_dotenv()

# Database configuration
database_url = os.getenv("DATABASE_URL")

# Temporal configuration
temporal_host = os.getenv("TEMPORAL_HOST")
temporal_namespace = os.getenv("TEMPORAL_NAMESPACE")
temporal_task_queue = os.getenv("TEMPORAL_TASK_QUEUE")
temporal_port = os.getenv("TEMPORAL_PORT")

# Spark Submit
spark_submit = os.getenv("SPARK_SUBMIT_PATH")

# Spark Master Url
spark_master = os.getenv("SPARK_MASTER_URL")

# Fastapi configuration
fast_api_host = os.getenv("FAST_API_HOST")
fast_api_port = os.getenv("FAST_API_PORT")

# Java Path
Java_home = os.getenv("JAVA_HOME")
LOG_DIR = 'logs'
# os.makedirs(LOG_DIR, exist_ok=True)

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        # CORRECTED: Simple format for access logs
        "access": {
            "format": "%(asctime)s - %(levelname)s - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "default",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "DEBUG",
            "formatter": "default",
            "filename": os.path.join(LOG_DIR, "server.log"),
            # "maxBytes": 52428800,  # 50MB
            "backupCount": 10,
            "encoding": "utf8",
        },
        "access_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "INFO",
            "formatter": "access",
            "filename": os.path.join(LOG_DIR, "access.log"),
            # "maxBytes": 52428800,
            "backupCount": 10,
            "encoding": "utf8",
        },
        "error_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "ERROR",
            "formatter": "default",
            "filename": os.path.join(LOG_DIR, "error.log"),
            # "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
            "encoding": "utf8",
        },
    },
    "loggers": {
        "uvicorn": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
        "uvicorn.error": {
            "handlers": ["console", "file", "error_file"],
            "level": "INFO",
            "propagate": False,
        },
        "uvicorn.access": {
            "handlers": ["console", "access_file"],
            "level": "INFO",
            "propagate": False,
        },
        "fastapi": {
            "handlers": ["console", "file"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["console", "file"],
    },
}

FORWARDED_ALLOW_IPS: str = os.getenv("FORWARDED_ALLOW_IPS", "*")
LIMIT_CONCURRENCY: int = int(os.getenv("LIMIT_CONCURRENCY", 100))
TIMEOUT_KEEP_ALIVE: int = int(os.getenv("TIMEOUT_KEEP_ALIVE", 5))
LOG_LEVEL: str = "info"