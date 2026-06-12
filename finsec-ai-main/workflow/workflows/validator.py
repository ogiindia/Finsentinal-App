import json
import logging
from typing import Dict, Any, List
from .models import ValidationResult, ValidationError
from .config import MIN_NODES_REQUIRED, MAX_NODES_ALLOWED, MAX_EDGES_ALLOWED

logger = logging.getLogger('workflows_validator')

class WorkflowValidator:
    """Validates workflow configurations"""
    
    def __init__(self):
        pass
    
    def validate_workflow(self, config: Dict[str, Any]) -> ValidationResult:
        """
        Validate workflow configuration with detailed checking
        
        Args:
            config: Workflow configuration
            
        Returns:
            ValidationResult: Validation result with status and messages
        """
        logger.info("Validating workflow configuration")
        
        errors = []
        warnings = []
        
        # Check if configuration exists
        if not config:
            logger.error("Workflow configuration is empty")
            return ValidationResult(
                valid=False,
                message="Workflow configuration is empty",
                errors=["Configuration is required"]
            )
        
        # Validate nodes
        nodes_result = self._validate_nodes(config)
        if not nodes_result.valid:
            errors.extend(nodes_result.errors or [])
        else:
            warnings.extend(nodes_result.warnings or [])
        
        # Validate edges
        edges_result = self._validate_edges(config)
        if not edges_result.valid:
            errors.extend(edges_result.errors or [])
        else:
            warnings.extend(edges_result.warnings or [])
        
        # Cross-validation between nodes and edges
        if nodes_result.valid and edges_result.valid:
            cross_result = self._validate_node_edge_consistency(config)
            if not cross_result.valid:
                errors.extend(cross_result.errors or [])
            else:
                warnings.extend(cross_result.warnings or [])
        
        # Determine overall validity
        is_valid = len(errors) == 0
        
        if is_valid:
            message = "Workflow configuration is valid"
            if warnings:
                message += f" (with {len(warnings)} warnings)"
        else:
            message = f"Workflow configuration is invalid ({len(errors)} errors)"
        
        logger.info(f"Validation result: {message}")
        
        return ValidationResult(
            valid=is_valid,
            message=message,
            errors=errors if errors else None,
            warnings=warnings if warnings else None
        )
    
    def _validate_nodes(self, config: Dict[str, Any]) -> ValidationResult:
        """Validate nodes in the configuration"""
        nodes = config.get("nodes")
        
        if nodes is None:
            return ValidationResult(
                valid=False,
                message="Missing nodes in workflow configuration",
                errors=["Nodes array is required"]
            )
        
        if not isinstance(nodes, list):
            return ValidationResult(
                valid=False,
                message="Nodes must be a list",
                errors=[f"Nodes must be a list, got {type(nodes).__name__}"]
            )
        
        if len(nodes) < MIN_NODES_REQUIRED:
            return ValidationResult(
                valid=False,
                message=f"At least {MIN_NODES_REQUIRED} node is required",
                errors=[f"Workflow must have at least {MIN_NODES_REQUIRED} node(s)"]
            )
        
        if len(nodes) > MAX_NODES_ALLOWED:
            return ValidationResult(
                valid=False,
                message=f"Too many nodes (maximum {MAX_NODES_ALLOWED})",
                errors=[f"Workflow cannot have more than {MAX_NODES_ALLOWED} nodes"]
            )
        
        # Validate individual nodes
        errors = []
        warnings = []
        node_ids = set()
        
        for i, node in enumerate(nodes):
            if not isinstance(node, dict):
                errors.append(f"Node {i} must be an object")
                continue
            
            # Check required node fields
            node_id = node.get("id")
            if not node_id:
                errors.append(f"Node {i} missing required 'id' field")
                continue
            
            # Check for duplicate node IDs
            if node_id in node_ids:
                errors.append(f"Duplicate node ID: {node_id}")
            else:
                node_ids.add(node_id)
            
            # Check node data structure
            if "data" not in node:
                warnings.append(f"Node {node_id} missing 'data' field")
            else:
                node_data = node["data"]
                if not isinstance(node_data, dict):
                    warnings.append(f"Node {node_id} 'data' should be an object")
                else:
                    # Check for component information
                    if "componentId" not in node_data:
                        warnings.append(f"Node {node_id} missing componentId in data")
                    if "componentName" not in node_data:
                        warnings.append(f"Node {node_id} missing componentName in data")
        
        is_valid = len(errors) == 0
        
        logger.info(f"Node validation: {len(nodes)} nodes, {len(errors)} errors, {len(warnings)} warnings")
        
        return ValidationResult(
            valid=is_valid,
            message=f"Validated {len(nodes)} nodes",
            errors=errors if errors else None,
            warnings=warnings if warnings else None
        )
    
    def _validate_edges(self, config: Dict[str, Any]) -> ValidationResult:
        """Validate edges in the configuration"""
        edges = config.get("edges")
        
        # Accept missing edges (single node workflows)
        if edges is None:
            logger.info("No edges array found, adding empty edges array")
            config["edges"] = []
            return ValidationResult(
                valid=True,
                message="Added empty edges array to configuration",
                warnings=["No edges defined - single node workflow"]
            )
        
        if not isinstance(edges, list):
            return ValidationResult(
                valid=False,
                message="Edges must be a list",
                errors=[f"Edges must be a list, got {type(edges).__name__}"]
            )
        
        if len(edges) > MAX_EDGES_ALLOWED:
            return ValidationResult(
                valid=False,
                message=f"Too many edges (maximum {MAX_EDGES_ALLOWED})",
                errors=[f"Workflow cannot have more than {MAX_EDGES_ALLOWED} edges"]
            )
        
        # Validate individual edges
        errors = []
        warnings = []
        
        for i, edge in enumerate(edges):
            if not isinstance(edge, dict):
                errors.append(f"Edge {i} must be an object")
                continue
            
            # Check required edge fields
            source = edge.get("source")
            target = edge.get("target")
            
            if not source:
                errors.append(f"Edge {i} missing required 'source' field")
            if not target:
                errors.append(f"Edge {i} missing required 'target' field")
            
            # Check for self-loops
            if source == target:
                warnings.append(f"Edge {i} creates a self-loop from {source} to {target}")
        
        is_valid = len(errors) == 0
        
        logger.info(f"Edge validation: {len(edges)} edges, {len(errors)} errors, {len(warnings)} warnings")
        
        return ValidationResult(
            valid=is_valid,
            message=f"Validated {len(edges)} edges",
            errors=errors if errors else None,
            warnings=warnings if warnings else None
        )
    
    def _validate_node_edge_consistency(self, config: Dict[str, Any]) -> ValidationResult:
        """Validate consistency between nodes and edges"""
        nodes = config.get("nodes", [])
        edges = config.get("edges", [])
        
        # Get all node IDs
        node_ids = {node.get("id") for node in nodes if node.get("id")}
        
        errors = []
        warnings = []
        
        # Check if all edge sources and targets reference valid nodes
        for i, edge in enumerate(edges):
            source = edge.get("source")
            target = edge.get("target")
            
            if source and source not in node_ids:
                errors.append(f"Edge {i} references non-existent source node: {source}")
            
            if target and target not in node_ids:
                errors.append(f"Edge {i} references non-existent target node: {target}")
        
        # Check for isolated nodes (nodes with no connections)
        if len(edges) > 0:
            connected_nodes = set()
            for edge in edges:
                if edge.get("source"):
                    connected_nodes.add(edge["source"])
                if edge.get("target"):
                    connected_nodes.add(edge["target"])
            
            isolated_nodes = node_ids - connected_nodes
            if isolated_nodes:
                warnings.append(f"Isolated nodes detected: {', '.join(isolated_nodes)}")
        
        is_valid = len(errors) == 0
        
        logger.info(f"Consistency validation: {len(errors)} errors, {len(warnings)} warnings")
        
        return ValidationResult(
            valid=is_valid,
            message="Node-edge consistency validated",
            errors=errors if errors else None,
            warnings=warnings if warnings else None
        )

# Global instance
workflow_validator = WorkflowValidator()