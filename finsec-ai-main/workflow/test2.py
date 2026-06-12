import asyncio
import logging
import os
import json
import pickle
import base64
import re
from datetime import timedelta
from typing import Dict, Any

from temporalio import workflow, activity
from temporalio.client import Client
from temporalio.worker import Worker
from temporalio.common import RetryPolicy

# Global workflow results store
workflow_results = {}

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Component file paths
component_file_paths = {'node-1': '/storage/AIML/MLDashboard/MLpipe-v2/Backend/component/csv2par_a59b4798.py', 'node-2': '/storage/AIML/MLDashboard/MLpipe-v2/Backend/component/column_selection.py', 'node-3': '/storage/AIML/MLDashboard/MLpipe-v2/Backend/component/iso_model.py'}
env = os.environ.copy()
env['JAVA_HOME'] = '/opt/java/jdk-21.0.7'
@activity.defn
async def node_1(args):
    import subprocess
    import json
    import os
    import tempfile
    import re
    
    script_path_key = "node-1"
    script_path = component_file_paths.get(script_path_key)
    
    if not script_path:
        raise RuntimeError(f"No script file path defined for component node-1")
    
    script_path = os.path.abspath(script_path)
    
    if not os.path.exists(script_path):
        raise RuntimeError(f"Script not found: {script_path}")
    
    # Write JSON args to a temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
        json.dump(args, temp_file)
        temp_file_path = temp_file.name
    
    command = [f'/storage/AIML/MLDashboard/MLpipe-v2/venv/lib/python3.12/site-packages/pyspark/bin/spark-submit', "--master", f'spark://maa5rfispsmdb06:7077', script_path, temp_file_path]

    print(f"Executing command: {' '.join(command)}")
    print(f"Arguments written to: {temp_file_path}")
    print(f"Script path: {script_path}")
    print(f"Script exists: {os.path.exists(script_path)}")
    
    try:
        result = subprocess.run(command, env=env,capture_output=True, text=True)
    finally:
        try:
            os.unlink(temp_file_path)
        except OSError as e:
            print(f"Failed to delete temporary file {temp_file_path}: {e}")
    
    print(f"Return code: {result.returncode}")
    print(f"STDOUT: '{result.stdout}'")
    print(f"STDERR: '{result.stderr}'")
    
    if result.returncode != 0:
        error_msg = f"Spark job failed with return code {result.returncode}\n"
        error_msg += f"Command: {' '.join(command)}\n"
        error_msg += f"STDOUT: {result.stdout}\n"
        error_msg += f"STDERR: {result.stderr}\n"
        error_msg += f"Working directory: {os.getcwd()}"
        raise RuntimeError(error_msg)
    
    if not result.stdout.strip():
        raise RuntimeError(f"Spark job completed but produced no output. STDERR: {result.stderr}")
    
    # SIMPLE OUTPUT PARSING: Just pick the last meaningful print statement
    output_lines = result.stdout.strip().split('\n')
    
    # Filter out Spark logs and system messages, get the last meaningful line
    for line in reversed(output_lines):
        line = line.strip()
        if line and not any(keyword in line for keyword in [
            'WARNING:', 'WARN ', 'INFO ', 'DEBUG:', 'ERROR:',
            'Using Spark', 'Deleting directory', 'Shutdown hook',
            'Your hostname', 'Set SPARK_LOCAL_IP'
        ]):
            # This is our output - return it
            return line
    
    # Fallback: return the entire stdout if no meaningful line found
    return result.stdout.strip()

@activity.defn
async def node_2(args):
    import subprocess
    import json
    import os
    import tempfile
    import re
    
    script_path_key = "node-2"
    script_path = component_file_paths.get(script_path_key)
    
    if not script_path:
        raise RuntimeError(f"No script file path defined for component node-2")
    
    script_path = os.path.abspath(script_path)
    
    if not os.path.exists(script_path):
        raise RuntimeError(f"Script not found: {script_path}")
    
    # Write JSON args to a temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
        json.dump(args, temp_file)
        temp_file_path = temp_file.name
    
    command = [f'/storage/AIML/MLDashboard/MLpipe-v2/venv/lib/python3.12/site-packages/pyspark/bin/spark-submit', "--master", f'spark://maa5rfispsmdb06:7077', script_path, temp_file_path]

    print(f"Executing command: {' '.join(command)}")
    print(f"Arguments written to: {temp_file_path}")
    print(f"Script path: {script_path}")
    print(f"Script exists: {os.path.exists(script_path)}")
    
    try:
        result = subprocess.run(command, env=env, capture_output=True, text=True)
    finally:
        try:
            os.unlink(temp_file_path)
        except OSError as e:
            print(f"Failed to delete temporary file {temp_file_path}: {e}")
    
    print(f"Return code: {result.returncode}")
    print(f"STDOUT: '{result.stdout}'")
    print(f"STDERR: '{result.stderr}'")
    
    if result.returncode != 0:
        error_msg = f"Spark job failed with return code {result.returncode}\n"
        error_msg += f"Command: {' '.join(command)}\n"
        error_msg += f"STDOUT: {result.stdout}\n"
        error_msg += f"STDERR: {result.stderr}\n"
        error_msg += f"Working directory: {os.getcwd()}"
        raise RuntimeError(error_msg)
    
    if not result.stdout.strip():
        raise RuntimeError(f"Spark job completed but produced no output. STDERR: {result.stderr}")
    
    # SIMPLE OUTPUT PARSING: Just pick the last meaningful print statement
    output_lines = result.stdout.strip().split('\n')
    
    # Filter out Spark logs and system messages, get the last meaningful line
    for line in reversed(output_lines):
        line = line.strip()
        if line and not any(keyword in line for keyword in [
            'WARNING:', 'WARN ', 'INFO ', 'DEBUG:', 'ERROR:',
            'Using Spark', 'Deleting directory', 'Shutdown hook',
            'Your hostname', 'Set SPARK_LOCAL_IP'
        ]):
            # This is our output - return it
            return line
    
    # Fallback: return the entire stdout if no meaningful line found
    return result.stdout.strip()

@activity.defn
async def node_3(args):
    import subprocess
    import json
    import os
    import tempfile
    import re
    
    script_path_key = "node-3"
    script_path = component_file_paths.get(script_path_key)
    
    if not script_path:
        raise RuntimeError(f"No script file path defined for component node-3")
    
    script_path = os.path.abspath(script_path)
    
    if not os.path.exists(script_path):
        raise RuntimeError(f"Script not found: {script_path}")
    
    # Write JSON args to a temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
        json.dump(args, temp_file)
        temp_file_path = temp_file.name
    
    command = [f'/storage/AIML/MLDashboard/MLpipe-v2/venv/lib/python3.12/site-packages/pyspark/bin/spark-submit', "--master", f'spark://maa5rfispsmdb06:7077', script_path, temp_file_path]

    print(f"Executing command: {' '.join(command)}")
    print(f"Arguments written to: {temp_file_path}")
    print(f"Script path: {script_path}")
    print(f"Script exists: {os.path.exists(script_path)}")
    
    try:
        result = subprocess.run(command, env=env, capture_output=True, text=True)
    finally:
        try:
            os.unlink(temp_file_path)
        except OSError as e:
            print(f"Failed to delete temporary file {temp_file_path}: {e}")
    
    print(f"Return code: {result.returncode}")
    print(f"STDOUT: '{result.stdout}'")
    print(f"STDERR: '{result.stderr}'")
    
    if result.returncode != 0:
        error_msg = f"Spark job failed with return code {result.returncode}\n"
        error_msg += f"Command: {' '.join(command)}\n"
        error_msg += f"STDOUT: {result.stdout}\n"
        error_msg += f"STDERR: {result.stderr}\n"
        error_msg += f"Working directory: {os.getcwd()}"
        raise RuntimeError(error_msg)
    
    if not result.stdout.strip():
        raise RuntimeError(f"Spark job completed but produced no output. STDERR: {result.stderr}")
    
    # SIMPLE OUTPUT PARSING: Just pick the last meaningful print statement
    output_lines = result.stdout.strip().split('\n')
    
    # Filter out Spark logs and system messages, get the last meaningful line
    for line in reversed(output_lines):
        line = line.strip()
        if line and not any(keyword in line for keyword in [
            'WARNING:', 'WARN ', 'INFO ', 'DEBUG:', 'ERROR:',
            'Using Spark', 'Deleting directory', 'Shutdown hook',
            'Your hostname', 'Set SPARK_LOCAL_IP'
        ]):
            # This is our output - return it
            return line
    
    # Fallback: return the entire stdout if no meaningful line found
    return result.stdout.strip()

@workflow.defn
class Workflow_2:
    @workflow.run
    async def run(self, parameters: Dict[str, Any] = None):
        """Main workflow execution""" 
        results = {}
        
        # Clear workflow results for a clean run
        global workflow_results
        workflow_results.clear()
        
        # Setup logger
        logger = logging.getLogger("workflow")
        logger.info(f"Starting workflow execution with 3 nodes")

        try:
            # Execute node_1
            logger.info("Executing node_1")
            node_1_config = {'csv_path': {'fileName': 'unsupervised.csv', 'filePath': '/storage/AIML/MLDashboard/MLpipe-v2/csv/unsupervised.csv', 'fileSize': 0, 'fileType': '', 'isNewFile': False, 'isPathInput': True}}

            args = {"config": node_1_config, "id": 1, "results": None}
            node_1_result = await workflow.execute_activity(
                node_1,
                args,  # Pass all parameters as a single dict
                start_to_close_timeout=timedelta(minutes=30),
                retry_policy=RetryPolicy(
                    maximum_attempts=1,
                    initial_interval=timedelta(seconds=1)
                )
            )

            # Store result
            results["node-1"] = node_1_result
            workflow_results["node-1"] = node_1_result
            logger.info("Completed node_1")
        except Exception as e:
            logger.error(f"Error executing node_1: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise  # Re-raise to fail the workflow

        try:
            # Execute node_2
            logger.info("Executing node_2")
            node_2_config = {'columns': ['distance_from_home', 'distance_from_last_transaction', 'ratio_to_median_purchase_price', 'repeat_retailer', 'used_chip', 'used_pin_number', 'online_order'], 'parent_result': {'sourceName': 'Csv Reader', 'sourceNodeId': 'node-1', 'isPreviousOutput': True}}

            # This node uses output from a previous node: node-1
            # The activity will handle fetching the result from workflow_results

            args = {"config": node_2_config, "results": results, "id": 2}
            node_2_result = await workflow.execute_activity(
                node_2,
                args,  # Pass all parameters as a single dict
                start_to_close_timeout=timedelta(minutes=30),
                retry_policy=RetryPolicy(
                    maximum_attempts=1,
                    initial_interval=timedelta(seconds=1)
                )
            )

            # Store result
            results["node-2"] = node_2_result
            workflow_results["node-2"] = node_2_result
            logger.info("Completed node_2")
        except Exception as e:
            logger.error(f"Error executing node_2: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise  # Re-raise to fail the workflow

        try:
            # Execute node_3
            logger.info("Executing node_3")
            node_3_config = {'output_path': {'fileName': 'model', 'filePath': '/storage/AIML/MLDashboard/MLpipe-v2/model', 'fileSize': 0, 'fileType': '', 'isNewFile': False, 'isPathInput': True}, 'random_state': 42, 'contamination': 0.001, 'parent_result': {'sourceName': 'Column Selector', 'sourceNodeId': 'node-2', 'isPreviousOutput': True}}

            # This node uses output from a previous node: node-2
            # The activity will handle fetching the result from workflow_results

            args = {"config": node_3_config, "results": results, "id": 3}
            node_3_result = await workflow.execute_activity(
                node_3,
                args,  # Pass all parameters as a single dict
                start_to_close_timeout=timedelta(minutes=30),
                retry_policy=RetryPolicy(
                    maximum_attempts=1,
                    initial_interval=timedelta(seconds=1)
                )
            )

            # Store result
            results["node-3"] = node_3_result
            workflow_results["node-3"] = node_3_result
            logger.info("Completed node_3")
        except Exception as e:
            logger.error(f"Error executing node_3: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise  # Re-raise to fail the workflow

        # Return all results
        return results

async def main():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger = logging.getLogger("workflow_main")
    logger.info("Starting workflow")
    
    # Connect to Temporal server
    host = f'10.75.157.137:7233'
    namespace = f'default'
    task_queue = f'workflow-task-queue'
    
    logger.info(f"Connecting to Temporal server at {host} in namespace {namespace}")
    client = await Client.connect(host, namespace=namespace)
    
    # Define the activities to register
    activities = [node_1, node_2, node_3]
    
    logger.info(f"Registered {len(activities)} activities")
    
    # Start the worker
    async with Worker(
        client,
        task_queue=task_queue,
        workflows=[Workflow_2],
        activities=activities,
    ):
        logger.info(f"Worker started successfully on task queue: {task_queue}")
        
        # Execute the workflow
        workflow_handle = await client.start_workflow(
            Workflow_2.run,
            id=f"workflow-2-{int(asyncio.get_event_loop().time())}",
            task_queue=task_queue,
        )
        
        logger.info(f"Started workflow with ID: {workflow_handle.id}")
        
        # Wait for workflow completion and return the result
        try:
            result = await workflow_handle.result()
            logger.info(f"Workflow completed with result: {result}")
            return result
        except Exception as e:
            logger.error(f"Workflow failed: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise

if __name__ == "__main__":
    logger = logging.getLogger("workflow_main")
    try:
        result = asyncio.run(main())
        # Extract results
        logger.info(f"Workflow result: {result}")
        with open("workflow_result.json", "w") as f:
            json.dump(result, f, indent=2)
        logger.info("Workflow result saved to workflow_result.json")
    except Exception as e:
        logger.error(f"Error running workflow: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        import sys
        sys.exit(1)