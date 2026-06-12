import os
import logging
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import Pipeline, get_db
from ..config import TEMPORAL_AVAILABLE, TEMPORAL_HOST, TEMPORAL_NAMESPACE
from ..logging.manager import log_manager
from ..process.manager import process_manager
from ..workflow.executor import workflow_executor
from ..client.temporal_client import temporal_client_manager
from ..models import WorkflowStatus

logger = logging.getLogger('temporal_api_routes')

router = APIRouter(prefix="/api/temporal", tags=["temporal"])

@router.post("/execute-workflow/{workflow_id}")
async def execute_workflow(
    workflow_id: int,
    parameters: Dict[str, Any] = Body({}),
    timeout_minutes: int = 30,
    db: Session = Depends(get_db)
):
    """Execute a workflow with Temporal"""
    return await workflow_executor.execute_workflow(
        workflow_id, parameters, timeout_minutes, db
    )

@router.get("/workflow/{workflow_id}/logs")
async def get_workflow_logs(
    workflow_id: int,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get workflow logs with optional limit and log file information"""
    try:
        pipeline = db.query(Pipeline).filter(Pipeline.id == workflow_id).first()
        
        if not pipeline:
            raise HTTPException(
                status_code=404,
                detail=f"Workflow with ID {workflow_id} not found"
            )
        
        logs = log_manager.get_logs(workflow_id)
        
        if limit > 0:
            logs = logs[-limit:]
        
        executions = pipeline.configuration.get('executions', [])
        
        status = WorkflowStatus.NOT_STARTED
        if executions:
            latest_execution = executions[-1]
            status = latest_execution.get('status', 'unknown').lower()
        
        # Get log file information
        log_file_info = log_manager.get_log_file_info(workflow_id)
        
        return {
            "workflow_id": workflow_id,
            "name": pipeline.name,
            "status": status,
            "logs": logs,
            "total_logs": log_manager.get_total_logs_count(workflow_id),
            "log_file_info": log_file_info
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting workflow logs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting workflow logs: {str(e)}"
        )

@router.get("/workflow/{workflow_id}/logs/download")
async def download_workflow_log_file(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """Download the log file for a workflow"""
    try:
        pipeline = db.query(Pipeline).filter(Pipeline.id == workflow_id).first()
        
        if not pipeline:
            raise HTTPException(
                status_code=404,
                detail=f"Workflow with ID {workflow_id} not found"
            )
        
        log_file_info = log_manager.get_log_file_info(workflow_id)
        log_file_path = log_file_info.get("log_file_path")
        
        if not log_file_path or not os.path.exists(log_file_path):
            raise HTTPException(
                status_code=404,
                detail=f"Log file not found for workflow {workflow_id}"
            )
        
        return FileResponse(
            path=log_file_path,
            filename=os.path.basename(log_file_path),
            media_type='text/plain'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading log file: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error downloading log file: {str(e)}"
        )

@router.post("/workflow/{workflow_id}/logs/clear")
async def clear_workflow_logs(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """Clear logs for a workflow"""
    try:
        pipeline = db.query(Pipeline).filter(Pipeline.id == workflow_id).first()
        
        if not pipeline:
            raise HTTPException(
                status_code=404,
                detail=f"Workflow with ID {workflow_id} not found"
            )
        
        log_manager.clear_logs(workflow_id)
        
        return {
            "success": True,
            "message": f"Logs cleared for workflow {workflow_id}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing workflow logs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing workflow logs: {str(e)}"
        )

@router.get("/workflow/{workflow_id}/execution-status")
async def get_execution_status(workflow_id: int, db: Session = Depends(get_db)):
    pipeline = db.query(Pipeline).filter(Pipeline.id == workflow_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Workflow not found")

    executions = pipeline.configuration.get('executions', [])
    if not executions:
        return { "workflow_id": workflow_id, "status": "NOT_STARTED" }

    latest_execution = executions[-1]
    process_pid = latest_execution.get('process_pid')

    if process_pid:
        # Directly check the running process!
        running = process_manager.is_process_running_pid(process_pid)
        return {
            "workflow_id": workflow_id,
            "status": "RUNNING" if running else "COMPLETED",
            "execution": latest_execution
        }
    else:
        # Fallback
        return {
            "workflow_id": workflow_id,
            "status": latest_execution.get('status', 'UNKNOWN'),
            "execution": latest_execution
        }


@router.post("/workflow/{workflow_id}/stop-execution")
async def stop_workflow_execution(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """Stop a running workflow execution"""
    try:
        pipeline = db.query(Pipeline).filter(Pipeline.id == workflow_id).first()
        
        if not pipeline:
            raise HTTPException(
                status_code=404,
                detail=f"Workflow with ID {workflow_id} not found"
            )
        
        executions = pipeline.configuration.get('executions', [])
        
        if not executions:
            return {
                "success": False,
                "message": "No executions found for this workflow"
            }
        
        latest_execution = executions[-1]
        process_pid = latest_execution.get('process_pid')
        
        if not process_pid:
            return {
                "success": False,
                "message": "No process ID found for the latest execution"
            }
        
        # Try to stop the process
        success = process_manager.stop_process(workflow_id)
        
        if success:
            # Update status in database
            latest_execution['status'] = WorkflowStatus.STOPPED
            latest_execution['stopped_at'] = datetime.now().isoformat()
            db.commit()
            
            log_manager.add_log(workflow_id, {
                "level": "info",
                "message": f"Temporal workflow execution stopped (PID: {process_pid})",
                "component": "temporal_executor"
            })
            
            return {
                "success": True,
                "message": f"Temporal workflow execution stopped (PID: {process_pid})"
            }
        else:
            return {
                "success": False,
                "message": f"Failed to stop workflow process (PID: {process_pid})"
            }
        
    except Exception as e:
        logger.error(f"Error stopping workflow execution: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error stopping workflow execution: {str(e)}"
        )

@router.get("/health")
async def check_temporal_connection():
    """Check connection to Temporal"""
    try:
        if not TEMPORAL_AVAILABLE:
            return {
                "status": "unavailable",
                "message": "Temporal SDK not installed",
                "namespace": TEMPORAL_NAMESPACE,
                "host": TEMPORAL_HOST
            }
        
        is_connected = await temporal_client_manager.check_connection()
        
        if is_connected:
            return {
                "status": "connected",
                "message": "Successfully connected to Temporal",
                "namespace": TEMPORAL_NAMESPACE,
                "host": TEMPORAL_HOST
            }
        else:
            return {
                "status": "disconnected",
                "message": "Failed to connect to Temporal",
                "namespace": TEMPORAL_NAMESPACE,
                "host": TEMPORAL_HOST
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error checking Temporal connection: {str(e)}",
            "namespace": TEMPORAL_NAMESPACE,
            "host": TEMPORAL_HOST
        }

@router.get("/status")
async def get_temporal_status():
    """Get comprehensive Temporal status"""
    try:
        connection_info = temporal_client_manager.connection_info
        active_workflows = process_manager.get_active_workflow_ids()
        
        return {
            "temporal_available": TEMPORAL_AVAILABLE,
            "connection": connection_info,
            "active_workflows": active_workflows,
            "active_workflow_count": len(active_workflows)
        }
    except Exception as e:
        logger.error(f"Error getting Temporal status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting Temporal status: {str(e)}"
        )