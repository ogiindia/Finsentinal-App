# gateway/config.py
from pydantic import AnyHttpUrl
from typing import List
from os import getenv
import os

class Settings:
    API_TITLE: str = getenv("API_TITLE")
    API_VERSION: str = getenv("API_VERSION")
    VERIFY_SSL: bool = False
    HOST: str = getenv("HOST")
    # PORT: int = int(getenv("PORT"))
    PORT : int = 8002
    LOG_LEVEL: str = getenv("LOG_LEVEL")


    CORE_SERVICE_URL: AnyHttpUrl = getenv("CORE_SERVICE", "http://localhost:8003")

    # CORS
    ORIGINS: List[str] = ["http://localhost:5175"]

    class Config:
        env_file = ".env"


settings = Settings()

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

FORWARDED_ALLOW_IPS: str = getenv("FORWARDED_ALLOW_IPS", "*")
LIMIT_CONCURRENCY: int = int(getenv("LIMIT_CONCURRENCY", 100))
TIMEOUT_KEEP_ALIVE: int = int(getenv("TIMEOUT_KEEP_ALIVE", 5))