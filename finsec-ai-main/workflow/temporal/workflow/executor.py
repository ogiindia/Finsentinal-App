import os
import tempfile
import json
import sys
import logging
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app import Pipeline
from ..config import IST, SPARK_SUBMIT_PATH, TEMPORAL_TASK_QUEUE, TEMPORAL_HOST, TEMPORAL_NAMESPACE
from ..logging.manager import log_manager
from ..process.manager import process_manager
from ..process.monitor import ProcessMonitor
from ..models import ExecutionInfo, WorkflowStatus
from .generator import code_generator

logger = logging.getLogger('temporal_workflow_executor')

def update_execution_status_in_db(workflow_id: int, run_id: str, status: str, exit_code: int):
    """Helper function to update execution status in database"""
    try:
        from app import SessionLocal
        db_local = SessionLocal()
        pipeline_local = db_local.query(Pipeline).filter(Pipeline.id == workflow_id).first()
        
        if pipeline_local:
            executions = pipeline_local.configuration.get('executions', [])
            for execution in executions:
                if execution.get('run_id') == run_id:
                    execution['status'] = status
                    execution['completed_at'] = datetime.now().isoformat()
                    execution['exit_code'] = exit_code
                    break
            
            db_local.commit()
        
        db_local.close()
    except Exception as e:
        logger.error(f"Error updating execution status: {e}")

class WorkflowExecutor:
    """Executes Temporal workflows with proper process management"""
    
    def __init__(self):
        pass
    
    async def execute_workflow(self, workflow_id: int, parameters: Dict[str, Any], 
                             timeout_minutes: int, db: Session) -> Dict[str, Any]:
        """
        Execute a workflow with Temporal - Enhanced with proper process handling
        
        Args:
            workflow_id: The workflow ID
            parameters: Execution parameters
            timeout_minutes: Timeout in minutes
            db: Database session
            
        Returns:
            Dict[str, Any]: Execution result
        """
        logger.info(f"Executing workflow {workflow_id} with Temporal (timeout: {timeout_minutes} minutes)")
        
        # Clear previous logs and create new unique log file
        log_manager.clear_logs(workflow_id)
        
        run_id = f"run_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Get the unique log file path created by clear_logs
        log_file_path = log_manager.get_log_file_path(workflow_id)
        
        log_manager.add_log(workflow_id, {
            "level": "info",
            "message": f"Starting Temporal workflow execution for workflow {workflow_id}",
            "component": "temporal_executor",
            "run_id": run_id,
            "timeout_minutes": timeout_minutes
        })
        
        try:
            # Validate pipeline exists
            pipeline = self._validate_pipeline(db, workflow_id)
            
            log_manager.add_log(workflow_id, {
                "level": "info",
                "message": f"Received parameters: {json.dumps(parameters)}",
                "component": "temporal_executor"
            })
            
            # Validate file paths and configuration
            self._validate_pipeline_configuration(pipeline, workflow_id)
            
            # Generate or retrieve workflow code
            workflow_code = self._get_or_generate_workflow_code(pipeline, workflow_id, db)
            
            # Prepare execution environment
            temp_dir, workflow_file = self._prepare_execution_environment(
                workflow_id, run_id, workflow_code
            )
            
            # Start the process
            process = self._start_workflow_process(workflow_id, workflow_file, temp_dir, run_id)
            
            # Create execution info
            execution_info = self._create_execution_info(
                run_id, parameters, process, temp_dir, workflow_file, 
                log_file_path, timeout_minutes
            )
            
            # Store execution info in database
            self._store_execution_info(pipeline, execution_info, db)
            
            # Start monitoring
            self._start_process_monitoring(workflow_id, process, run_id, timeout_minutes)
            
            log_manager.add_log(workflow_id, {
                "level": "info",
                "message": "Temporal workflow execution started. Monitor logs via WebSocket or API.",
                "component": "temporal_executor"
            })
            
            return {
                "success": True,
                "message": f"Temporal workflow {workflow_id} execution started",
                "workflow_id": workflow_id,
                "run_id": run_id,
                "process_pid": process.pid,
                "status": WorkflowStatus.RUNNING,
                "execution_type": "temporal",
                "log_file": os.path.basename(log_file_path),
                "log_file_path": log_file_path,
                "timeout_minutes": timeout_minutes,
                "note": "Workflow is running with real-time log monitoring"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error executing Temporal workflow: {str(e)}")
            log_manager.add_log(workflow_id, {
                "level": "error",
                "message": f"Failed to start Temporal workflow execution: {str(e)}",
                "component": "temporal_executor"
            })
            
            raise HTTPException(
                status_code=500,
                detail=f"Error executing Temporal workflow: {str(e)}"
            )
    
    def _validate_pipeline(self, db: Session, workflow_id: int) -> Pipeline:
        """Validate that the pipeline exists"""
        pipeline = db.query(Pipeline).filter(Pipeline.id == workflow_id).first()
        
        if not pipeline:
            raise HTTPException(
                status_code=404,
                detail=f"Workflow with ID {workflow_id} not found"
            )
        
        return pipeline
    
    def _validate_pipeline_configuration(self, pipeline: Pipeline, workflow_id: int):
        """Validate file paths in pipeline configuration"""
        nodes = pipeline.configuration.get("nodes", [])
        
        for node in nodes:
            node_id = node.get("id")
            node_config = node.get("data", {}).get("componentData", {}).get("config", {})
            
            # Check CSV files
            if "upload_csv" in node_config:
                csv_path = node_config["upload_csv"].get("filePath")
                if csv_path and not os.path.exists(csv_path):
                    raise HTTPException(
                        status_code=400,
                        detail=f"CSV file not found for node {node_id}: {csv_path}"
                    )
            
            # Check JAR files
            if "upload_jar" in node_config:
                jar_path = node_config["upload_jar"].get("filePath")
                if jar_path and not os.path.exists(jar_path):
                    raise HTTPException(
                        status_code=400,
                        detail=f"JAR file not found for node {node_id}: {jar_path}"
                    )
        
        # Validate Spark submit path
        if not os.path.exists(SPARK_SUBMIT_PATH):
            raise HTTPException(
                status_code=500,
                detail=f"Spark-submit command not found at: {SPARK_SUBMIT_PATH}"
            )
    
    def _get_or_generate_workflow_code(self, pipeline: Pipeline, workflow_id: int, db: Session) -> str:
        """Get existing workflow code or generate new code"""
        if not pipeline.workflow_code:
            log_manager.add_log(workflow_id, {
                "level": "info",
                "message": "Workflow code not found in database, generating code...",
                "component": "temporal_executor"
            })
            
            workflow_code = code_generator.generate_workflow_code(
                workflow_id=workflow_id, 
                workflow_config=pipeline.configuration,
                workflow_name=pipeline.name
            )
            
            pipeline.workflow_code = workflow_code.encode('utf-8')
            
            # Update temporal info
            if not pipeline.configuration.get('temporal_info'):
                pipeline.configuration['temporal_info'] = {}
            
            if not pipeline.configuration['temporal_info'].get('workflow_id'):
                temporal_workflow_id = f"workflow_{workflow_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                pipeline.configuration['temporal_info']['workflow_id'] = temporal_workflow_id
                pipeline.configuration['temporal_info']['registered_at'] = datetime.now().isoformat()
                pipeline.configuration['temporal_info']['task_queue'] = TEMPORAL_TASK_QUEUE
            
            db.commit()
            db.refresh(pipeline)
            
            log_manager.add_log(workflow_id, {
                "level": "info",
                "message": f"Generated and saved workflow code ({len(workflow_code)} characters)",
                "component": "temporal_executor"
            })
        else:
            workflow_code = pipeline.workflow_code.decode('utf-8')
        
        return workflow_code
    
    def _prepare_execution_environment(self, workflow_id: int, run_id: str, 
                                     workflow_code: str) -> tuple:
        """Prepare execution environment and write workflow code to file"""
        # Create temporary execution directory
        temp_dir = os.path.join(tempfile.gettempdir(), f"temporal_workflow_{workflow_id}_{run_id}")
        os.makedirs(temp_dir, exist_ok=True)
        
        log_manager.add_log(workflow_id, {
            "level": "info",
            "message": f"Created execution directory: {temp_dir}",
            "component": "temporal_executor"
        })
        
        # Write workflow code to file
        workflow_file = os.path.join(temp_dir, f"temporal_workflow_{workflow_id}.py")
        with open(workflow_file, "w", encoding='utf-8') as f:
            f.write(workflow_code)
        
        log_manager.add_log(workflow_id, {
            "level": "info",
            "message": f"Generated Temporal workflow runner script: {workflow_file}",
            "component": "temporal_executor"
        })
        
        return temp_dir, workflow_file
    
    def _start_workflow_process(self, workflow_id: int, workflow_file: str, 
                               temp_dir: str, run_id: str):
        """Start the workflow process"""
        # Prepare environment variables\
        env = dict(os.environ)
        env.update({
            "PYTHONUNBUFFERED": "1",
            "TEMPORAL_HOST": TEMPORAL_HOST,
            "TEMPORAL_NAMESPACE": TEMPORAL_NAMESPACE,
            "TEMPORAL_TASK_QUEUE": TEMPORAL_TASK_QUEUE,
            "PYTHONIOENCODING": "utf-8"
        })
        
        log_manager.add_log(workflow_id, {
            "level": "debug",
            "message": f"Environment: TEMPORAL_HOST={env['TEMPORAL_HOST']}, NAMESPACE={env['TEMPORAL_NAMESPACE']}, TASK_QUEUE={env['TEMPORAL_TASK_QUEUE']}",
            "component": "temporal_executor"
        })
        
        # Start the process
        process = process_manager.start_process(
            workflow_id=workflow_id,
            command=[sys.executable, workflow_file],
            run_id=run_id,
            temp_dir=temp_dir,
            env=env
        )
        
        log_manager.add_log(workflow_id, {
            "level": "info",
            "message": f"Started Temporal workflow runner process with PID: {process.pid}",
            "component": "temporal_executor"
        })
        
        return process
    
    def _create_execution_info(self, run_id: str, parameters: Dict[str, Any], 
                              process, temp_dir: str, workflow_file: str,
                              log_file_path: str, timeout_minutes: int) -> Dict[str, Any]:
        """Create execution information dictionary"""
        return {
            'run_id': run_id,
            'executed_at': datetime.now(IST).isoformat(),
            'status': WorkflowStatus.RUNNING,
            'parameters': parameters,
            'process_pid': process.pid,
            'temp_dir': temp_dir,
            'runner_script_path': workflow_file,
            'execution_type': 'temporal',
            'log_file': os.path.basename(log_file_path),
            'log_file_path': log_file_path,
            'timeout_minutes': timeout_minutes
        }
    
    def _store_execution_info(self, pipeline: Pipeline, execution_info: Dict[str, Any], 
                             db: Session):
        """Store execution information in database"""
        if not pipeline.configuration.get('executions'):
            pipeline.configuration['executions'] = []
        
        pipeline.configuration['executions'].append(execution_info)
        db.commit()
    
    def _start_process_monitoring(self, workflow_id: int, process, run_id: str, 
                                 timeout_minutes: int):
        """Start monitoring the workflow process"""
        def on_complete(wf_id: int, r_id: str, status: str, exit_code: int):
            update_execution_status_in_db(wf_id, r_id, status, exit_code)
            # Remove from active processes
            if wf_id in process_manager.active_processes:
                del process_manager.active_processes[wf_id]

        
        monitor = ProcessMonitor(
            workflow_id=workflow_id,
            process=process,
            run_id=run_id,
            timeout_minutes=timeout_minutes,
            on_complete=on_complete
        )
        monitor.start_monitoring()

# Global instance
workflow_executor = WorkflowExecutor()