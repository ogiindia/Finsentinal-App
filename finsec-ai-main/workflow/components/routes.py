import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse, FileResponse, Response
from sqlalchemy.orm import Session

from app import get_db
from .service import component_service
from .models import ComponentError

logger = logging.getLogger('components_routes')

router = APIRouter(prefix="/api", tags=["components"])

@router.post("/components", status_code=201)
async def create_component(
    name: str = Form(...),
    section: str = Form(...),
    parameters: str = Form(...),
    pythonFilePath: Optional[str] = Form(None),  # NEW: File path instead of upload
    description: Optional[str] = Form(None),
    icon: Optional[UploadFile] = File(None),  # Keep icon upload for small files
    db: Session = Depends(get_db)
):
    """Create a new component with file path"""
    try:
        component = await component_service.create_component(
            name=name,
            section=section,
            parameters=parameters,
            python_file_path=pythonFilePath,  # NEW: Pass file path
            description=description,
            icon=icon,
            db=db
        )
        
        return {
            "success": True,
            "message": "Component created successfully",
            "data": {
                "id": component.id,
                "name": component.name,
                "section_id": component.section_id,
                "section_name": component.section_name,
                "parameters": component.parameters,
                "file_path": component.file_path,
                "has_icon": component.has_icon
            }
        }
    
    except ComponentError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating component: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating component: {str(e)}")

@router.get("/components/{component_id}")
async def get_component(
    component_id: int,
    db: Session = Depends(get_db)
):
    """Get a component by ID"""
    try:
        component = component_service.get_component(component_id, db)
        return component.__dict__
    except ComponentError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting component: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting component: {str(e)}")

@router.get("/components/{component_id}/parameters")
async def get_component_parameters(
    component_id: int,
    db: Session = Depends(get_db)
):
    """Get component parameters by ID"""
    try:
        component = component_service.get_component(component_id, db)
        return {
            "id": component.id,
            "name": component.name,
            "parameters": component.parameters
        }
    except ComponentError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting component parameters: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting component parameters: {str(e)}")

@router.get("/components/{component_id}/download")
async def download_component_file(
    component_id: int,
    db: Session = Depends(get_db)
):
    """Download the Python file for a component"""
    try:
        component = component_service.get_component(component_id, db)
        
        if not component.python_file_exists:
            raise HTTPException(status_code=404, detail="Component file not found at specified path")
        
        filename = f"{component.name}.py"
        return FileResponse(
            path=component.file_path,
            filename=filename,
            media_type='application/octet-stream'
        )
    except ComponentError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error downloading component file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error downloading component file: {str(e)}")

@router.get("/components/{component_id}/icon")
async def get_component_icon(
    component_id: int,
    db: Session = Depends(get_db)
):
    """Get the icon for a component as binary data"""
    try:
        icon_data = component_service.get_component_icon(component_id, db)
        
        return Response(
            content=icon_data,
            media_type="image/png",
            headers={
                "Content-Disposition": f"inline; filename=component_{component_id}_icon.png"
            }
        )
    except ComponentError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting component icon: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting component icon: {str(e)}")

@router.get("/components")
async def get_components(
    section_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all components or filter by section"""
    try:
        components = component_service.get_components(section_id, db)
        return [comp.__dict__ for comp in components]
    except Exception as e:
        logger.error(f"Error getting components: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting components: {str(e)}")

@router.put("/components/{component_id}")
async def update_component(
    component_id: int,
    name: str = Form(...),
    section: str = Form(...),
    parameters: str = Form(...),
    pythonFilePath: Optional[str] = Form(None),  # NEW: File path instead of upload
    description: Optional[str] = Form(None),
    icon: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Update an existing component with file path"""
    try:
        component = await component_service.update_component(
            component_id=component_id,
            name=name,
            section=section,
            parameters=parameters,
            python_file_path=pythonFilePath,  # NEW: Pass file path
            description=description,
            icon=icon,
            db=db
        )
        
        return {
            "success": True,
            "message": "Component updated successfully",
            "data": {
                "id": component.id,
                "name": component.name,
                "section_id": component.section_id,
                "section_name": component.section_name,
                "parameters": component.parameters,
                "file_path": component.file_path,
                "has_icon": component.has_icon
            }
        }
    except ComponentError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating component: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating component: {str(e)}")

@router.delete("/components/{component_id}")
async def delete_component(
    component_id: int,
    db: Session = Depends(get_db)
):
    """Delete a component"""
    try:
        component_service.delete_component(component_id, db)
        
        return {
            "success": True,
            "message": "Component deleted successfully"
        }
    except ComponentError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting component: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting component: {str(e)}")

@router.get("/sections")
async def get_sections(
    db: Session = Depends(get_db)
):
    """Get all sections with their components"""
    try:
        sections = component_service.get_sections(db)
        return [section.__dict__ for section in sections]
    except Exception as e:
        logger.error(f"Error getting sections: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting sections: {str(e)}")

@router.post("/components/validate-path")
async def validate_component_path(
    file_path: str = Form(...),
):
    """Validate if a component file path exists and is accessible"""
    try:
        import os
        
        if not file_path:
            raise HTTPException(status_code=400, detail="File path is required")
        
        # Check if file exists
        if not os.path.exists(file_path):
            return {
                "valid": False,
                "exists": False,
                "message": f"File does not exist at path: {file_path}"
            }
        
        # Check if it's a file (not directory)
        if not os.path.isfile(file_path):
            return {
                "valid": False,
                "exists": True,
                "message": f"Path exists but is not a file: {file_path}"
            }
        
        # Check if it's a Python file
        if not file_path.endswith('.py'):
            return {
                "valid": False,
                "exists": True,
                "message": f"File is not a Python file (.py): {file_path}"
            }
        
        # Check if file is readable
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read(100)  # Read first 100 characters to test
        except Exception as e:
            return {
                "valid": False,
                "exists": True,
                "message": f"File exists but cannot be read: {str(e)}"
            }
        
        # Get file info
        stat = os.stat(file_path)
        file_size = stat.st_size
        
        return {
            "valid": True,
            "exists": True,
            "message": "File path is valid and accessible",
            "file_info": {
                "size": file_size,
                "size_mb": round(file_size / (1024 * 1024), 2),
                "readable": True
            }
        }
        
    except Exception as e:
        logger.error(f"Error validating file path: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error validating file path: {str(e)}")