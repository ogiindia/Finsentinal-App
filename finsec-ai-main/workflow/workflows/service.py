import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app import Pipeline
from .models import WorkflowRequest, WorkflowResponse, WorkflowLogsResponse, WorkflowError
from .validator import workflow_validator
from .logging import workflow_log_manager
from .config import WorkflowStatus, DEFAULT_WORKFLOW_DESCRIPTION

logger = logging.getLogger('workflows_service')

class WorkflowService:
    """Service class for workflow business logic"""
    
    def __init__(self):
        pass
    
    def create_workflow(self, workflow_data: Dict[str, Any], db: Session) -> WorkflowResponse:
        """Create a new workflow"""
        try:
            # Validate required fields
            if not workflow_data.get("name"):
                raise WorkflowError("Workflow name is required")
            
            if not workflow_data.get("configuration"):
                raise WorkflowError("Workflow configuration is required")
            
            # Validate workflow configuration
            validation_result = workflow_validator.validate_workflow(workflow_data["configuration"])
            if not validation_result.valid:
                error_msg = f"Invalid workflow configuration: {validation_result.message}"
                if validation_result.errors:
                    error_msg += f" Errors: {', '.join(validation_result.errors)}"
                raise WorkflowError(error_msg)
            
            # Log validation warnings if any
            if validation_result.warnings:
                logger.warning(f"Workflow validation warnings: {', '.join(validation_result.warnings)}")
            
            # Create new workflow/pipeline
            new_pipeline = Pipeline(
                name=workflow_data["name"],
                description=workflow_data.get("description", DEFAULT_WORKFLOW_DESCRIPTION),
                configuration=workflow_data["configuration"]
            )
            
            db.add(new_pipeline)
            db.commit()
            db.refresh(new_pipeline)
            
            logger.info(f"Successfully created workflow {new_pipeline.id}: {new_pipeline.name}")
            
            return self._build_workflow_response(new_pipeline)
            
        except WorkflowError:
            raise
        except Exception as e:
            logger.error(f"Error creating workflow: {str(e)}")
            db.rollback()
            raise WorkflowError(f"Failed to create workflow: {str(e)}")
    
    def get_workflows(self, db: Session) -> List[WorkflowResponse]:
        """Get all saved workflows"""
        try:
            pipelines = db.query(Pipeline).all()
            
            result = []
            for pipeline in pipelines:
                try:
                    result.append(self._build_workflow_response(pipeline))
                except Exception as e:
                    logger.error(f"Error processing pipeline {pipeline.id}: {str(e)}")
                    # Add minimal pipeline info on error
                    result.append(self._build_error_workflow_response(pipeline))
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting workflows: {str(e)}")
            raise WorkflowError(f"Failed to get workflows: {str(e)}")
    
    def get_workflow(self, workflow_id: int, db: Session) -> WorkflowResponse:
        """Get a specific workflow"""
        try:
            pipeline = db.query(Pipeline).filter(Pipeline.id == workflow_id).first()
            
            if not pipeline:
                raise WorkflowError(f"Workflow with ID {workflow_id} not found")
            
            return self._build_workflow_response(pipeline, include_configuration=True)
            
        except WorkflowError:
            raise
        except Exception as e:
            logger.error(f"Error getting workflow: {str(e)}")
            raise WorkflowError(f"Failed to get workflow: {str(e)}")
    
    def delete_workflow(self, workflow_id: int, db: Session) -> Dict[str, Any]:
        """Delete a workflow"""
        try:
            pipeline = db.query(Pipeline).filter(Pipeline.id == workflow_id).first()
            
            if not pipeline:
                raise WorkflowError(f"Workflow with ID {workflow_id} not found")
            
            workflow_name = pipeline.name
            
            # Clean up any associated logs
            workflow_log_manager.remove_workflow_logger(workflow_id)
            
            # Delete the pipeline
            db.delete(pipeline)
            db.commit()
            
            logger.info(f"Deleted workflow {workflow_id}: {workflow_name}")
            
            return {
                "success": True,
                "message": f"Workflow '{workflow_name}' deleted successfully"
            }
            
        except WorkflowError:
            raise
        except Exception as e:
            logger.error(f"Error deleting workflow: {str(e)}")
            db.rollback()
            raise WorkflowError(f"Failed to delete workflow: {str(e)}")
    
    def get_workflow_logs(self, workflow_id: int, db: Session) -> WorkflowLogsResponse:
        """Get logs for a specific workflow execution"""
        try:
            pipeline = db.query(Pipeline).filter(Pipeline.id == workflow_id).first()
            
            if not pipeline:
                raise WorkflowError(f"Workflow with ID {workflow_id} not found")
            
            # Get logs from the log manager
            logs = workflow_log_manager.get_workflow_logs(workflow_id)
            
            # Determine workflow status
            status = self._determine_workflow_status(pipeline)
            
            return WorkflowLogsResponse(
                workflow_id=workflow_id,
                name=pipeline.name,
                status=status,
                logs=logs
            )
            
        except WorkflowError:
            raise
        except Exception as e:
            logger.error(f"Error getting workflow logs: {str(e)}")
            raise WorkflowError(f"Failed to get workflow logs: {str(e)}")
    
    def validate_workflow_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a workflow configuration"""
        try:
            validation_result = workflow_validator.validate_workflow(config)
            
            return {
                "valid": validation_result.valid,
                "message": validation_result.message,
                "errors": validation_result.errors,
                "warnings": validation_result.warnings
            }
            
        except Exception as e:
            logger.error(f"Error validating workflow: {str(e)}")
            return {
                "valid": False,
                "message": f"Validation error: {str(e)}",
                "errors": [str(e)],
                "warnings": None
            }
    
    def _build_workflow_response(self, pipeline: Pipeline, include_configuration: bool = False) -> WorkflowResponse:
        """Build workflow response object"""
        # Calculate node and edge count safely
        node_count = 0
        edge_count = 0
        if pipeline.configuration:
            nodes = pipeline.configuration.get("nodes", [])
            edges = pipeline.configuration.get("edges", [])
            node_count = len(nodes) if isinstance(nodes, list) else 0
            edge_count = len(edges) if isinstance(edges, list) else 0
        
        return WorkflowResponse(
            id=pipeline.id,
            name=pipeline.name,
            description=pipeline.description,
            created_at=pipeline.created_at,
            updated_at=pipeline.updated_at,
            node_count=node_count,
            edge_count=edge_count,
            configuration=pipeline.configuration if include_configuration else None
        )
    
    def _build_error_workflow_response(self, pipeline: Pipeline) -> WorkflowResponse:
        """Build error workflow response for corrupted data"""
        from datetime import datetime
        return WorkflowResponse(
            id=pipeline.id,
            name=getattr(pipeline, 'name', f'Workflow {pipeline.id}'),
            description="Error loading workflow",
            created_at=getattr(pipeline, 'created_at', datetime.utcnow()),
            updated_at=getattr(pipeline, 'updated_at', datetime.utcnow()),
            node_count=0,
            edge_count=0
        )
    
    def _determine_workflow_status(self, pipeline: Pipeline) -> str:
        """Determine the current status of a workflow"""
        # Get workflow status from temporal info if available
        temporal_info = pipeline.configuration.get('temporal_info', {})
        executions = pipeline.configuration.get('executions', [])
        
        # Determine status from executions
        if executions:
            latest_execution = executions[-1]
            latest_status = latest_execution.get('status', '').lower()
            if latest_status in ['running', 'started', 'executing']:
                return WorkflowStatus.RUNNING
            elif latest_status in ['completed', 'finished', 'success']:
                return WorkflowStatus.COMPLETED
            elif latest_status in ['failed', 'error']:
                return WorkflowStatus.FAILED
            elif latest_status in ['stopped', 'cancelled']:
                return WorkflowStatus.STOPPED
        
        return WorkflowStatus.NOT_STARTED

# Global instance
workflow_service = WorkflowService()