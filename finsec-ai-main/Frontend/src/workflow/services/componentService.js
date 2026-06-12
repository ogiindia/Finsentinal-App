// src/services/componentService.js - Fixed version with proper parameter mapping
import axios from 'axios';
import CryptoJS from 'crypto-js';

const API_URL = 'http://localhost:8002/workflow'; // Base URL for API requests
const ENCRYPTION_KEY = 'your-secret-key-here'; // Should match backend key

// Create axios instance with common configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Service for component-related API requests
const componentService = {
  /**
   * NEW: Encrypt file path for secure transmission
   */
  encryptPath: (path) => {
    try {
      if (!path) return null;
      console.log("🔒 Encrypting path:", path);
      
      // Use CryptoJS AES encryption (compatible with backend)
      const encrypted = CryptoJS.AES.encrypt(path, ENCRYPTION_KEY).toString();
      console.log("🔒 Encrypted to:", encrypted);
      
      return encrypted;
    } catch (error) {
      console.error("❌ Encryption failed:", error);
      return path; // Fallback to original path
    }
  },

  /**
   * Get all sections with their components
   */
  getSections: async () => {
    try {
      const response = await apiClient.get('/sections');
      return response.data;
    } catch (error) {
      console.error('Error fetching sections:', error);
      throw error;
    }
  },
  
  /**
   * Get component by ID
   */
  getComponent: async (componentId) => {
    try {
      const response = await apiClient.get(`/components/${componentId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching component ${componentId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get component parameters (ENHANCED for REST API support)
   */
  getComponentParameters: async (componentId) => {
    console.log(componentId)
    try {
      const response = await apiClient.get(`/components/${componentId}/parameters`);
      const parameters = response.data;
      console.log('--------------------------------')
      console.log(response)
      console.log('--------------------------------')
      console.log(parameters)
      // Process REST API parameters to validate and enhance them
      if (parameters && parameters.parameters) {
        parameters.parameters = await componentService.processRestApiParameters(parameters.parameters);
      }
      console.log('-------------------------------->')
      console.log(parameters.parameters)
      console.log('-------------------------------->')
      console.log(parameters)
      return parameters;
    } catch (error) {
      console.error(`Error fetching component parameters for ${componentId}:`, error);
      throw error;
    }
  },

  /**
   * Process REST API parameters to validate configuration
   */
  processRestApiParameters: async (parameters) => {
    const processedParams = [];
    
    for (const param of parameters) {
      if (param.dataType === 'restapi') {
        // Validate REST API parameter configuration
        const validatedParam = componentService.validateRestApiParameter(param);
        processedParams.push(validatedParam);
      } else {
        processedParams.push(param);
      }
    }
    
    return processedParams;
  },

  /**
   * Validate REST API parameter configuration
   */
  validateRestApiParameter: (param) => {
    const validated = { ...param };
    
    // Set defaults
    if (!validated.apiMethod) {
      validated.apiMethod = 'GET';
    }
    
    if (!validated.displayType) {
      validated.displayType = 'dropdown';
    }
    
    // Validate required fields
    if (!validated.apiUrl) {
      console.warn(`REST API parameter "${validated.name}" missing API URL`);
    }
    
    if (!validated.labelField) {
      console.warn(`REST API parameter "${validated.name}" missing label field`);
    }
    
    // Set valueField to labelField if not specified
    if (!validated.valueField) {
      validated.valueField = validated.labelField;
    }
    
    return validated;
  },

  /**
   * Enhanced URL placeholder resolution with encryption and proper parameter extraction
   */
  resolveUrlPlaceholders: (url, parentConfig, targetParamName = null) => {
    let resolvedUrl = url;
    
    console.log("🔧 Resolving URL placeholders:");
    console.log("- Input URL:", url);
    console.log("- Parent config:", parentConfig);
    console.log("- Target parameter name:", targetParamName);
    
    // Handle simple {parent_output} - use priority order
    if (resolvedUrl.includes('{parent_output}')) {
      let defaultOutput;
      
      // Handle different types of parent config
      if (typeof parentConfig === 'string') {
        defaultOutput = parentConfig;
      } else if (typeof parentConfig === 'object' && parentConfig !== null) {
        // If we have a target parameter name, try to get that specific value
        if (targetParamName && parentConfig[targetParamName] !== undefined) {
          const targetValue = parentConfig[targetParamName];
          
          // Extract value from complex objects
          if (typeof targetValue === 'object' && targetValue !== null) {
            defaultOutput = targetValue.filePath || 
                           targetValue.output || 
                           targetValue.result || 
                           targetValue.value ||
                           targetValue.data ||
                           JSON.stringify(targetValue);
          } else {
            defaultOutput = String(targetValue);
          }
          
          console.log(`- Using specific parameter '${targetParamName}':`, defaultOutput);
        } else {
          // Fallback to priority order
          defaultOutput = parentConfig.filePath || 
                         parentConfig.output || 
                         parentConfig.result || 
                         parentConfig.data ||
                         JSON.stringify(parentConfig);
        }
      } else {
        defaultOutput = String(parentConfig || 'undefined');
      }
      
      console.log("- Default output resolved to:", defaultOutput);
      
      // Encrypt the path
      const encryptedPath = componentService.encryptPath(defaultOutput);
      console.log("- Encrypted path:", encryptedPath);
      
      // CRITICAL FIX: Convert path parameter to query parameter
      if (resolvedUrl.includes('/{parent_output}')) {
        // Remove the path parameter and add query parameter
        resolvedUrl = resolvedUrl.replace('/{parent_output}', `?path=${encodeURIComponent(encryptedPath)}`);
      } else if (resolvedUrl.includes('{parent_output}')) {
        // Handle case without leading slash
        resolvedUrl = resolvedUrl.replace('{parent_output}', `?path=${encodeURIComponent(encryptedPath)}`);
      }
      
      console.log("- URL after parameter conversion:", resolvedUrl);
    }
    
    // Handle specific parameter access: {parent_result.parameterName}
    const parameterPattern = /\/?\{parent_result\.([^}]+)\}/g;
    resolvedUrl = resolvedUrl.replace(parameterPattern, (match, paramName) => {
      console.log(`- Looking for parameter: ${paramName}`);
      
      if (typeof parentConfig === 'object' && parentConfig !== null) {
        const value = parentConfig[paramName];
        console.log(`- Found value for ${paramName}:`, value);
        
        if (value !== undefined && value !== null) {
          let extractedValue;
          
          if (typeof value === 'object' && value.filePath) {
            extractedValue = value.filePath;
          } else if (typeof value === 'string') {
            extractedValue = value;
          } else {
            extractedValue = String(value);
          }
          
          // Encrypt and encode for query parameter
          const encryptedValue = componentService.encryptPath(extractedValue);
          return `?path=${encodeURIComponent(encryptedValue)}`;
        }
      }
      
      console.warn(`Parameter '${paramName}' not found in parent config:`, Object.keys(parentConfig || {}));
      return '?path=undefined';
    });
    
    console.log("- Final resolved URL:", resolvedUrl);
    return resolvedUrl;
  },

  /**
   * Enhanced API parameter data fetching with targeted parameter extraction
   */
  fetchApiParameterData: async (paramConfig, parentOutput = null, additionalData = {}) => {
    try {
      let finalUrl = paramConfig.apiUrl;
      
      console.log("🔍 API Data Fetch:");
      console.log("- Original URL:", finalUrl);
      console.log("- Parent output:", parentOutput);
      console.log("- Parameter config:", paramConfig);
      
      // Handle different placeholder patterns
      if (finalUrl.includes('{parent_output}') || finalUrl.includes('{parent_result')) {
        if (parentOutput !== null && parentOutput !== undefined) {
          // Pass the parameter name if we're looking for a specific parameter
          const targetParam = additionalData.targetParamName || null;
          finalUrl = componentService.resolveUrlPlaceholders(finalUrl, parentOutput, targetParam);
          console.log("- URL after replacement:", finalUrl);
        } else {
          console.warn("- Parent output is null/undefined, skipping API call");
          throw new Error("No parent node output available. Please connect and configure a parent node.");
        }
      }
      
      // Fix URL construction to avoid double slashes
      if (!finalUrl.startsWith('http')) {
        // Remove leading slash from finalUrl if it exists
        const cleanPath = finalUrl.startsWith('/') ? finalUrl.substring(1) : finalUrl;
        // Remove trailing slash from API_URL if it exists
        const cleanApiUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
        // Construct clean URL
        finalUrl = `${cleanApiUrl}/${cleanPath}`;
      }

      console.log("- Final clean URL:", finalUrl);

      // Parse headers if provided
      let headers = {
        'Content-Type': 'application/json'
      };

      if (paramConfig.apiHeaders) {
        try {
          const parsedHeaders = JSON.parse(paramConfig.apiHeaders);
          headers = { ...headers, ...parsedHeaders };
        } catch (error) {
          console.warn('Invalid API headers JSON, using defaults:', error);
        }
      }

      // Prepare request options
      const requestOptions = {
        method: paramConfig.apiMethod?.toUpperCase() || 'GET',
        headers
      };

      // Add body for POST requests
      if (requestOptions.method === 'POST') {
        requestOptions.data = {
          parent_output: parentOutput,
          ...additionalData
        };
      }

      console.log(`Making ${requestOptions.method} request to:`, finalUrl);
      
      const response = await axios({
        url: finalUrl,
        ...requestOptions
      });
      
      console.log("✅ API Response received:", response.status);
      
      let responseData = response.data;
      
      // Handle error responses
      if (responseData && responseData.error) {
        throw new Error(responseData.error);
      }
      
      // Extract data using responseDataPath if specified
      if (paramConfig.responseDataPath) {
        responseData = componentService.extractDataByPath(responseData, paramConfig.responseDataPath);
      }

      // Handle response format - your backend returns [{"label": "col", "value": "col"}]
      if (!Array.isArray(responseData)) {
        console.log("- Response is not an array, converting...");
        if (typeof responseData === 'object' && responseData !== null) {
          responseData = Object.keys(responseData);
        } else {
          throw new Error('API response must be an array or contain an array at the specified path');
        }
      }

      console.log(`- Received ${responseData.length} items from API`);

      // If backend already returns proper format, use it directly
      if (responseData.length > 0 && responseData[0].label && responseData[0].value) {
        console.log("- Using backend response format directly");
        return responseData;
      }

      // Otherwise transform data for display
      return componentService.transformApiResponse(responseData, paramConfig.labelField, paramConfig.valueField);
      
    } catch (error) {
      console.error('❌ API request failed:', error);
      
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        
        if (status === 404) {
          throw new Error(`API endpoint not found (404). Check if the backend endpoint exists: ${error.config?.url}`);
        } else if (status === 500) {
          throw new Error(`Server error (500). Check backend logs for details.`);
        } else {
          throw new Error(`HTTP ${status}: ${statusText}`);
        }
      }
      
      throw error;
    }
  },

  /**
   * Extract data from response using JSONPath-like syntax
   */
  extractDataByPath: (data, path) => {
    if (!path) return data;
    
    const pathParts = path.split('.');
    let current = data;
    
    for (const part of pathParts) {
      if (current === null || current === undefined) {
        throw new Error(`Path "${path}" not found in response`);
      }
      current = current[part];
    }
    
    return current;
  },

  /**
   * Transform API response into standardized format
   */
  transformApiResponse: (data, labelField, valueField = labelField) => {
    return data.map((item, index) => {
      // Handle different data types
      if (typeof item === 'string' || typeof item === 'number') {
        return {
          label: item,
          value: item,
          original: item
        };
      }
      
      if (typeof item === 'object' && item !== null) {
        const label = labelField ? item[labelField] : item;
        const value = valueField ? item[valueField] : label;
        
        return {
          label: label !== undefined ? label : `Item ${index + 1}`,
          value: value !== undefined ? value : label,
          original: item
        };
      }
      
      return {
        label: `Item ${index + 1}`,
        value: index,
        original: item
      };
    });
  },

  /**
   * Test API endpoint connectivity
   */
  testApiEndpoint: async (url, method = 'GET', headers = '') => {
    try {
      let requestHeaders = {
        'Content-Type': 'application/json'
      };

      if (headers) {
        try {
          const parsedHeaders = JSON.parse(headers);
          requestHeaders = { ...requestHeaders, ...parsedHeaders };
        } catch (error) {
          return {
            success: false,
            error: 'Invalid headers JSON format'
          };
        }
      }

      const response = await axios({
        method: method.toUpperCase(),
        url: url,
        headers: requestHeaders
      });
      
      return {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        data: response.data
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      };
    }
  },

  /**
   * Helper method to resolve parent node output for API calls
   */
  resolveParentOutput: (parentResult, nodes) => {
    console.log("🔍 Debug resolveParentOutput:");
    console.log("- Parent result:", parentResult);
    
    if (!parentResult || !parentResult.sourceNodeId) {
      console.log("- No parent result or source node ID");
      return null;
    }
    
    const parentNode = nodes.find(n => n.id === parentResult.sourceNodeId);
    console.log("- Found parent node:", parentNode?.id);
    
    if (!parentNode || !parentNode.data.componentData) {
      console.log("- No parent node or component data");
      return null;
    }
    
    const parentConfig = parentNode.data.componentData.config;
    console.log("- Parent config:", parentConfig);
    
    // Return the entire config object so we can access specific parameters
    return parentConfig;
  },

  /**
   * Get available parent parameters for UI display
   */
  getAvailableParentParameters: (parentResult, nodes) => {
    if (!parentResult || !parentResult.sourceNodeId) {
      return [];
    }
    
    const parentNode = nodes.find(n => n.id === parentResult.sourceNodeId);
    if (!parentNode || !parentNode.data.componentData) {
      return [];
    }
    
    const parentConfig = parentNode.data.componentData.config;
    const parameters = [];
    
    // Add standard outputs
    if (parentConfig.filePath) parameters.push({ name: 'filePath', value: parentConfig.filePath, type: 'file' });
    if (parentConfig.output) parameters.push({ name: 'output', value: parentConfig.output, type: 'output' });
    if (parentConfig.result) parameters.push({ name: 'result', value: parentConfig.result, type: 'result' });
    
    // Add all other configured parameters
    Object.keys(parentConfig).forEach(key => {
      if (!['filePath', 'output', 'result', 'parent_result'].includes(key)) {
        parameters.push({ 
          name: key, 
          value: parentConfig[key], 
          type: typeof parentConfig[key] === 'object' ? 'object' : 'value'
        });
      }
    });
    
    return parameters;
  },
  
  /**
   * Create a new component with file path (UPDATED for REST API)
   */
  createComponent: async (componentData) => {
    try {
      const formData = new FormData();
      
      // Append component data to form
      formData.append('name', componentData.name);
      formData.append('section', componentData.section);
      formData.append('parameters', JSON.stringify(componentData.parameters || []));
      formData.append('description', componentData.description || '');
      
      // Use file path instead of file upload for Python component
      if (componentData.pythonFilePath) {
        formData.append('pythonFilePath', componentData.pythonFilePath);
      }
      
      // Keep icon upload (small files, still practical)
      if (componentData.icon) {
        formData.append('icon', componentData.icon);
      }
      
      const response = await axios.post(`${API_URL}/components`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating component:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing component with file path (UPDATED for REST API)
   */
  updateComponent: async (componentId, componentData) => {
    try {
      const formData = new FormData();
      
      // Append component data to form
      formData.append('name', componentData.name);
      formData.append('section', componentData.section);
      formData.append('parameters', JSON.stringify(componentData.parameters || []));
      formData.append('description', componentData.description || '');
      
      // Use file path instead of file upload for Python component
      if (componentData.pythonFilePath) {
        formData.append('pythonFilePath', componentData.pythonFilePath);
      }
      
      // Keep icon upload if provided
      if (componentData.icon) {
        formData.append('icon', componentData.icon);
      }
      
      const response = await axios.put(`${API_URL}/components/${componentId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error updating component ${componentId}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a component
   */
  deleteComponent: async (componentId) => {
    try {
      const response = await apiClient.delete(`/components/${componentId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting component ${componentId}:`, error);
      throw error;
    }
  },

  /**
   * Validate file path before using it
   */
  validateFilePath: async (filePath) => {
    try {
      const formData = new FormData();
      formData.append('file_path', filePath);
      
      const response = await axios.post(`${API_URL}/components/validate-path`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error validating file path:', error);
      throw error;
    }
  },

  // FILE HANDLER API METHODS (Keep for file parameters in workflows)
  
  /**
   * For file parameters: No longer upload, just validate path
   */
  validateFileParameterPath: async (filePath) => {
    try {
      // Simple validation - check if path looks valid
      if (!filePath || !filePath.trim()) {
        throw new Error('File path cannot be empty');
      }

      // You can add more validation here if needed
      return {
        valid: true,
        filePath: filePath.trim(),
        message: 'File path format is valid'
      };
    } catch (error) {
      console.error('Error validating file parameter path:', error);
      throw error;
    }
  },

  /**
   * Get file info by path (if your backend supports it)
   */
  getFileInfo: async (filePath) => {
    try {
      const response = await axios.get(`${API_URL}/workflow/file-info`, {
        params: { file_path: filePath }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  },

  /**
   * Execute a component
   */
  executeComponent: async (componentId, parameters) => {
    try {
      const response = await axios.post(`${API_URL}/workflow/execute-component/${componentId}`, parameters, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error executing component ${componentId}:`, error);
      throw error;
    }
  },

  // WORKFLOW API METHODS (Keep existing)
  
  /**
   * Save a pipeline/workflow
   */
  savePipeline: async (pipelineData) => {
    try {
      const response = await apiClient.post('/workflows', pipelineData);
      return response.data;
    } catch (error) {
      console.error('Error saving pipeline:', error);
      throw error;
    }
  },
  
  /**
   * Get all workflows
   */
  getWorkflows: async () => {
    try {
      const response = await apiClient.get('/workflows/');
      return response.data;
    } catch (error) {
      console.error('Error fetching workflows:', error);
      throw error;
    }
  },
  
  /**
   * Get workflow by ID
   */
  getWorkflow: async (workflowId) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching workflow ${workflowId}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a workflow
   */
  deleteWorkflow: async (workflowId) => {
    try {
      const response = await apiClient.delete(`/workflows/${workflowId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting workflow ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Validate a workflow configuration
   */
  validateWorkflow: async (workflowId) => {
    try {
      const response = await apiClient.post(`/workflows/${workflowId}/validate`);
      return response.data;
    } catch (error) {
      console.error(`Error validating workflow ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Validate workflow configuration without saving
   */
  validateWorkflowConfig: async (config) => {
    try {
      const response = await apiClient.post('/workflows/validate-config', config);
      return response.data;
    } catch (error) {
      console.error('Error validating workflow config:', error);
      throw error;
    }
  },

  /**
   * Get workflow logs (from workflows API)
   */
  getWorkflowLogs: async (workflowId) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}/logs`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching workflow logs for ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Clear workflow logs
   */
  clearWorkflowLogs: async (workflowId) => {
    try {
      const response = await apiClient.post(`/workflows/${workflowId}/logs/clear`);
      return response.data;
    } catch (error) {
      console.error(`Error clearing workflow logs for ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Get workflow status
   */
  getWorkflowStatus: async (workflowId) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}/status`);
      return response.data;
    } catch (error) {
      console.error(`Error getting workflow status for ${workflowId}:`, error);
      throw error;
    }
  },

  // TEMPORAL API METHODS (Keep existing)
  
  /**
   * Execute a workflow with Temporal
   */
  executeWorkflow: async (workflowId, parameters = {}) => {
    try {
      const response = await axios.post(`${API_URL}/temporal/execute-workflow/${workflowId}`, parameters, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error executing workflow ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Get Temporal workflow logs
   */
  getTemporalWorkflowLogs: async (workflowId, limit = 100) => {
    try {
      const response = await axios.get(`${API_URL}/temporal/workflow/${workflowId}/logs`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching Temporal logs for workflow ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Get workflow execution status
   */
  getWorkflowExecutionStatus: async (workflowId) => {
    try {
      const response = await axios.get(`${API_URL}/temporal/workflow/${workflowId}/execution-status`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching execution status for workflow ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Stop workflow execution
   */
  stopWorkflowExecution: async (workflowId) => {
    try {
      const response = await axios.post(`${API_URL}/temporal/workflow/${workflowId}/stop-execution`);
      return response.data;
    } catch (error) {
      console.error(`Error stopping execution for workflow ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Clear Temporal workflow logs
   */
  clearTemporalWorkflowLogs: async (workflowId) => {
    try {
      const response = await axios.post(`${API_URL}/temporal/workflow/${workflowId}/logs/clear`);
      return response.data;
    } catch (error) {
      console.error(`Error clearing Temporal logs for workflow ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Download Temporal workflow logs
   */
  downloadTemporalWorkflowLogs: async (workflowId) => {
    try {
      const response = await axios.get(`${API_URL}/temporal/workflow/${workflowId}/logs/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error(`Error downloading Temporal logs for workflow ${workflowId}:`, error);
      throw error;
    }
  },

  /**
   * Check Temporal health
   */
  checkTemporalHealth: async () => {
    try {
      const response = await axios.get(`${API_URL}/temporal/health`);
      return response.data;
    } catch (error) {
      console.error('Error checking Temporal health:', error);
      throw error;
    }
  },

  /**
   * Get Temporal status
   */
  getTemporalStatus: async () => {
    try {
      const response = await axios.get(`${API_URL}/temporal/status`);
      return response.data;
    } catch (error) {
      console.error('Error getting Temporal status:', error);
      throw error;
    }
  }
};

export default componentService;