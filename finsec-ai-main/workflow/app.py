from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, JSON, LargeBinary, DateTime, Text
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import sessionmaker, Session, relationship, declarative_base
import os
import datetime
import pymysql
from secret_key import database_url, fast_api_host, fast_api_port, LIMIT_CONCURRENCY, LOG_LEVEL, LOGGING_CONFIG, FORWARDED_ALLOW_IPS, TIMEOUT_KEEP_ALIVE

pymysql.install_as_MySQLdb()

# Create database connection
DATABASE_URL = os.environ.get("DATABASE_URL", database_url)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Create directories for storing component files (only Python files now)
COMPONENTS_DIR = os.path.join(os.getcwd(), "component")

# Ensure directories exist
os.makedirs(COMPONENTS_DIR, exist_ok=True)

class Section(Base):
    __tablename__ = "sections"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    components = relationship("Component", back_populates="section", cascade="all, delete-orphan")

class Component(Base):
    __tablename__ = "components"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)
    section_id = Column(Integer, ForeignKey("sections.id"))
    icon_class = Column(String(100), nullable=True)
    parameters = Column(JSON, nullable=True)
    description = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=False)  # Store absolute path to Python file
    icon_path = Column(LONGBLOB, nullable=True)  # Use LONGBLOB for larger binary data (up to 4GB)
    image_name = Column(String(255))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    section = relationship("Section", back_populates="components")

class Pipeline(Base):
    __tablename__ = "pipelines"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    configuration = Column(JSON, nullable=False)
    workflow_code = Column(LONGBLOB)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    yield db
    db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up FastAPI application...")
    
    os.environ.setdefault("JDBC_DRIVER_PATH", r"C:\AIML\Mlpipe\Backend\Uploads\default_jdbc_driver.jar")
    
    print(f"JDBC_DRIVER_PATH: {os.environ['JDBC_DRIVER_PATH']}")
    
    # Import and include routers with new structure
    try:
        from components import router as component_router
        app.include_router(component_router)
        print("Successfully loaded components router")
    except ImportError as e:
        print(f"Warning: components module not found: {e}")
    
    try:
        from workflows import router as workflow_router, file_router
        app.include_router(workflow_router)
        app.include_router(file_router)
        print("Successfully loaded workflows router and file router")
        print(f"Workflow router routes: {[route.path for route in workflow_router.routes]}")
        print(f"File router routes: {[route.path for route in file_router.routes]}")
    except ImportError as e:
        print(f"Warning: workflows module not found: {e}")
    except Exception as e:
        print(f"Error loading workflows module: {e}")
    
    try:
        from temporal import router as temporal_router, websocket_workflow_logs
        app.include_router(temporal_router)
        app.add_websocket_route("/api/temporal/workflow/{workflow_id}/logs/ws", websocket_workflow_logs)
        print("Successfully loaded temporal router and websocket")
    except ImportError as e:
        print(f"Warning: temporal module not found: {e}")
    
    try:
        from file_handler import router as file_handler_router
        app.include_router(file_handler_router)
        print("Successfully loaded file_handler router")
    except ImportError as e:
        print(f"Warning: file_handler module not found: {e}")

    # FIXED: Import and include the utils router from Fuctionalities
    try:
        from Fuctionalities.utils import router as utils_router
        app.include_router(utils_router, prefix="/api")  # Adding /api prefix to match frontend expectations
        print("Successfully loaded utils router from Fuctionalities")
        print(f"Utils router routes: {[route.path for route in utils_router.routes]}")
    except ImportError as e:
        print(f"Warning: Fuctionalities.utils module not found: {e}")
    except Exception as e:
        print(f"Error loading Fuctionalities.utils module: {e}")

    # Also try the old way for backward compatibility
    try:
        from Fuctionalities import router as functionalities_router
        app.include_router(functionalities_router, prefix="/api")
        print("Successfully loaded functionalities router")
    except ImportError as e:
        print(f"Warning: Fuctionalities module not found: {e}")
    
    print("FastAPI application startup complete!")
    
    yield  # This is where the application runs
    
    # Shutdown
    print("Shutting down FastAPI application...")

# Create FastAPI application with lifespan
app = FastAPI(
    title="ML Workflow API",
    description="API for creating and executing ML workflows with custom components",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=False,
    redoc_url=False,
    openapi_url=False
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:5175"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add a direct component parameters endpoint (fallback)
@app.get("/api/components/{component_id}/parameters")
async def get_component_parameters_fallback(
    component_id: int,
    db: Session = Depends(get_db)
):
    # Get component from database
    component = db.query(Component).filter(Component.id == component_id).first()
    
    if not component:
        raise HTTPException(
            status_code=404,
            detail=f"Component with ID {component_id} not found"
        )
    
    # Return parameters
    return {
        "id": component.id,
        "name": component.name,
        "parameters": component.parameters
    }

# Health check endpoint
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow(),
        "version": "2.0.0",
        "modules": {
            "components": True,
            "workflows": True,  
            "temporal": True,
            "file_handler": True,
            "utils": True  # Added utils module status
        }
    }

# Test endpoint to verify utils router is working
@app.get("/api/test-utils")
def test_utils():
    """Test endpoint to verify utils functionality"""
    return {
        "status": "success",
        "message": "Utils router is working",
        "available_endpoints": [
            "/api/utils/get_columns"
        ]
    }

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app,
                host=str(fast_api_host),
                port=int(fast_api_port),
                log_level=LOG_LEVEL,
                log_config=LOGGING_CONFIG,
                proxy_headers=True,
                forwarded_allow_ips=FORWARDED_ALLOW_IPS,
                limit_concurrency=LIMIT_CONCURRENCY,
                timeout_keep_alive=TIMEOUT_KEEP_ALIVE,
                backlog=2048 
                )