import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  addEdge,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Sidebar } from './component/Sidebar';
import { NotificationSystem } from './component/NotificationSystem';
import { CreatePipelineModal } from './component/modals/CreatePipelineModal';
import { CustomNode } from './component/CustomNode';
import { WorkflowComponentNode } from './component/workflowComponentNode';
import { ComponentCreationForm } from './component/ComponentCreationForm';
import WorkflowList from './component/WorkflowList';
import WorkflowLogs from './component/WorkflowLogs';
import componentService from './services/componentService';
import './WorkflowApp.css';
import './component/components.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import ConsoleLogger from './component/ConsoleLogger';
import { Nav, Accordion, Card, Container } from 'react-bootstrap';
import { FaChevronDown } from 'react-icons/fa';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Workflow, Cable } from 'lucide-react';
import { color } from 'd3';

const nodeTypes = {
  customNode: CustomNode,
  workflowNode: WorkflowComponentNode,
};

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [createPipelineModalOpen, setCreatePipelineModalOpen] = useState(false);
  const [componentCreationModalOpen, setComponentCreationModalOpen] = useState(false);
  const [componentToEdit, setComponentToEdit] = useState(null);

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  const [notifications, setNotifications] = useState([]);

  const [nodeData, setNodeData] = useState({});

  const componentCountRef = useRef(0);

  const [showLogger, setShowLogger] = useState(false);

  // New state for tracking node operations
  const [selectedNode, setSelectedNode] = useState(null);
  const [isEditingNode, setIsEditingNode] = useState(false);

  // VS Code-like layout states
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(true);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(300);
  const [leftPanelWidth, setLeftPanelWidth] = useState(350);
  const [rightPanelWidth, setRightPanelWidth] = useState(250);

  // State for logs
  const [showLogs, setShowLogs] = useState(false);
  const [selectedWorkflowForLogs, setSelectedWorkflowForLogs] = useState(null);

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    try {
      setLoading(true);
      const response = await componentService.getSections();
      setSections(response || []);
    } catch (error) {
      addNotification(`Error loading components: ${error.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, 5000);
  }, []);

  const onConnect = useCallback((params) => {
    // Check if we're creating a self-loop
    if (params.source === params.target) {
      addNotification('Cannot connect a node to itself', 'danger');
      return;
    }

    // Check for cyclic dependencies
    const wouldCreateCycle = (source, target, visited = new Set()) => {
      if (visited.has(target)) return false;
      visited.add(target);

      // Check if target connects back to source somewhere
      const outgoingEdges = edges.filter(e => e.source === target);
      for (const edge of outgoingEdges) {
        if (edge.target === source) return true;
        if (wouldCreateCycle(source, edge.target, visited)) return true;
      }

      return false;
    };

    if (wouldCreateCycle(params.source, params.target)) {
      addNotification('Cannot create cyclic dependencies in the workflow', 'danger');
      return;
    }

    // Add the edge
    setEdges(eds => addEdge({
      ...params,
      type: 'default',
      animated: true,
      style: { stroke: '#4e73df' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#4e73df',
      },
    }, eds));

    // Show notification of node connection
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);

    const sourceNodeNum = nodes.indexOf(sourceNode) + 1;
    const targetNodeNum = nodes.indexOf(targetNode) + 1;

    if (sourceNode && targetNode) {
      addNotification(
        `Connected Node ${sourceNodeNum} (${sourceNode.data.component?.name}) to Node ${targetNodeNum} (${targetNode.data.component?.name})`,
        'success'
      );
    }
  }, [setEdges, addNotification, nodes, edges]);

  const handleAddComponent = useCallback((componentInfo, position = calculateNodePosition()) => {
    const nodeId = `node-${++componentCountRef.current}`;

    const newNode = {
      id: nodeId,
      type: 'workflowNode',
      position,
      data: {
        component: componentInfo,
        componentData: {
          config: {},
          status: 'unconfigured'
        },
        onEdit: () => handleEditNode(nodeId),
        onDelete: () => handleDeleteNode(nodeId),
        onUpdate: handleUpdateNodeData,
        getNodes: () => nodes,
        getEdges: () => edges
      }
    };

    setNodes((prev) => [...prev, newNode]);

    const nodeNumber = nodes.length + 1;
    addNotification(`Added Node ${nodeNumber}: ${componentInfo.name}`, 'success');

    return nodeId;
  }, [setNodes, addNotification, nodes, edges]);

  // Update existing nodes when nodes/edges change
  useEffect(() => {
    setNodes(prevNodes =>
      prevNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          getNodes: () => nodes,
          getEdges: () => edges
        }
      }))
    );
  }, [nodes.length, edges.length, setNodes]);

  const calculateNodePosition = useCallback(() => {
    if (nodes.length === 0) {
      return { x: 300, y: 200 };
    }

    // If nodes exist, place new nodes in a grid-like pattern
    const numNodes = nodes.length;
    const nodesPerRow = 3;
    const row = Math.floor(numNodes / nodesPerRow);
    const col = numNodes % nodesPerRow;

    return {
      x: 300 + col * 250,
      y: 200 + row * 150
    };
  }, [nodes]);

  const handleUpdateNodeData = useCallback((nodeId, componentData) => {
    setNodes(nds => nds.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            componentData
          }
        };
      }
      return node;
    }));

    setNodeData(prev => ({
      ...prev,
      [nodeId]: componentData
    }));

    // Show notification about node configuration
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const nodeNumber = nodes.indexOf(node) + 1;
      const componentName = node.data.component?.name || 'Component';

      // Check if this is configuring parent node input
      const isUsingParentNode =
        componentData.config &&
        componentData.config.parent_result &&
        componentData.config.parent_result.isPreviousOutput;

      if (isUsingParentNode) {
        const parentResult = componentData?.config?.parent_result;
        const parentNodeIds = Object.values(parentResult?.mappings || {});

        if (parentNodeIds.length > 0) {
          const parentNode = nodes.find(n => n.id === parentNodeIds[0]);
          if (parentNode) {
            const parentNodeNumber = nodes.indexOf(parentNode) + 1;
            addNotification(
              `Node ${nodeNumber} (${componentName}) configured to use output from Node ${parentNodeNumber}`,
              'info'
            );
          }
        }
      } else {
        addNotification(`Node ${nodeNumber} (${componentName}) configured successfully`, 'success');
      }
    }
  }, [setNodes, addNotification, nodes]);

  const handleEditNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.data.onEdit) {
      node.data.onEdit();
    }

    // Set the selected node for easier reference
    setSelectedNode(node);
    setIsEditingNode(true);
  }, [nodes]);

  const handleDeleteNode = useCallback((nodeId) => {
    // Find the node to get its number for messaging
    const node = nodes.find(n => n.id === nodeId);
    const nodeNumber = node ? nodes.indexOf(node) + 1 : null;
    const componentName = node?.data.component?.name || 'Component';

    if (window.confirm(`Are you sure you want to delete Node ${nodeNumber} (${componentName})?`)) {
      // Check if other nodes depend on this one
      const dependentNodes = [];

      for (const n of nodes) {
        // Skip the node being deleted
        if (n.id === nodeId) continue;

        // Check if this node uses the node being deleted as its parent_result
        const parentResult = n.data?.componentData?.config?.parent_result;
        const parentIds = Object.values(parentResult?.mappings || {});

        if (parentIds.includes(nodeId)) {
          dependentNodes.push(n);
        }
      }

      // If there are dependent nodes, warn the user
      if (dependentNodes.length > 0) {
        const dependentNodeNames = dependentNodes.map(n => {
          const number = nodes.indexOf(n) + 1;
          return `Node ${number} (${n.data.component?.name || 'Component'})`;
        }).join(', ');

        const confirmation = window.confirm(
          `Warning: The following nodes depend on Node ${nodeNumber} (${componentName}):\n\n` +
          `${dependentNodeNames}\n\n` +
          `Deleting this node will break these dependencies. Continue anyway?`
        );

        if (!confirmation) return;

        // Update dependent nodes to remove the parent_result reference
        setNodes(nodes => nodes.map(n => {
          const parentResult = n.data?.componentData?.config?.parent_result;
          const parentIds = Object.values(parentResult?.mappings || {});

          if (parentIds.includes(nodeId)) {
            const newConfig = { ...n.data.componentData.config };
            delete newConfig.parent_result;

            return {
              ...n,
              data: {
                ...n.data,
                componentData: {
                  ...n.data.componentData,
                  config: newConfig
                }
              }
            };
          }

          return n;
        }));
      }

      // Delete the node
      setNodes(nodes => nodes.filter(n => n.id !== nodeId));

      // Delete any edges connected to this node
      setEdges(edges => edges.filter(e =>
        e.source !== nodeId && e.target !== nodeId
      ));

      // Remove node data
      setNodeData(prev => {
        const newData = { ...prev };
        delete newData[nodeId];
        return newData;
      });

      // Reset selected node if we're deleting it
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode(null);
        setIsEditingNode(false);
      }

      addNotification(`Node ${nodeNumber} (${componentName}) removed`, 'info');
    }
  }, [setNodes, setEdges, addNotification, nodes, selectedNode]);

  const clearCanvas = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      setNodes([]);
      setEdges([]);
      setNodeData({});
      setSelectedNode(null);
      setIsEditingNode(false);
      addNotification('Canvas cleared successfully', 'success');
    }
  }, [setNodes, setEdges, addNotification]);

  const handleOpenComponentCreation = useCallback(() => {
    setComponentToEdit(null);
    setComponentCreationModalOpen(true);
  }, []);

  const toggleLogger = () => {
    setShowLogger(prev => !prev);
  };

  const handleSaveComponent = useCallback(async (componentData) => {
    try {
      setLoading(true);

      if (componentToEdit) {
        await componentService.updateComponent(componentToEdit.id, componentData);
        addNotification(`Component "${componentData.name}" updated successfully`, 'success');
      } else {
        await componentService.createComponent(componentData);
        addNotification(`Component "${componentData.name}" created successfully`, 'success');
      }

      await fetchComponents();
      setComponentCreationModalOpen(false);

    } catch (error) {
      addNotification(`Error saving component: ${error.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  }, [componentToEdit, addNotification, fetchComponents]);

  const handleExportPipeline = useCallback(() => {
    setCreatePipelineModalOpen(true);
  }, []);

  const isExportEnabled = useCallback(() => {
    return nodes.length > 0;
  }, [nodes]);

  const handlePipelineSave = async (pipelineName, description = "") => {
    try {
      setLoading(true);

      console.log("Starting workflow save process...");

      if (nodes.length === 0) {
        console.log("Error: No nodes in workflow");
        alert("Cannot save empty workflow. Please add at least one component.");
        setLoading(false);
        setCreatePipelineModalOpen(false);
        return;
      }

      console.log(`Found ${nodes.length} nodes and ${edges.length} edges in the workflow`);

      // Verify all nodes are configured
      const unconfiguredNodes = nodes.filter(node => {
        return node.data.componentData.status !== 'configured';
      });

      if (unconfiguredNodes.length > 0) {
        const unconfiguredNodeNames = unconfiguredNodes.map(node => {
          const nodeNumber = nodes.indexOf(node) + 1;
          return `Node ${nodeNumber} (${node.data.component?.name || 'Unknown'})`;
        }).join(', ');

        const configurationConfirmation = window.confirm(
          `Warning: The following nodes are not configured:\n\n` +
          `${unconfiguredNodeNames}\n\n` +
          `It's recommended to configure all nodes before saving. Continue anyway?`
        );

        if (!configurationConfirmation) {
          setLoading(false);
          return;
        }
      }

      const pipelineData = {
        name: pipelineName,
        description: description,
        configuration: {
          nodes: nodes.map(node => {
            console.log(`Processing node: ${node.id}, type: ${node.type}`);
            return {
              id: node.id,
              type: node.type,
              position: node.position,
              data: {
                componentId: node.data.component?.id,
                componentData: node.data.componentData
              }
            };
          }),
          edges: edges.length > 0 ? edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            animated: edge.animated,
            style: edge.style
          })) : []
        }
      };

      console.log("Saving pipeline configuration:", JSON.stringify(pipelineData, null, 2));

      console.log("Sending request to save workflow...");
      const response = await componentService.savePipeline(pipelineData);

      console.log("Server response:", response);

      addNotification('Workflow saved successfully', 'success');
      setCreatePipelineModalOpen(false);

    } catch (error) {
      console.error('Error saving pipeline:', error);
      console.error('Error details:', error.response?.data?.detail || error.message);
      addNotification(`Error saving workflow: ${error.response?.data?.detail || error.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to load existing workflow
  const loadWorkflow = useCallback(async (workflowId) => {
    try {
      setLoading(true);
      console.log(`Loading workflow: ${workflowId}`);
      // Clear current canvas
      setNodes([]);
      setEdges([]);
      setNodeData({});
      // Load workflow from API
      const workflow = await componentService.getWorkflow(workflowId);

      if (!workflow || !workflow.configuration) {
        addNotification('Failed to load workflow: Invalid workflow data', 'danger');
        setLoading(false);
        return;
      }

      console.log('Loaded workflow:', workflow);
      // Extract nodes and edges from workflow configuration
      const { nodes: workflowNodes, edges: workflowEdges } = workflow.configuration;
      // Reset component counter to avoid node ID conflicts
      componentCountRef.current = workflowNodes.length;
      // Convert workflow nodes to ReactFlow nodes
      const newNodes = await Promise.all(workflowNodes.map(async (node) => {
        // Fetch component details if not already included
        let componentInfo = null;
        if (node.data && node.data.componentId) {
          try {
            componentInfo = await componentService.getComponent(node.data.componentId);
          } catch (error) {
            console.error(`Error fetching component ${node.data.componentId}:`, error);
          }
        }

        return {
          id: node.id,
          type: 'workflowNode',
          position: node.position,
          data: {
            component: componentInfo,
            componentData: node.data.componentData || { config: {}, status: 'unconfigured' },
            onEdit: () => handleEditNode(node.id),
            onDelete: () => handleDeleteNode(node.id),
            onUpdate: handleUpdateNodeData,
            getNodes: () => nodes,
            getEdges: () => edges
          }
        };
      }));

      // Convert workflow edges to ReactFlow edges
      const newEdges = workflowEdges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: true,
        style: { stroke: '#4e73df' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#4e73df',
        },
      }));

      // Set nodes and edges
      setNodes(newNodes);
      setEdges(newEdges);

      // Build node data from nodes
      const newNodeData = {};
      newNodes.forEach(node => {
        if (node.data && node.data.componentData) {
          newNodeData[node.id] = node.data.componentData;
        }
      });
      setNodeData(newNodeData);

      addNotification(`Workflow "${workflow.name}" loaded successfully`, 'success');

    } catch (error) {
      console.error('Error loading workflow:', error);
      addNotification(`Error loading workflow: ${error.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges, addNotification, handleEditNode, handleDeleteNode, handleUpdateNodeData, nodes, edges]);

  const renderAvailableComponents = useCallback((sections) => {
    return (
      <div style={{ padding: '1rem', overflowY: 'auto', height: '100%' }}>
        {/* <h5 className="mb-3">Components</h5> */}
        {sections.map((section, index) => (
          <div key={index} className="mb-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <i className="fas fa-chevron-down"></i>
              {section.name}
            </div>
            <div className="d-flex flex-wrap gap-2 ms-3">
              {section.components.map((component, compIndex) => (
                <OverlayTrigger
                  key={compIndex}
                  placement="top"
                  overlay={<Tooltip>{component.name}</Tooltip>}
                >
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/reactflow', JSON.stringify(component));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => handleAddComponent(component)}
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'grab',
                      // borderRadius: '4px',
                      // backgroundColor: '#ffffff',
                      // boxShadow: '0 0 2px rgba(0,0,0,0.1)'
                    }}
                  >
                    {component.icon_base64 ? (
                      <img
                        src={`data:image/png;base64,${component.icon_base64}`}
                        alt={component.name}
                        style={{ width: '30px', height: '30px' }}
                      />
                    ) : (
                      <i className={component.icon_class || "fas fa-puzzle-piece"}></i>
                    )}
                    <small></small>
                  </div>
                </OverlayTrigger>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }, [handleAddComponent]);

  // Handle workflow execution
  const handleWorkflowExecute = (workflow) => {
    setSelectedWorkflowForLogs(workflow);
    setShowLogs(true);
    setBottomPanelCollapsed(false);
  };

  // Handle showing logs
  const handleShowLogs = (workflow) => {
    setSelectedWorkflowForLogs(workflow);
    setShowLogs(true);
    setBottomPanelCollapsed(false);
  };

  return (
    <div className="app-container" style={{
      display: 'flex',
      flexDirection: 'column',

      overflow: 'hidden'
    }}>
      {/* Main Content Area */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Left Panel - Workflow List */}
        <div style={{
          width: leftPanelCollapsed ? '40px' : `${leftPanelWidth}px`,
          borderRight: '1px solid #e3e6f0',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f8f9fa',
          transition: 'width 0.3s ease',
          position: 'relative'
        }}>
          {/* Panel Header */}
          <div style={{
            padding: '0.5rem',
            borderBottom: '1px solid #e3e6f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#4bcd3e',
            color: 'white'
          }}>
            {/* <workflow style={{
              color:"#ffffff"
            }}/> */}
            {!leftPanelCollapsed && <h6 style={{ margin: 0, fontSize: '0.9rem', display:'flex', fontWeight:'1000'}}><Workflow/>Workflows</h6>}
            <button
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              <i className={`fas fa-chevron-${leftPanelCollapsed ? 'right' : 'left'}`}></i>
            </button>
          </div>

          {/* Panel Content */}
          {!leftPanelCollapsed && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <WorkflowList
                onWorkflowClick={loadWorkflow}
                onExecute={handleWorkflowExecute}
                onShowLogs={handleShowLogs}
              />
            </div>
          )}
        </div>

        {/* Center Panel - Canvas */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          {/* Toolbar */}
          <div style={{
            padding: '0.5rem 1rem',
            borderBottom: '1px solid #e3e6f0',
            backgroundColor: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <button
              onClick={handleExportPipeline}
              disabled={!isExportEnabled()}
              style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: isExportEnabled() ? '#4e73df' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: isExportEnabled() ? 'pointer' : 'not-allowed',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <i className="fas fa-save"></i>
              Save Workflow
            </button>

            <button
              onClick={clearCanvas}
              style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <i className="fas fa-trash"></i>
              Clear Canvas
            </button>
          </div>

          {/* React Flow Canvas */}
          <div
            style={{ flex: 1, position: 'relative' }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();

              const reactFlowBounds = event.currentTarget.getBoundingClientRect();
              const data = event.dataTransfer.getData('application/reactflow');
              if (!data) return;

              const componentInfo = JSON.parse(data);

              const position = {
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top
              };

              handleAddComponent(componentInfo, position);
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>
        </div>

        {/* Right Panel - Components */}
        <div style={{
          width: rightPanelCollapsed ? '40px' : `${rightPanelWidth}px`,
          borderLeft: '1px solid #e3e6f0',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f8f9fa',
          transition: 'width 0.3s ease',
          position: 'relative'
        }}>
          {/* Panel Header */}
          <div style={{
            padding: '0.5rem',
            borderBottom: '1px solid #e3e6f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#4bcd3e',
            color: 'white'
          }}>
            <button
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              <i className={`fas fa-chevron-${rightPanelCollapsed ? 'left' : 'right'}`}></i>
            </button>
            {!rightPanelCollapsed && (
              <>
                <h6 style={{ margin: 0, fontSize: '0.9rem', flex:1 ,display:'flex', fontWeight:'1000'}}><Cable />Components</h6>
                <button
                  onClick={handleOpenComponentCreation}
                  style={{
                    background: 'white',
                    color: '#4e73df',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-plus"></i> Create
                </button>
              </>
            )}
          </div>

          {/* Panel Content */}
          {!rightPanelCollapsed && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              {sections.length === 0 ? (
                <div className="text-center p-3 text-muted">
                  <i className="fas fa-info-circle me-2"></i>
                  No components available. Click "Create" to add a component.
                </div>
              ) : (
                renderAvailableComponents(sections)
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Panel - Logs */}
      {!bottomPanelCollapsed && (
        <div style={{
          height: `${bottomPanelHeight}px`,
          borderTop: '1px solid #e3e6f0',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f8f9fa',
          position: 'relative'
        }}>
          {/* Panel Header */}
          <div style={{
            padding: '0.5rem',
            borderBottom: '1px solid #e3e6f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#012834',
            color: 'white'
          }}>
            <h6 style={{ margin: 0, fontSize: '0.9rem' }}>
              Logs {selectedWorkflowForLogs ? `- ${selectedWorkflowForLogs.name}` : ''}
            </h6>
            <button
              onClick={() => setBottomPanelCollapsed(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              <i className="fas fa-chevron-down"></i>
            </button>
          </div>

          {/* Panel Content */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {showLogs && selectedWorkflowForLogs ? (
              <WorkflowLogs
                isOpen={true}
                onClose={() => {
                  setShowLogs(false);
                  setSelectedWorkflowForLogs(null);
                  setBottomPanelCollapsed(true);
                }}
                workflowId={selectedWorkflowForLogs.id}
                workflowName={selectedWorkflowForLogs.name}
                embedded={true}
              />
            ) : (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6c757d'
              }}>
                <i className="fas fa-file-alt" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
                <p>No workflow logs to display. Execute a workflow to see logs here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Panel Collapsed State */}
      {bottomPanelCollapsed && showLogs && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#012834',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '0.25rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 1000
        }}
          onClick={() => setBottomPanelCollapsed(false)}
        >
          <i className="fas fa-chevron-up"></i>
          Show Logs {selectedWorkflowForLogs ? `- ${selectedWorkflowForLogs.name}` : ''}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner-container">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Processing...</p>
          </div>
        </div>
      )}

      <NotificationSystem notifications={notifications} />

      {createPipelineModalOpen && (
        <CreatePipelineModal
          isOpen={createPipelineModalOpen}
          onClose={() => setCreatePipelineModalOpen(false)}
          onSave={handlePipelineSave}
          isLoading={loading}
        />
      )}

      {componentCreationModalOpen && (
        <ComponentCreationForm
          isOpen={componentCreationModalOpen}
          onClose={() => setComponentCreationModalOpen(false)}
          onSave={handleSaveComponent}
          initialData={componentToEdit}
        />
      )}
      <ConsoleLogger visible={showLogger} />
    </div>
  );
}

export default App;