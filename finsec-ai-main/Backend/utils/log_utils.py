"""
log_utils.py - Dual logging system: Session logs + Application logs
"""

import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict
import threading
from logging.handlers import RotatingFileHandler
from contextvars import ContextVar
import sys
from config import LOG_DIR

# Context variable to store current session_id
current_session_id: ContextVar[Optional[str]] = ContextVar('current_session_id', default=None)


class SessionLogger:
    """
    Dual logging system:
    1. Session-based logs: {username}_{datetime}_{uuid}.log
    2. Application-wide logs: application.log (all activity)
    """
    
    def __init__(self, log_dir: str = LOG_DIR):
        # Base log directory
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Session logs directory
        self.session_log_dir = self.log_dir / "sessions"
        self.session_log_dir.mkdir(parents=True, exist_ok=True)
        
        # Store active session loggers
        self._session_loggers: Dict[str, logging.Logger] = {}
        self._lock = threading.Lock()
        
        # Logging configuration
        self.base_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        self.date_format = '%Y-%m-%d %H:%M:%S'
        
        # Create general application logger
        self.general_logger = self._setup_application_logger()
    
    def _setup_application_logger(self) -> logging.Logger:
        """
        Setup application-wide logger that logs everything to:
        - Console (stdout)
        - application.log file (rotating)
        """
        app_logger = logging.getLogger("application")
        app_logger.setLevel(logging.DEBUG)
        app_logger.propagate = False
        app_logger.handlers.clear()
        
        formatter = logging.Formatter(self.base_format, datefmt=self.date_format)
        
        # Console handler (stdout)
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(formatter)
        app_logger.addHandler(console_handler)
        
        # File handler (rotating) - saves all logs
        app_log_file = self.log_dir / "application.log"
        file_handler = RotatingFileHandler(
            app_log_file,
            maxBytes=50 * 1024 * 1024,  # 50MB
            backupCount=10,
            encoding='utf-8'
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        app_logger.addHandler(file_handler)
        
        return app_logger
    
    def create_session_logger(
        self, 
        username: str, 
        session_id: str,
        level: int = logging.INFO,
        max_bytes: int = 10485760,  # 10MB
        backup_count: int = 3
    ) -> logging.Logger:
        """
        Create a session-specific logger
        Logs go to both:
        1. Session-specific file: {username}_{datetime}_{uuid}.log
        2. Application-wide file: application.log
        """
        with self._lock:
            if session_id in self._session_loggers:
                return self._session_loggers[session_id]
            
            # Generate session log filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            filename = f"{username}_{timestamp}_{unique_id}.log"
            filepath = self.session_log_dir / filename
            
            # Create session logger
            logger_name = f"session.{session_id}"
            session_logger = logging.getLogger(logger_name)
            session_logger.setLevel(level)
            session_logger.propagate = False
            session_logger.handlers.clear()
            
            formatter = logging.Formatter(self.base_format, datefmt=self.date_format)
            
            # Session file handler
            session_file_handler = RotatingFileHandler(
                filepath,
                maxBytes=max_bytes,
                backupCount=backup_count,
                encoding='utf-8'
            )
            session_file_handler.setLevel(level)
            session_file_handler.setFormatter(formatter)
            session_logger.addHandler(session_file_handler)
            
            # Store logger reference
            self._session_loggers[session_id] = session_logger
            
            # Log to both session log and application log
            session_logger.info(f"Session logger created for user: {username}, session_id: {session_id[:8]}...")
            session_logger.info(f"Log file: {filename}")
            self.general_logger.info(f"Session created: user={username}, session_id={session_id[:8]}..., file={filename}")
            
            return session_logger
    
    def get_session_logger(self, session_id: Optional[str] = None) -> logging.Logger:
        """Get session logger or fall back to general logger"""
        if session_id is None:
            session_id = current_session_id.get()
        
        if session_id:
            return self._session_loggers.get(session_id, self.general_logger)
        return self.general_logger
    
    def close_session_logger(self, session_id: str):
        """Close session logger"""
        with self._lock:
            logger = self._session_loggers.pop(session_id, None)
            if logger:
                logger.info(f"Session logger closing for session_id: {session_id[:8]}...")
                self.general_logger.info(f"Session closed: session_id={session_id[:8]}...")
                
                for handler in logger.handlers[:]:
                    handler.close()
                    logger.removeHandler(handler)
    
    def log_info(self, message: str, session_id: Optional[str] = None):
        """Log INFO to session log AND application log"""
        session_logger = self.get_session_logger(session_id)
        if session_logger != self.general_logger:
            session_logger.info(message)
            self.general_logger.info(f"[Session:{session_id[:8] if session_id else 'N/A'}] {message}")
        else:
            self.general_logger.info(message)
    
    def log_debug(self, message: str, session_id: Optional[str] = None):
        """Log DEBUG to session log AND application log"""
        session_logger = self.get_session_logger(session_id)
        if session_logger != self.general_logger:
            session_logger.debug(message)
            self.general_logger.debug(f"[Session:{session_id[:8] if session_id else 'N/A'}] {message}")
        else:
            self.general_logger.debug(message)
    
    def log_warning(self, message: str, session_id: Optional[str] = None):
        """Log WARNING to session log AND application log"""
        session_logger = self.get_session_logger(session_id)
        if session_logger != self.general_logger:
            session_logger.warning(message)
            self.general_logger.warning(f"[Session:{session_id[:8] if session_id else 'N/A'}] {message}")
        else:
            self.general_logger.warning(message)
    
    def log_error(self, message: str, session_id: Optional[str] = None, exc_info: bool = False):
        """Log ERROR to session log AND application log"""
        session_logger = self.get_session_logger(session_id)
        if session_logger != self.general_logger:
            session_logger.error(message, exc_info=exc_info)
            self.general_logger.error(f"[Session:{session_id[:8] if session_id else 'N/A'}] {message}", exc_info=exc_info)
        else:
            self.general_logger.error(message, exc_info=exc_info)
    
    def log_critical(self, message: str, session_id: Optional[str] = None, exc_info: bool = False):
        """Log CRITICAL to session log AND application log"""
        session_logger = self.get_session_logger(session_id)
        if session_logger != self.general_logger:
            session_logger.critical(message, exc_info=exc_info)
            self.general_logger.critical(f"[Session:{session_id[:8] if session_id else 'N/A'}] {message}", exc_info=exc_info)
        else:
            self.general_logger.critical(message, exc_info=exc_info)
    
    def cleanup_all_sessions(self):
        """Close all session loggers"""
        with self._lock:
            for session_id in list(self._session_loggers.keys()):
                self.close_session_logger(session_id)
        
        self.general_logger.info("All session loggers closed")


# Global session logger instance
session_logger = SessionLogger()


# Helper functions
def set_session_context(session_id: str):
    """Set the current session ID in context"""
    current_session_id.set(session_id)


def clear_session_context():
    """Clear the current session ID from context"""
    current_session_id.set(None)


def get_session_logger_dependency() -> SessionLogger:
    """FastAPI dependency to inject session logger"""
    return session_logger
