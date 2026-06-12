import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
import datetime
import json

from app import get_db
from .service import workflow_service
from .models import WorkflowError

logger = logging.getLogger('workflows_routes')

router = APIRouter(prefix="/api/workflows", tags=["workflows"])

# Create a separate router for workflow file operations
file_router = APIRouter(prefix="/api", tags=["workflow-files"])

@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify router is working"""
    return {"message": "Workflows router is working!", "timestamp": "2025-05-30"}

@router.post("")
async def create_workflow(
    pipeline: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Create a new workflow"""
    try:
        logger.info(f"Received workflow creation request: {pipeline}")
        
        workflow = workflow_service.create_workflow(pipeline, db)
        
        logger.info(f"Successfully created workflow {workflow.id}")
        
        return {
            "id": workflow.id,
            "name": workflow.name,
            "message": "Workflow created successfully"
        }
    
    except WorkflowError as e:
        logger.error(f"Workflow error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating workflow: {str(e)}")

@router.get("")
async def list_workflows(
    db: Session = Depends(get_db)
):
    """Get all saved workflows"""
    try:
        workflows = workflow_service.get_workflows(db)
        return [workflow.__dict__ for workflow in workflows]
    
    except WorkflowError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting workflows: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting workflows: {str(e)}")

@router.get("/{workflow_id}")
async def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific workflow"""
    try:
        workflow = workflow_service.get_workflow(workflow_id, db)
        return workflow.__dict__
    
    except WorkflowError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting workflow: {str(e)}")

@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """Delete a workflow"""
    try:
        result = workflow_service.delete_workflow(workflow_id, db)
        return result
    
    except WorkflowError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting workflow: {str(e)}")

@router.get("/{workflow_id}/logs")
async def get_workflow_logs(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """Get logs for a specific workflow execution"""
    try:
        logs_response = workflow_service.get_workflow_logs(workflow_id, db)
        
        return {
            "workflow_id": logs_response.workflow_id,
            "name": logs_response.name,
            "status": logs_response.status,
            "logs": [log.__dict__ for log in logs_response.logs]
        }
    
    except WorkflowError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting workflow logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting workflow logs: {str(e)}")

@router.post("/{workflow_id}/validate")
async def validate_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """Validate a workflow configuration"""
    try:
        workflow = workflow_service.get_workflow(workflow_id, db)
        
        if not workflow.configuration:
            raise HTTPException(status_code=400, detail="Workflow has no configuration to validate")
        
        validation_result = workflow_service.validate_workflow_config(workflow.configuration)
        return validation_result
    
    except WorkflowError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error validating workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error validating workflow: {str(e)}")

@router.post("/validate-config")
async def validate_workflow_config(
    config: Dict[str, Any]
):
    """Validate a workflow configuration without saving"""
    try:
        validation_result = workflow_service.validate_workflow_config(config)
        return validation_result
    
    except Exception as e:
        logger.error(f"Error validating workflow config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error validating workflow config: {str(e)}")

@router.post("/{workflow_id}/logs/clear")
async def clear_workflow_logs(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """Clear logs for a specific workflow"""
    try:
        # Verify workflow exists
        workflow_service.get_workflow(workflow_id, db)
        
        # Clear logs
        from .logging import workflow_log_manager
        workflow_log_manager.clear_workflow_logs(workflow_id)
        
        return {
            "success": True,
            "message": f"Logs cleared for workflow {workflow_id}"
        }
    
    except WorkflowError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error clearing workflow logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error clearing workflow logs: {str(e)}")

@router.get("/{workflow_id}/status")
async def get_workflow_status(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """Get the current status of a workflow"""
    try:
        workflow = workflow_service.get_workflow(workflow_id, db)
        
        # Import here to avoid circular imports
        from app import Pipeline
        db_pipeline = db.query(Pipeline).filter(Pipeline.id == workflow_id).first()
        status = workflow_service._determine_workflow_status(db_pipeline)
        
        return {
            "workflow_id": workflow_id,
            "name": workflow.name,
            "status": status,
            "node_count": workflow.node_count,
            "edge_count": workflow.edge_count
        }
    
    except WorkflowError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting workflow status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting workflow status: {str(e)}")

@file_router.post("/workflow/debug-upload")
async def debug_upload(request: Request):
    """Debug endpoint to see what's being sent"""
    try:
        form = await request.form()
        logger.info("DEBUG: Received form data:")
        for key, value in form.items():
            if hasattr(value, 'filename'):
                logger.info(f"  {key}: File({value.filename}, {value.content_type})")
            else:
                logger.info(f"  {key}: {value}")
        
        return {
            "success": True,
            "message": "Debug info logged",
            "form_keys": list(form.keys())
        }
    except Exception as e:
        logger.error(f"Debug upload error: {e}")
        return {"error": str(e)}

# File upload endpoints for workflows
@file_router.post("/workflow/upload-file")
async def upload_workflow_file(
    request: Request,
    db: Session = Depends(get_db)
):
    """Upload a file for use in a workflow and update the workflow configuration"""
    try:
        # Parse form data manually to better handle errors
        form = await request.form()
        
        logger.info("Received file upload form data:")
        for key, value in form.items():
            if hasattr(value, 'filename'):
                logger.info(f"  {key}: File({value.filename}, size: {value.size if hasattr(value, 'size') else 'unknown'})")
            else:
                logger.info(f"  {key}: {value}")
        
        # Extract fields from form
        file = form.get('file')
        
        # Handle both component upload and workflow upload patterns
        workflow_id = form.get('workflow_id') or form.get('workflowId')
        node_id = form.get('node_id') or form.get('nodeId')
        parameter_name = form.get('parameter_name') or form.get('parameterName') or form.get('param_name')
        
        # Alternative pattern for component uploads
        component_id = form.get('component_id') or form.get('componentId')
        param_name = form.get('param_name') or form.get('paramName')
        
        # Validate required fields
        if not file or not hasattr(file, 'filename'):
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Determine upload type
        if component_id and param_name:
            # Component file upload - convert to workflow parameters
            logger.info("Detected component file upload pattern")
            
            # For component uploads, we'll use a simple file storage approach
            # and return the file path for the frontend to use
            try:
                component_id = int(component_id)
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail="component_id must be a valid integer")
            
            result = await upload_component_file(file, component_id, param_name)
            return result
            
        elif workflow_id and node_id and parameter_name:
            # Workflow file upload
            logger.info("Detected workflow file upload pattern")
            
            try:
                workflow_id = int(workflow_id)
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail="workflow_id must be a valid integer")
            
            result = await simple_file_upload(file, workflow_id, node_id, parameter_name)
            return result
        
        else:
            raise HTTPException(
                status_code=400, 
                detail="Missing required parameters. Need either (component_id, param_name) or (workflow_id, node_id, parameter_name)"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

async def upload_component_file(file: UploadFile, component_id: int, param_name: str):
    """Handle component file uploads"""
    try:
        # Read file content
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Create component-specific directory structure
        import os
        from pathlib import Path
        import uuid
        
        uploads_dir = Path("uploads") / f"component_{component_id}" / param_name
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_stem = Path(file.filename).stem
        file_extension = Path(file.filename).suffix
        unique_id = str(uuid.uuid4())[:8]
        unique_filename = f"{file_stem}_{unique_id}{file_extension}"
        file_path = uploads_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"Component file saved to: {file_path}")
        
        # Create relative path safely
        try:
            relative_path = file_path.relative_to(Path.cwd())
        except ValueError:
            # Fallback for Windows path issues
            relative_path = str(file_path).replace(str(Path.cwd()), "").lstrip(os.sep)
        
        return {
            "success": True,
            "message": "File uploaded successfully",
            "fileName": file.filename,
            "fileSize": len(content),
            "fileType": file.content_type or "",
            "filePath": str(file_path.absolute()),
            "relativePath": str(relative_path),
            "uniqueFilename": unique_filename,
            "component_id": component_id,
            "param_name": param_name,
            "isNewFile": True
        }
        
    except Exception as e:
        logger.error(f"Error in component file upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading component file: {str(e)}")

async def simple_file_upload(file: UploadFile, workflow_id: int, node_id: str, parameter_name: str):
    """Simple file upload fallback without database integration"""
    try:
        # Read file content
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Create uploads directory if it doesn't exist
        import os
        from pathlib import Path
        import uuid
        
        uploads_dir = Path("uploads")
        uploads_dir.mkdir(exist_ok=True)
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4().hex}{file_extension}"
        file_path = uploads_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"File saved to: {file_path}")
        
        return {
            "success": True,
            "message": "File uploaded successfully (simple mode)",
            "filename": file.filename,
            "unique_filename": unique_filename,
            "file_path": str(file_path.absolute()),
            "file_size": len(content),
            "workflow_id": workflow_id,
            "node_id": node_id,
            "parameter_name": parameter_name
        }
        
    except Exception as e:
        logger.error(f"Error in simple file upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@file_router.get("/workflow/download-file/{filename}")
async def download_workflow_file(filename: str):
    """Download a workflow file"""
    try:
        from pathlib import Path
        from fastapi.responses import FileResponse
        
        file_path = Path("uploads") / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")

@file_router.delete("/workflow/delete-file")
async def delete_workflow_file(
    workflow_id: int,
    node_id: str,
    parameter_name: str,
    db: Session = Depends(get_db)
):
    """Delete a workflow file and remove it from configuration"""
    try:
        # Import the file upload service
        from .file_service import file_upload_service
        
        result = file_upload_service.delete_workflow_file(
            workflow_id=workflow_id,
            node_id=node_id,
            parameter_name=parameter_name,
            db=db
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

@file_router.get("/workflow/file-info")
async def get_workflow_file_info(
    workflow_id: int,
    node_id: str,
    parameter_name: str,
    db: Session = Depends(get_db)
):
    """Get information about a file in a workflow"""
    try:
        # Import the file upload service
        from .file_service import file_upload_service
        
        file_info = file_upload_service.get_file_info(
            workflow_id=workflow_id,
            node_id=node_id,
            parameter_name=parameter_name,
            db=db
        )
        
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")
        
        return {
            "success": True,
            "file_info": file_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting file info: {str(e)}")
    

@router.post("/{workflow_id}/save-result")
async def save_workflow_result(
    workflow_id: int,
    result: dict,
    overwrite: bool = False,
    db: Session = Depends(get_db)
):
    from app import get_db, Pipeline

    pipeline = db.query(Pipeline).filter(Pipeline.id == workflow_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if pipeline.pipeline_output and not overwrite:
        return {
            "result_exists": True,
            "message": "A result already exists. Overwrite?",
            "can_overwrite": True
        }

    pipeline.pipeline_output = json.dumps(result).encode('utf-8')
    pipeline.updated_at = datetime.datetime.utcnow()
    db.commit()
    return { "success": True, "message": "Result saved." }