// src/services/temporalService.js - Cleaned and focused on Temporal operations
import axios from 'axios';

const API_BASE = '/api/temporal';

/**
 * Service for interacting with Temporal API endpoints
 */
const temporalService = {
  /**
   * Check connection to Temporal
   */
  async checkConnection() {
    try {
      const response = await axios.get(`${API_BASE}/health`);
      return response.data;
    } catch (error) {
      console.error('Error checking Temporal connection:', error);
      throw error;
    }
  },

  /**
   * Get comprehensive Temporal status
   */
  async getStatus() {
    try {
      const response = await axios.get(`${API_BASE}/status`);
      return response.data;
    } catch (error) {
      console.error('Error getting Temporal status:', error);
      throw error;
    }
  },

  /**
   * Execute a workflow with Temporal
   */
  async executeWorkflow(workflowId, parameters = {}) {
    try {
      const response = await axios.post(`${API_BASE}/execute-workflow/${workflowId}`, parameters, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error executing workflow ${workflowId} with Temporal:`, error);
      throw error;
    }
  },

  /**
   * Get workflow execution status
   */
  async getExecutionStatus(workflowId) {
    try {
      const response = await axios.get(`${API_BASE}/workflow/${workflowId}/execution-status`);
      return response.data;
    } catch (error) {
      console.error(`Error getting execution status for workflow ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Stop workflow execution
   */
  async stopExecution(workflowId) {
    try {
      const response = await axios.post(`${API_BASE}/workflow/${workflowId}/stop-execution`);
      return response.data;
    } catch (error) {
      console.error(`Error stopping execution for workflow ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Get workflow logs
   */
  async getWorkflowLogs(workflowId, limit = 100) {
    try {
      const response = await axios.get(`${API_BASE}/workflow/${workflowId}/logs`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error(`Error getting logs for workflow ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Clear workflow logs
   */
  async clearWorkflowLogs(workflowId) {
    try {
      const response = await axios.post(`${API_BASE}/workflow/${workflowId}/logs/clear`);
      return response.data;
    } catch (error) {
      console.error(`Error clearing logs for workflow ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Download workflow logs as a file
   */
  async downloadWorkflowLogs(workflowId) {
    try {
      const response = await axios.get(`${API_BASE}/workflow/${workflowId}/logs/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error(`Error downloading logs for workflow ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Create a WebSocket connection for real-time logs
   */
  createLogWebSocket(workflowId, onMessage, onError = null, onClose = null) {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}${API_BASE}/workflow/${workflowId}/logs/ws`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const logEntry = JSON.parse(event.data);
          onMessage(logEntry);
        } catch (error) {
          console.error('Error parsing log message:', error);
          if (onError) onError(error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (onClose) onClose(event);
      };
      
      return ws;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      if (onError) onError(error);
      throw error;
    }
  },

  /**
   * Helper method to download logs as a file with a proper filename
   */
  async downloadLogsAsFile(workflowId, workflowName = null) {
    try {
      const blob = await this.downloadWorkflowLogs(workflowId);
      
      // Create a filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const name = workflowName ? workflowName.replace(/[^a-zA-Z0-9]/g, '_') : `workflow_${workflowId}`;
      const filename = `${name}_logs_${timestamp}.log`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
    } catch (error) {
      console.error('Error downloading logs as file:', error);
      throw error;
    }
  },

  /**
   * Utility method to format execution status for display
   */
  formatExecutionStatus(status) {
    const statusMap = {
      'NOT_STARTED': { label: 'Not Started', color: '#6c757d', icon: 'fas fa-circle' },
      'RUNNING': { label: 'Running', color: '#28a745', icon: 'fas fa-play' },
      'COMPLETED': { label: 'Completed', color: '#17a2b8', icon: 'fas fa-check' },
      'FAILED': { label: 'Failed', color: '#dc3545', icon: 'fas fa-times' },
      'STOPPED': { label: 'Stopped', color: '#6c757d', icon: 'fas fa-stop' },
      'TIMEOUT': { label: 'Timeout', color: '#ffc107', icon: 'fas fa-clock' }
    };

    return statusMap[status] || { 
      label: status || 'Unknown', 
      color: '#6c757d', 
      icon: 'fas fa-question-circle' 
    };
  },

  /**
   * Utility method to check if a workflow is currently executing
   */
  isExecuting(status) {
    return status === 'RUNNING';
  },

  /**
   * Utility method to check if a workflow can be executed
   */
  canExecute(status) {
    return !this.isExecuting(status);
  },

  /**
   * Utility method to check if a workflow can be stopped
   */
  canStop(status) {
    return this.isExecuting(status);
  }
};

export default temporalService;