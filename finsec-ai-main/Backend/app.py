from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
import ssl
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
import secrets
import asyncio
from typing import Dict, Optional
from config import (settings, LOGGING_CONFIG, FORWARDED_ALLOW_IPS, LIMIT_CONCURRENCY,
                    TIMEOUT_KEEP_ALIVE)
# from retrain.retrain_routes import retrain_router
from retrain.retrain_route_pyspark_2 import retrain_router

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Session Manager
class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, Dict] = {}
        self.cleanup_task = None
    
    async def create_session(self, username: str, access_token: str) -> str:
        """Create new session and return session ID"""
        session_id = secrets.token_urlsafe(32)
        self.sessions[session_id] = {
            'username': username,
            'access_token': access_token,
            'created_at': datetime.utcnow(),
            'last_accessed': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES)
        }
        
        logger.info(f"Created session for user: {username}, session_id: {session_id[:8]}...")
        
        # Create session logger
        from utils.log_utils import session_logger
        session_logger.create_session_logger(username, session_id)
        
        return session_id
    
    async def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session if valid, return None if expired"""
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        
        if datetime.utcnow() > session['expires_at']:
            logger.info(f"Session expired: {session_id[:8]}...")
            del self.sessions[session_id]
            return None
        
        # Extend session on access
        session['last_accessed'] = datetime.utcnow()
        session['expires_at'] = datetime.utcnow() + timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES)
        
        return session
    
    async def delete_session(self, session_id: str):
        """Delete session by ID"""
        if session_id in self.sessions:
            logger.info(f"Deleting session: {session_id[:8]}...")
            
            # Close session logger
            from utils.log_utils import session_logger
            session_logger.close_session_logger(session_id)
            
            del self.sessions[session_id]
    
    async def cleanup_expired_sessions(self):
        """Periodic cleanup of expired sessions"""
        while True:
            try:
                current_time = datetime.utcnow()
                expired_sessions = [
                    sid for sid, session in self.sessions.items()
                    if current_time > session['expires_at']
                ]
                
                for sid in expired_sessions:
                    logger.info(f"Cleaning up expired session: {sid[:8]}...")
                    
                    # Close session logger
                    from utils.log_utils import session_logger
                    session_logger.close_session_logger(sid)
                    
                    del self.sessions[sid]
                
                await asyncio.sleep(60)  # Run cleanup every minute
            
            except Exception as e:
                logger.error(f"Error in session cleanup: {str(e)}")
                await asyncio.sleep(60)


# Initialize session manager
session_manager = SessionManager()

# Database setup
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Update with your actual database URL from settings
DATABASE_URL = getattr(settings, 'DB_URL')
engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Database dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Import and include routers
from auth.auth_route import auth_router, init_auth_dependencies
from alert.alert_route import alerts_router
from model_route.model_route import model_router
from dashboard.alert_analysis_route import dashboard_router
from health.health_route import health_router
from customer_profiling.customer_route import customer_route
from version.version_route import version_router
from feature_route.feature_route import feature_route

# Initialize auth with database dependency
init_auth_dependencies(session_manager, settings, get_db)

# SSL context
ssl_context = ssl.create_default_context()
if not settings.VERIFY_SSL:
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.API_TITLE} v{settings.API_VERSION}")
    logger.info(f"Session timeout: {settings.SESSION_TIMEOUT_MINUTES} minutes")
    logger.info(f"CORS enabled for: {settings.ORIGIN}")
    
    # Create database tables
    from model import Base
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
    # Start session cleanup task
    cleanup_task = asyncio.create_task(session_manager.cleanup_expired_sessions())
    session_manager.cleanup_task = cleanup_task
    logger.info("Session cleanup task started")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    if session_manager.cleanup_task:
        session_manager.cleanup_task.cancel()
        try:
            await session_manager.cleanup_task
        except asyncio.CancelledError:
            logger.info("Session cleanup task cancelled")
    
    # Cleanup all session loggers
    from utils.log_utils import session_logger
    session_logger.cleanup_all_sessions()
    logger.info("All session loggers closed")


# Initialize FastAPI
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None
)

# Store settings and session manager in app state
app.state.settings = settings
app.state.session_manager = session_manager

# Add session context middleware
from utils.log_utils import set_session_context, clear_session_context

@app.middleware("http")
async def session_context_middleware(request: Request, call_next):
    """Automatically set session context for logging"""
    session_id = request.cookies.get("session_id")
    
    if session_id:
        set_session_context(session_id)
    
    try:
        response = await call_next(request)
        return response
    finally:
        clear_session_context()


# # Configure CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=settings.ORIGIN,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
#     expose_headers=["*"]
# )

# Include routers
app.include_router(health_router)
app.include_router(auth_router)
# app.include_router(alerts_router)
app.include_router(model_router)
app.include_router(dashboard_router)
app.include_router(customer_route)
app.include_router(retrain_router)
app.include_router(version_router)
app.include_router(feature_route)


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "detail": exc.detail,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        # reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL,
        log_config=LOGGING_CONFIG,
        proxy_headers=True,
        forwarded_allow_ips=FORWARDED_ALLOW_IPS,
        limit_concurrency=LIMIT_CONCURRENCY,
        # limit_max_requests=LIMIT_MAX_REQUESTS,
        timeout_keep_alive=TIMEOUT_KEEP_ALIVE,
        # workers=WORKERS,
        backlog=2048 
    )
