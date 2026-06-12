import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import get_db
from .service import file_handler_service
from .models import FileHandlerError, ComponentExecutionError

logger = logging.getLogger('file_handler_routes')

router = APIRouter(prefix="/api/workflow", tags=["file_handler"])

@router.post("/upload-file")
async def upload_file_endpoint(
    file: UploadFile = File(...),
    component_id: int = Form(...),
    param_name: str = Form(...),
    db: Session = Depends(get_db)
):
    """API endpoint to upload a file for a component parameter"""
    try:
        # Read file content
        file_content = await file.read()
        
        # Upload the file
        result = await file_handler_service.upload_file(
            file_content=file_content,
            filename=file.filename,
            component_id=component_id,
            param_name=param_name,
            db=db
        )
        
        return {
            "success": result.success,
            "message": result.message,
            "filePath": result.file_path,
            "fileName": result.file_name,
            "fileSize": result.file_size,
            "componentId": result.component_id,
            "paramName": result.param_name,
            "uniqueFilename": result.unique_filename
        }
    
    except FileHandlerError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@router.get("/download-file")
async def download_file_endpoint(
    file_path: str,
    db: Session = Depends(get_db)
):
    """API endpoint to download a file by its path"""
    try:
        # Validate and prepare file for download
        validated_path = file_handler_service.download_file(file_path)
        
        # Get original filename
        from pathlib import Path
        filename = Path(file_path).name
        
        # Return file for download
        return FileResponse(
            path=validated_path,
            filename=filename,
            media_type='application/octet-stream'
        )
    
    except FileHandlerError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")

@router.delete("/delete-file")
async def delete_file_endpoint(
    file_path: str,
    db: Session = Depends(get_db)
):
    """API endpoint to delete a file by its path"""
    try:
        success = file_handler_service.delete_file(file_path)
        
        return {
            "success": success,
            "message": "File deleted successfully" if success else "File not found",
            "filePath": file_path
        }
    
    except FileHandlerError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

@router.get("/list-files/{component_id}")
async def list_component_files(
    component_id: int,
    param_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all files uploaded for a component or specific parameter"""
    try:
        result = file_handler_service.list_component_files(component_id, param_name, db)
        
        return {
            "componentId": result.component_id,
            "paramName": result.param_name,
            "files": [
                {
                    "fileName": file_info.file_name,
                    "filePath": file_info.file_path,
                    "fileSize": file_info.file_size,
                    "uploadedAt": file_info.uploaded_at,
                    "modifiedAt": file_info.modified_at,
                    "paramName": file_info.param_name,
                    "fileExtension": file_info.file_extension,
                    "mimeType": file_info.mime_type
                }
                for file_info in result.files
            ]
        }
    
    except FileHandlerError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")

@router.get("/file-info")
async def get_file_info(
    file_path: str,
    db: Session = Depends(get_db)
):
    """Get information about a file"""
    try:
        file_info = file_handler_service.get_file_info(file_path)
        
        return {
            "fileName": file_info.file_name,
            "filePath": file_info.file_path,
            "fileSize": file_info.file_size,
            "uploadedAt": file_info.uploaded_at,
            "modifiedAt": file_info.modified_at,
            "componentId": file_info.component_id,
            "paramName": file_info.param_name,
            "fileExtension": file_info.file_extension,
            "exists": file_info.exists,
            "mimeType": file_info.mime_type
        }
    
    except FileHandlerError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting file info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting file info: {str(e)}")

@router.post("/execute-component/{component_id}")
async def execute_component_endpoint(
    component_id: int,
    parameters: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Execute a component with given parameters"""
    try:
        result = file_handler_service.execute_component(component_id, parameters, db)
        
        if result.success:
            return {
                "success": True,
                "message": result.message,
                "result": result.result,
                "component_id": result.component_id
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Component execution failed: {result.error}"
            )
    
    except ComponentExecutionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in execute component endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error executing component: {str(e)}")

@router.get("/storage-stats")
async def get_storage_stats(
    db: Session = Depends(get_db)
):
    """Get storage statistics"""
    try:
        stats = file_handler_service.get_storage_stats()
        return stats
    
    except Exception as e:
        logger.error(f"Error getting storage stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting storage stats: {str(e)}")

@router.delete("/cleanup-component/{component_id}")
async def cleanup_component_files(
    component_id: int,
    db: Session = Depends(get_db)
):
    """Clean up all files for a component"""
    try:
        result = file_handler_service.cleanup_component_files(component_id, db)
        return result
    
    except FileHandlerError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error cleaning up component files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error cleaning up component files: {str(e)}")

@router.post("/validate-file")
async def validate_file_endpoint(
    file: UploadFile = File(...)
):
    """Validate a file without uploading it"""
    try:
        from .utils import validate_file_extension, validate_file_size, validate_file_security
        
        # Read file content
        file_content = await file.read()
        
        # Perform validations
        validate_file_extension(file.filename)
        validate_file_size(file_content)
        validate_file_security(file.filename, file_content)
        
        return {
            "valid": True,
            "message": "File validation passed",
            "fileName": file.filename,
            "fileSize": len(file_content),
            "fileExtension": Path(file.filename).suffix.lower()
        }
    
    except FileHandlerError as e:
        return {
            "valid": False,
            "message": str(e),
            "fileName": file.filename,
            "fileSize": len(file_content) if 'file_content' in locals() else 0
        }
    except Exception as e:
        logger.error(f"Error validating file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error validating file: {str(e)}")

@router.post("/bulk-upload")
async def bulk_upload_files(
    files: list[UploadFile] = File(...),
    component_id: int = Form(...),
    param_name: str = Form(...),
    db: Session = Depends(get_db)
):
    """Upload multiple files for a component parameter"""
    try:
        results = []
        errors = []
        
        for file in files:
            try:
                file_content = await file.read()
                
                result = await file_handler_service.upload_file(
                    file_content=file_content,
                    filename=file.filename,
                    component_id=component_id,
                    param_name=param_name,
                    db=db
                )
                
                results.append({
                    "fileName": result.file_name,
                    "filePath": result.file_path,
                    "fileSize": result.file_size,
                    "success": True
                })
                
            except Exception as e:
                errors.append({
                    "fileName": file.filename,
                    "error": str(e),
                    "success": False
                })
        
        return {
            "success": len(errors) == 0,
            "message": f"Uploaded {len(results)} files successfully" + (f", {len(errors)} errors" if errors else ""),
            "results": results,
            "errors": errors,
            "componentId": component_id,
            "paramName": param_name
        }
    
    except Exception as e:
        logger.error(f"Error in bulk upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in bulk upload: {str(e)}")