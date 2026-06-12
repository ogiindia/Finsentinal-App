from typing import Dict, Any, List
import os
from sqlalchemy.orm import Session
from app import Component, SessionLocal
from ..config import SPARK_SUBMIT_PATH, SPARK_MASTER_URL, TEMPORAL_HOST, TEMPORAL_NAMESPACE, TEMPORAL_TASK_QUEUE, JAVA_HOME


def convert_config_booleans(obj):
    """Recursively convert string 'true'/'false' to Python booleans in any data structure."""
    if isinstance(obj, dict):
        return {key: convert_config_booleans(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_config_booleans(item) for item in obj]
    elif isinstance(obj, str):
        cleaned = obj.strip().lower()
        if cleaned == 'true':
            return True
        elif cleaned == 'false':
            return False
        else:
            return obj
    else:
        return obj

def indent_code(code: str, spaces: int) -> str:
    """Indent code by specified number of spaces"""
    lines = code.split('\n')
    indented_lines = []
    
    for line in lines:
        if line.strip():
            indented_lines.append(' ' * spaces + line)
        else:
            indented_lines.append('')
    
    return '\n'.join(indented_lines)


class WorkflowCodeGenerator:
    """Generates Temporal workflow code from workflow configuration"""
    
    def __init__(self):
        pass
    
    def generate_workflow_code(self, workflow_id: int, workflow_config: Dict[str, Any], 
                             workflow_name: str) -> str:
        """
        Generate Python code for Temporal workflow based on the workflow configuration
        
        Args:
            workflow_id: The workflow ID
            workflow_config: The workflow configuration containing nodes and edges
            workflow_name: The name of the workflow
            
        Returns:
            str: Generated Python code for the Temporal workflow
        """
        nodes = workflow_config.get("nodes", [])
        edges = workflow_config.get("edges", [])
        
        if not nodes:
            raise ValueError("Workflow must contain at least one node")
        
        # Build dependency and source maps
        node_map = {node["id"]: node for node in nodes}
        dependency_map, source_map = self._build_dependency_maps(edges)
        
        # Find start nodes (nodes with no dependencies)
        start_nodes = self._find_start_nodes(nodes, dependency_map)
        
        # Convert boolean configurations
        self._convert_node_configurations(nodes)
        
        # Generate the workflow code
        code = self._generate_imports_and_setup()
        code += self._generate_component_file_paths(nodes)
        code += self._generate_activities(nodes)
        code += self._generate_workflow_class(workflow_id, nodes, dependency_map, node_map, start_nodes)
        code += self._generate_main_function(workflow_id, nodes)
        
        return code
    
    def _build_dependency_maps(self, edges: List[Dict]) -> tuple:
        """Build dependency and source maps from edges"""
        dependency_map = {}
        source_map = {}
        
        for edge in edges:
            source = edge.get("source")
            target = edge.get("target")
            
            if source and target:
                if target not in dependency_map:
                    dependency_map[target] = []
                dependency_map[target].append(source)
                
                if source not in source_map:
                    source_map[source] = []
                source_map[source].append(target)
        
        return dependency_map, source_map
    
    def _find_start_nodes(self, nodes: List[Dict], dependency_map: Dict) -> List[str]:
        """Find nodes that have no dependencies (start nodes)"""
        start_nodes = []
        for node in nodes:
            node_id = node["id"]
            if node_id not in dependency_map:
                start_nodes.append(node_id)
        return start_nodes
    
    def _convert_node_configurations(self, nodes: List[Dict]):
        """Convert string boolean values to Python booleans in node configurations"""
        for node in nodes:
            node_data = node.get("data", {})
            component_data = node_data.get("componentData", {})
            if "config" in component_data:
                component_data["config"] = convert_config_booleans(component_data["config"])
    
    def _generate_imports_and_setup(self) -> str:
        """Generate imports and basic setup code"""
        return f"""import asyncio
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
workflow_results = {{}}
env = os.environ.copy()
env['JAVA_HOME'] = '{JAVA_HOME}'
# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
"""
    
    def _generate_component_file_paths(self, nodes: List[Dict]) -> str:
        """Generate component file path mappings"""
        component_file_paths = {}
        
        for node in nodes:
            node_id = node["id"]
            node_data = node.get("data", {})
            component_id = node_data.get("componentId")
            
            db = SessionLocal()
            try:
                component = db.query(Component).filter(Component.id == component_id).first()
                if component and component.file_path:
                    # Normalize path for cross-platform compatibility
                    normalized_path = os.path.normpath(component.file_path)
                    component_file_paths[node_id] = normalized_path
                else:
                    component_file_paths[node_id] = None
            finally:
                db.close()
        
        return f"\n# Component file paths\ncomponent_file_paths = {repr(component_file_paths)}\n"
    
    def _generate_activities(self, nodes: List[Dict]) -> str:
        """Generate activity functions for each node"""
        activities_code = ""
        
        for node in nodes:
            node_id = node["id"]
            node_name = f"{node_id.replace('-', '_')}"
            
            # Get node configuration for JAR path
            node_data = node.get("data", {})
            component_data = node_data.get("componentData", {})
            node_config = component_data.get("config", {})
            jar_path = node_config.get("upload_jar", {}).get("filePath") or node_config.get("jar_path",{}).get("filePath")
            
            activities_code += f"""
@activity.defn
async def {node_name}(args):
    import subprocess
    import json
    import os
    import tempfile
    import re
    
    script_path_key = "{node_id}"
    script_path = component_file_paths.get(script_path_key)
    
    if not script_path:
        raise RuntimeError(f"No script file path defined for component {node_id}")
    
    script_path = os.path.abspath(script_path)
    
    if not os.path.exists(script_path):
        raise RuntimeError(f"Script not found: {{script_path}}")
    
    # Write JSON args to a temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
        json.dump(args, temp_file)
        temp_file_path = temp_file.name
    
    command = [f'{SPARK_SUBMIT_PATH}', "--master", f'{SPARK_MASTER_URL}', script_path, temp_file_path]
"""
            
            if jar_path and isinstance(jar_path, str):
                normalized_jar_path = os.path.normpath(jar_path)
                activities_code += f"""
    # Add JAR file from node configuration
    jar_path = r"{normalized_jar_path}"
    if os.path.exists(jar_path):
        command.insert(3, "--jars")
        command.insert(4, jar_path)
        command.insert(5, "--driver-class-path")
        command.insert(6, jar_path)
        command.insert(7, "--conf")
        command.insert(8, f"spark.executor.extraClassPath={{jar_path}}")
        print(f"Using JAR file from config: {{jar_path}}")
    else:
        print(f"Warning: JAR file not found at {{jar_path}}")
"""
            
            activities_code += """
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
        error_msg = f"Spark job failed with return code {result.returncode}\\n"
        error_msg += f"Command: {' '.join(command)}\\n"
        error_msg += f"STDOUT: {result.stdout}\\n"
        error_msg += f"STDERR: {result.stderr}\\n"
        error_msg += f"Working directory: {os.getcwd()}"
        raise RuntimeError(error_msg)
    
    if not result.stdout.strip():
        raise RuntimeError(f"Spark job completed but produced no output. STDERR: {result.stderr}")
    
    # SIMPLE OUTPUT PARSING: Just pick the last meaningful print statement
    output_lines = result.stdout.strip().split('\\n')
    
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
"""
        
        return activities_code
    
    def _generate_workflow_class(self, workflow_id: int, nodes: List[Dict], 
                                dependency_map: Dict, node_map: Dict, start_nodes: List[str]) -> str:
        """Generate the main workflow class"""
        execution_order = self._build_execution_order(nodes, dependency_map, start_nodes, node_map)
        
        workflow_code = f"""
@workflow.defn
class Workflow_{workflow_id}:
    @workflow.run
    async def run(self, parameters: Dict[str, Any] = None):
        \"\"\"Main workflow execution\"\"\" 
        results = {{}}
        
        # Clear workflow results for a clean run
        global workflow_results
        workflow_results.clear()
        
        # Setup logger
        logger = logging.getLogger("workflow")
        logger.info(f"Starting workflow execution with {len(nodes)} nodes")
"""
        
        # Generate execution steps
        for i, node_id in enumerate(execution_order):
            node = node_map[node_id]
            node_name = f"{node_id.replace('-', '_')}"
            node_data = node.get("data", {})
            component_data = node_data.get("componentData", {})
            component_name = node_data.get("componentName", f"Component {node_id}")
            node_config = component_data.get("config", {})
            
            node_index = i + 1
            
            # Handle dependencies
            has_dependency = False
            if node_id in dependency_map:
                source_nodes = dependency_map[node_id]
                if source_nodes:
                    source_node_id = source_nodes[0]
                    
                    if "parent_result" not in node_config:
                        node_config["parent_result"] = {
                            "sourceName": component_name,
                            "sourceNodeId": source_node_id,
                            "isPreviousOutput": True
                        }
                    has_dependency = True
            
            if not has_dependency and i > 0:
                prev_node_id = execution_order[i-1]
                prev_component_name = node_map[prev_node_id].get("data", {}).get("componentName", f"Component {prev_node_id}")
                
                if "parent_result" not in node_config:
                    node_config["parent_result"] = {
                        "sourceName": prev_component_name,
                        "sourceNodeId": prev_node_id,
                        "isPreviousOutput": True
                    }
            
            workflow_code += f"""
        try:
            # Execute {node_name}
            logger.info("Executing {node_name}")
            {node_name}_config = {repr(node_config)}
"""
            
#             if "parent_result" in node_config and isinstance(node_config["parent_result"], dict) and node_config["parent_result"].get("isPreviousOutput"):
#                 source_id = node_config["parent_result"]["sourceNodeId"]
#                 workflow_code += f"""
#             # This node uses output from a previous node: {source_id}
#             # The activity will handle fetching the result from workflow_results
# """
            parent_result = node_config.get("parent_result", {})

            has_parent_mappings = (
                isinstance(parent_result, dict)
                and parent_result.get("isPreviousOutput") is True
                and isinstance(parent_result.get("mappings"), dict)
                and len(parent_result["mappings"]) > 0
            )




            if has_parent_mappings:
                workflow_code += f"""
                        # This node uses outputs from parent nodes: 
                        # {list(parent_result["mappings"].values())}
            """
            
            if i == 0:
                workflow_code += f"""
            args = {{"config": {node_name}_config, "id": {node_index}, "results": None}}
            {node_name}_result = await workflow.execute_activity(
                {node_name},
                args,  # Pass all parameters as a single dict
                start_to_close_timeout=timedelta(minutes=30),
                retry_policy=RetryPolicy(
                    maximum_attempts=1,
                    initial_interval=timedelta(seconds=1)
                )
            )
"""
            else:
                workflow_code += f"""
            args = {{"config": {node_name}_config, "results": results, "id": {node_index}}}
            {node_name}_result = await workflow.execute_activity(
                {node_name},
                args,  # Pass all parameters as a single dict
                start_to_close_timeout=timedelta(minutes=30),
                retry_policy=RetryPolicy(
                    maximum_attempts=1,
                    initial_interval=timedelta(seconds=1)
                )
            )
"""
            
            workflow_code += f"""
            # Store result
            results["{node_id}"] = {node_name}_result
            workflow_results["{node_id}"] = {node_name}_result
            logger.info("Completed {node_name}")
        except Exception as e:
            logger.error(f"Error executing {node_name}: {{str(e)}}")
            import traceback
            logger.error(traceback.format_exc())
            raise  # Re-raise to fail the workflow
"""
        
        workflow_code += """
        # Return all results
        return results
"""
        
        return workflow_code
    
    def _build_execution_order(self, nodes: List[Dict], dependency_map: Dict, 
                             start_nodes: List[str], node_map: Dict) -> List[str]:
        """Build the execution order based on dependencies"""
        execution_order = []
        visited = set()
        
        def visit_node(node_id):
            if node_id in visited:
                return
            
            visited.add(node_id)
            
            if node_id in dependency_map:
                for dep_id in dependency_map[node_id]:
                    visit_node(dep_id)
            
            execution_order.append(node_id)
        
        # Visit start nodes first
        for start_node in start_nodes:
            visit_node(start_node)
        
        # Visit any remaining nodes
        for node in nodes:
            node_id = node["id"]
            if node_id not in visited:
                visit_node(node_id)
        
        return execution_order
    
    def _generate_main_function(self, workflow_id: int, nodes: List[Dict]) -> str:
        """Generate the main function"""
        activity_names = [f"{node['id'].replace('-', '_')}" for node in nodes]
        
        return f"""
async def main():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger = logging.getLogger("workflow_main")
    logger.info("Starting workflow")
    
    # Connect to Temporal server
    host = f'{TEMPORAL_HOST}'
    namespace = f'{TEMPORAL_NAMESPACE}'
    task_queue = f'{TEMPORAL_TASK_QUEUE}'
    
    logger.info(f"Connecting to Temporal server at {{host}} in namespace {{namespace}}")
    client = await Client.connect(host, namespace=namespace)
    
    # Define the activities to register
    activities = [{", ".join(activity_names)}]
    
    logger.info(f"Registered {{len(activities)}} activities")
    
    # Start the worker
    async with Worker(
        client,
        task_queue=task_queue,
        workflows=[Workflow_{workflow_id}],
        activities=activities,
    ):
        logger.info(f"Worker started successfully on task queue: {{task_queue}}")
        
        # Execute the workflow
        workflow_handle = await client.start_workflow(
            Workflow_{workflow_id}.run,
            id=f"workflow-{workflow_id}-{{int(asyncio.get_event_loop().time())}}",
            task_queue=task_queue,
        )
        
        logger.info(f"Started workflow with ID: {{workflow_handle.id}}")
        
        # Wait for workflow completion and return the result
        try:
            result = await workflow_handle.result()
            logger.info(f"Workflow completed with result: {{result}}")
            return result
        except Exception as e:
            logger.error(f"Workflow failed: {{str(e)}}")
            import traceback
            logger.error(traceback.format_exc())
            raise

if __name__ == "__main__":
    logger = logging.getLogger("workflow_main")
    try:
        result = asyncio.run(main())
        # Extract results
        logger.info(f"Workflow result: {{result}}")
        with open("workflow_result.json", "w") as f:
            json.dump(result, f, indent=2)
        logger.info("Workflow result saved to workflow_result.json")
    except Exception as e:
        logger.error(f"Error running workflow: {{str(e)}}")
        import traceback
        logger.error(traceback.format_exc())
        import sys
        sys.exit(1)"""

# Global instance
code_generator = WorkflowCodeGenerator()