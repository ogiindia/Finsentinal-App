// src/services/api.js
import axios from 'axios';

/**
 * Helper function to handle API errors consistently
 * 
 * @param {Error} error The error from axios
 */
const handleError = (error) => {
  // Log the error for debugging
  console.error('API Error:', error);
  
  // Format error message based on response if available
  if (error.response) {
    // Server responded with an error status
    const { status, data } = error.response;
    
    console.error(`Status: ${status}`);
    console.error('Response:', data);
    
    // Add custom handling for specific status codes if needed
    if (status === 401) {
      // Handle unauthorized - could redirect to login
      console.error('Unauthorized access. Please log in.');
    } else if (status === 403) {
      // Handle forbidden
      console.error('Access forbidden.');
    } else if (status === 404) {
      // Handle not found
      console.error('Resource not found.');
    } else if (status === 500) {
      // Handle server error
      console.error('Server error occurred.');
    }
  } else if (error.request) {
    // Request was made but no response received (network issue)
    console.error('No response received from server. Check your network connection.');
  } else {
    // Error setting up the request
    console.error('Error setting up request:', error.message);
  }
};

/**
 * Base API service for handling HTTP requests
 */
const apiService = {
  /**
   * Make a GET request
   * 
   * @param {string} url The URL to request
   * @param {Object} params Optional query parameters
   * @param {Object} options Additional axios options
   * @returns {Promise<Object>} Response data
   */
  get: async (url, params = {}, options = {}) => {
    try {
      const response = await axios.get(url, {
        params,
        ...options
      });
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  /**
   * Make a POST request
   * 
   * @param {string} url The URL to request
   * @param {Object} data Data to send in request body
   * @param {Object} options Additional axios options
   * @returns {Promise<Object>} Response data
   */
  post: async (url, data = {}, options = {}) => {
    try {
      const response = await axios.post(url, data, options);
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  /**
   * Make a PUT request
   * 
   * @param {string} url The URL to request
   * @param {Object} data Data to send in request body
   * @param {Object} options Additional axios options
   * @returns {Promise<Object>} Response data
   */
  put: async (url, data = {}, options = {}) => {
    try {
      const response = await axios.put(url, data, options);
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  /**
   * Make a DELETE request
   * 
   * @param {string} url The URL to request
   * @param {Object} options Additional axios options
   * @returns {Promise<Object>} Response data
   */
  delete: async (url, options = {}) => {
    try {
      const response = await axios.delete(url, options);
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  /**
   * Upload file(s) using a POST request
   * 
   * @param {string} url The URL to request
   * @param {FormData} formData FormData object with file(s) and other form fields
   * @param {Object} options Additional axios options
   * @returns {Promise<Object>} Response data
   */
  uploadFile: async (url, formData, options = {}) => {
    try {
      const defaultOptions = {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          // Calculate and log upload progress if needed
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      };
      
      const response = await axios.post(url, formData, {
        ...defaultOptions,
        ...options
      });
      
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
  
  /**
   * Download a file
   * 
   * @param {string} url The URL to request
   * @param {Object} params Optional query parameters
   * @param {Object} options Additional axios options
   * @returns {Promise<Blob>} File blob
   */
  downloadFile: async (url, params = {}, options = {}) => {
    try {
      const defaultOptions = {
        responseType: 'blob',
        params
      };
      
      const response = await axios.get(url, {
        ...defaultOptions,
        ...options
      });
      
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }
};

export default apiService;