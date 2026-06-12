// src/components/WorkflowList.jsx - Updated for VS Code Layout
import React, { useState, useEffect } from 'react';
import './Modal.css';
// import  API_BASE_URL_WORKFLOW  from '../services/serviceURL';

const WorkflowList = ({ onWorkflowClick, onExecute, onShowLogs }) => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [executingWorkflows, setExecutingWorkflows] = useState(new Set());
  const [workflowStatuses, setWorkflowStatuses] = useState({});
const API_BASE_URL_WORKFLOW = 'http://localhost:8002/workflow';


  useEffect(() => {
    fetchWorkflows();
    
    // Set up periodic status updates for executing workflows
    const statusInterval = setInterval(() => {
      updateWorkflowStatuses();
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(statusInterval);
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL_WORKFLOW}/workflows`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setWorkflows(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching workflows:', err);
      setError('Failed to load workflows. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateWorkflowStatuses = async () => {
    // Only check status for executing workflows
    const executingArray = Array.from(executingWorkflows);
    
    for (const workflowId of executingArray) {
      try {
        const response = await fetch(`${API_BASE_URL_WORKFLOW}/temporal/workflow/${workflowId}/execution-status`);
        const data = await response.json();
        
        setWorkflowStatuses(prev => ({
          ...prev,
          [workflowId]: data.status
        }));
        
        // If workflow is no longer running, remove from executing set
        if (data.status !== 'RUNNING') {
          setExecutingWorkflows(prev => {
            const newSet = new Set(prev);
            newSet.delete(workflowId);
            return newSet;
          });
        }
      } catch (error) {
        console.error(`Error checking status for workflow ${workflowId}:`, error);
      }
    }
  };

  const executeWorkflow = async (workflowId) => {
    try {
      // Add to executing set
      setExecutingWorkflows(prev => new Set([...prev, workflowId]));
      setWorkflowStatuses(prev => ({ ...prev, [workflowId]: 'STARTING' }));
      
      const response = await fetch(`${API_BASE_URL_WORKFLOW}/temporal/execute-workflow/${workflowId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Empty parameters for now
      });

      const result = await response.json();
      
      if (result.success) {
        // Update status
        setWorkflowStatuses(prev => ({ ...prev, [workflowId]: 'RUNNING' }));
        
        // Show success message
        console.log(`Workflow ${workflowId} started successfully!`);
        
        // Call onExecute callback to show logs
        const workflow = workflows.find(w => w.id === workflowId);
        if (onExecute && workflow) {
          onExecute(workflow);
        }
      } else {
        throw new Error(result.message || 'Failed to execute workflow');
      }
    } catch (err) {
      console.error('Error executing workflow:', err);
      alert(`Failed to execute workflow: ${err.message}`);
      
      // Remove from executing set on error
      setExecutingWorkflows(prev => {
        const newSet = new Set(prev);
        newSet.delete(workflowId);
        return newSet;
      });
      setWorkflowStatuses(prev => ({ ...prev, [workflowId]: 'FAILED' }));
    }
  };

  const deleteWorkflow = async (workflowId, workflowName) => {
    if (!window.confirm(`Are you sure you want to delete workflow "${workflowName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL_WORKFLOW}/workflows/${workflowId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Remove the workflow from the list
        setWorkflows(prev => prev.filter(w => w.id !== workflowId));
        alert(`Workflow "${workflowName}" deleted successfully.`);
      } else {
        throw new Error(result.message || 'Failed to delete workflow');
      }
    } catch (err) {
      console.error('Error deleting workflow:', err);
      alert(`Failed to delete workflow: ${err.message}`);
    }
  };

  const stopWorkflow = async (workflowId) => {
    try {
      const response = await fetch(`${API_BASE_URL_WORKFLOW}/temporal/workflow/${workflowId}/stop-execution`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Remove from executing set
        setExecutingWorkflows(prev => {
          const newSet = new Set(prev);
          newSet.delete(workflowId);
          return newSet;
        });
        
        setWorkflowStatuses(prev => ({ ...prev, [workflowId]: 'STOPPED' }));
        alert('Workflow stopped successfully!');
      } else {
        alert(`Failed to stop workflow: ${result.message}`);
      }
    } catch (error) {
      console.error('Error stopping workflow:', error);
      alert('Failed to stop workflow');
    }
  };

  const showWorkflowLogs = (workflow) => {
    if (onShowLogs) {
      onShowLogs(workflow);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getWorkflowStatus = (workflowId) => {
    if (executingWorkflows.has(workflowId)) {
      return workflowStatuses[workflowId] || 'RUNNING';
    }
    return workflowStatuses[workflowId] || 'IDLE';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'RUNNING':
        return '#28a745';
      case 'STARTING':
        return '#ffc107';
      case 'COMPLETED':
        return '#17a2b8';
      case 'FAILED':
        return '#dc3545';
      case 'STOPPED':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'RUNNING':
        return 'fas fa-play';
      case 'STARTING':
        return 'fas fa-clock';
      case 'COMPLETED':
        return 'fas fa-check';
      case 'FAILED':
        return 'fas fa-times';
      case 'STOPPED':
        return 'fas fa-stop';
      default:
        return 'fas fa-circle';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          width: '1.5rem',
          height: '1.5rem',
          border: '0.2em solid #4e73df',
          borderRightColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Loading workflows...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <div style={{ color: '#dc3545', marginBottom: '0.5rem' }}>
          <i className="fas fa-exclamation-circle" style={{ fontSize: '1.5rem' }}></i>
        </div>
        <p style={{ color: '#dc3545', fontSize: '0.85rem' }}>{error}</p>
        <button 
          onClick={fetchWorkflows}
          style={{
            marginTop: '0.5rem',
            padding: '0.375rem 0.75rem',
            backgroundColor: '#4e73df',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Actions */}
      <div style={{ 
        padding: '0.75rem', 
        borderBottom: '1px solid #e9ecef',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <button 
          onClick={updateWorkflowStatuses}
          style={{
            padding: '0.375rem 0.75rem',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem'
          }}
        >
          <i className="fas fa-sync-alt"></i>
          Update
        </button>
        <button 
          onClick={fetchWorkflows}
          style={{
            padding: '0.375rem 0.75rem',
            backgroundColor: '#4e73df',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem'
          }}
        >
          <i className="fas fa-sync-alt"></i>
          Refresh
        </button>
      </div>

      {/* Workflow List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
        {workflows.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '0.5rem',
            border: '1px solid #e9ecef'
          }}>
            <i className="fas fa-folder-open" style={{ fontSize: '2rem', color: '#6c757d', marginBottom: '0.75rem' }}></i>
            <h5 style={{ color: '#6c757d', fontSize: '1rem' }}>No workflows found</h5>
            <p style={{ color: '#6c757d', fontSize: '0.85rem' }}>Create your first workflow using the editor.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {workflows.map((workflow) => {
              const status = getWorkflowStatus(workflow.id);
              const isExecuting = executingWorkflows.has(workflow.id);
              
              return (
                <div 
                  key={workflow.id}
                  style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '0.375rem',
                    padding: '1rem',
                    backgroundColor: 'white',
                    boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => onWorkflowClick(workflow.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0.25rem 0.5rem rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Status indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.7rem',
                    color: getStatusColor(status),
                    fontWeight: '500'
                  }}>
                    <i className={`${getStatusIcon(status)} ${status === 'RUNNING' ? 'fa-pulse' : ''}`}></i>
                    {status}
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <h6 style={{ 
                      margin: '0 0 0.375rem 0', 
                      color: '#495057',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}>
                      <i className="fas fa-project-diagram" style={{ color: '#4e73df' }}></i>
                      {workflow.name}
                    </h6>
                    
                    {workflow.description && (
                      <p style={{ 
                        margin: '0 0 0.375rem 0', 
                        color: '#6c757d', 
                        fontSize: '0.8rem' 
                      }}>
                        {workflow.description}
                      </p>
                    )}
                    
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6c757d',
                      display: 'flex',
                      gap: '0.75rem',
                      flexWrap: 'wrap'
                    }}>
                      <span>
                        <i className="fas fa-cubes" style={{ marginRight: '0.2rem' }}></i>
                        {workflow.node_count} nodes
                      </span>
                      <span>
                        <i className="fas fa-arrows-alt" style={{ marginRight: '0.2rem' }}></i>
                        {workflow.edge_count} connections
                      </span>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    gap: '0.375rem',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        executeWorkflow(workflow.id);
                      }}
                      disabled={isExecuting}
                      style={{
                        padding: '0.375rem 0.75rem',
                        backgroundColor: isExecuting ? '#6c757d' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: isExecuting ? 'not-allowed' : 'pointer',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                      }}
                      title={isExecuting ? 'Workflow Running' : 'Execute Workflow'}
                    >
                      {isExecuting ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          {status === 'STARTING' ? 'Starting' : 'Running'}
                        </>
                      ) : (
                        <>
                          <i className="fas fa-play"></i>
                          Execute
                        </>
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showWorkflowLogs(workflow);
                      }}
                      style={{
                        padding: '0.375rem 0.5rem',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                      title="View Logs"
                    >
                      <i className="fas fa-file-alt"></i>
                    </button>

                    {isExecuting && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          stopWorkflow(workflow.id);
                        }}
                        style={{
                          padding: '0.375rem 0.5rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                        title="Stop Workflow"
                      >
                        <i className="fas fa-stop"></i>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWorkflow(workflow.id, workflow.name);
                      }}
                      disabled={isExecuting}
                      style={{
                        padding: '0.375rem 0.5rem',
                        backgroundColor: isExecuting ? '#6c757d' : '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: isExecuting ? 'not-allowed' : 'pointer',
                        fontSize: '0.75rem'
                      }}
                      title="Delete Workflow"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default WorkflowList;