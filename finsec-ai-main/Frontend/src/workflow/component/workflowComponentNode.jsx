import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import ReactDOM from 'react-dom';
import { Modal } from './Modal';
import { ParentNodeSelector } from './ParentNodeSelector';
import componentService from '../services/componentService';
import './Modal.css';

export const WorkflowComponentNode = ({ id, data, isConnectable }) => {
  
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [componentParams, setComponentParams] = useState(null);
  const [error, setError] = useState(null);

  // New state for REST API parameters
  const [apiData, setApiData] = useState({}); // Store fetched API data for each parameter
  const [apiLoading, setApiLoading] = useState({}); // Track loading state for each API parameter
  const [apiErrors, setApiErrors] = useState({}); // Track errors for each API parameter

  // Get component data from node data
  const component = data.component || {};
  const componentData = data.componentData || {};
  const status = componentData.status || 'unconfigured';

  // Get node count to display node number
  const nodes = data.getNodes ? data.getNodes() : [];
  const nodeNumber = nodes.findIndex(node => node.id === id) + 1;

  // State for form values - simplified for path-only inputs
  const [formValues, setFormValues] = useState({});
  // const [nodeParamMappings, setNodeParamMappings] = useState({});

// const [selectedMappingParams, setSelectedMappingParams] = useState({});



// useEffect(() => {
//   if (
//     selectedMappingParams &&
//     Object.keys(selectedMappingParams).length > 0
//   ) {
//     setFormValues(prev => ({
//       ...prev,
//       parent_result: {
//         isPreviousOutput: true,
//         mappings: selectedMappingParams
//       }
//     }));
//   }
// }, [selectedMappingParams]);

// useEffect(() => {
//   setFormValues(prev => {
//     if (selectedMappingParams && Object.keys(selectedMappingParams).length > 0) {
//       return {
//         ...prev,
//         parent_result: {
//           isPreviousOutput: true,
//           mappings: selectedMappingParams
//         }
//       };
//     }

//     const updated = { ...prev };
//     delete updated.parent_result;
//     return updated;
//   });
// }, [selectedMappingParams]);

  

  // Initialize form values based on component data
  useEffect(() => {
    if (!isConfiguring) {
      if (componentData.config) {
        setFormValues({ ...componentData.config });
      } else {
        setFormValues({});
      }
    }
  }, [componentData.config, isConfiguring]);

//   useEffect(() => {
//   if (Object.keys(selectedMappingParams).length > 0) {
//     setFormValues(prev => ({
//       ...prev,
//       parent_result: {
//         isPreviousOutput: true,
//         mappings: selectedMappingParams
//       }
//     }));
//   } else {
//     setFormValues(prev => {
//       const updated = { ...prev };
//       delete updated.parent_result;
//       return updated;
//     });
//   }
// }, [selectedMappingParams]);



//   useEffect(() => {
//   if (componentData.config?.parent_result?.mappings) {
//     setSelectedMappingParams(componentData.config.parent_result.mappings);
//   } else {
//     setSelectedMappingParams({});
//   }
// }, [componentData.config]);



  // Load component parameters when needed
  useEffect(() => {
    if (isConfiguring && component.id && !componentParams) {
      fetchComponentParameters();
    }
  }, [isConfiguring, component.id, componentParams]);

  const fetchComponentParameters = async () => {
    if (!component.id) return;

    try {
      setIsLoading(true);
      const result = await componentService.getComponentParameters(component.id);
      console.log(result)
      setComponentParams(result);
      setError(null);

      // Initialize API data for REST API parameters
      if (result && result.parameters) {
        const restApiParams = result.parameters.filter(p => p.dataType === 'restapi');
        for (const param of restApiParams) {
          await fetchApiData(param.name, param);
        }
      }
    } catch (err) {
      console.error('Error fetching component parameters:', err);
      setError('Failed to load component parameters. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data from REST API for a parameter
  const fetchApiData = async (paramName, paramConfig) => {

    console.log(paramName , paramConfig)
    if (!paramConfig.apiUrl) return;

    setApiLoading(prev => ({ ...prev, [paramName]: true }));
    setApiErrors(prev => ({ ...prev, [paramName]: null }));

    try {
      // Check if we need parent data for this API call
      let parentOutput = null;

      if (paramConfig.apiUrl.includes('{parent_output}') || paramConfig.apiUrl.includes('{parent_result')) {
        // Get the parent result configuration
        console.log(formValues);
        const parentResult = formValues.parent_result;
        console.log(parentResult);
        
        // if (parentResult && parentResult.sourceNodeId && parentResult.targetParam) {
        //   // Find the parent node
        //   const parentNode = nodes.find(n => n.id === parentResult.sourceNodeId);

        //   if (parentNode && parentNode.data.componentData && parentNode.data.componentData.config) {
        //     const parentConfig = parentNode.data.componentData.config;

        //     // Check if the target parameter is the current REST API parameter
        //     if (parentResult.targetParam === paramName) {
        //       // Get the entire parent config to pass to the API
        //       parentOutput = parentConfig;
        //       console.log(`Using parent output for ${paramName}:`, parentOutput);
        //     }
        //   }
        // }

        const parentNodeId = formValues.parent_result?.mappings?.[paramName];

        // if (parentNodeId) {
        //   const parentNode = nodes.find(n => n.id === parentNodeId);
        //   if (parentNode?.data?.componentData?.config) {
        //     parentOutput = parentNode.data.componentData.config;
        //   }
        // }
        const edges = data.getEdges ? data.getEdges() : [];
        const edge = edges.find(
          e => e.target === id && e.source === parentNodeId
        );

        if (edge) {
          const parentNode = nodes.find(n => n.id === edge.source);
          if (parentNode?.data?.componentData?.config) {
            parentOutput = parentNode.data.componentData.config;
          }
        }
        console.log(parentOutput);
      }

      // Use the componentService method to fetch API data
      const transformedData = await componentService.fetchApiParameterData(
        paramConfig,
        parentOutput,
        formValues
      );

      setApiData(prev => ({ ...prev, [paramName]: transformedData }));

    } catch (err) {
      console.error(`Error fetching API data for ${paramName}:`, err);
      setApiErrors(prev => ({
        ...prev,
        [paramName]: `Failed to load options: ${err.message}`
      }));
    } finally {
      setApiLoading(prev => ({ ...prev, [paramName]: false }));
    }
  };

 useEffect(() => {
  if (componentParams?.parameters && formValues.parent_result?.mappings) {
    const restApiParams = componentParams.parameters.filter(
      p => p.dataType === 'restapi'
    );

    for (const param of restApiParams) {
      if (formValues.parent_result.mappings[param.name]) {
        fetchApiData(param.name, param);
      }
    }
  }
}, [formValues.parent_result]);

  // Toggle configuration modal
  const handleConfigure = (e) => {
    e.stopPropagation();
    setIsConfiguring(true);
  };

  // Close configuration modal
  const handleCloseConfig = () => {
    setIsConfiguring(false);
  };

  // Check if this node is using a parent node
  // const isUsingParentNode = () => {
  //   const parentResult = componentData.config?.parent_result;
  //   return parentResult &&
  //     typeof parentResult === 'object' &&
  //     parentResult.isPreviousOutput === true &&
  //     parentResult.sourceNodeId;
  // };

  const isUsingParentNode = () => {
    const mappings = formValues.parent_result?.mappings;
    return (
      formValues.parent_result?.isPreviousOutput === true &&
      mappings &&
      Object.keys(mappings).length > 0
    );
  };

  // Get the selected parent node ID if any
  // const getSelectedParentNodeId = () => {
  //   if (isUsingParentNode()) {
  //     return Object.values(componentData.config?.parent_result?.mappings || {})[0] || null;
  //   }
  //   return null;
  // };
  const getSelectedParentNodeId = () => {
    const mappings = formValues.parent_result?.mappings;
    if (!mappings) return null;
    return Object.values(mappings)[0] || null;
  };
  // const [selectedMappingParam, setSelectedMappingParam] = useState('');


  // Get all parameter names from current component
  const getCurrentNodeParams = () => {
    if (!componentParams || !componentParams.parameters) return [];
    return componentParams.parameters.map(p => p.name);
  };

  // Handle file path input
  const handleFilePathInput = (paramName, path) => {
    setFormValues(prev => ({
      ...prev,
      [paramName]: {
        fileName: path.split('/').pop() || path,
        fileSize: 0,
        fileType: '',
        filePath: path,
        isNewFile: false,
        isPathInput: true
      }
    }));
  };

  // Handle parent node selection change
//   const handleParentNodeSelectionChange = (mappingDict) => {
//   if (Object.keys(mappingDict).length > 0) {
//     setFormValues(prev => ({
//       ...prev,
//       parent_result: {
//         isPreviousOutput: true,
//         mappings: mappingDict   // ✅ dictionary stored
//       }
//     }));
//   } else {
//     const updated = { ...formValues };
//     delete updated.parent_result;
//     setFormValues(updated);
//   }
// };

  // Handle field changes
  const handleFieldChange = (name, value) => {
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle REST API parameter changes
  const handleRestApiChange = (paramName, selectedValues, isMultiple = false) => {
    if (isMultiple) {
      // For multichoice, selectedValues should be an array
      setFormValues(prev => ({
        ...prev,
        [paramName]: selectedValues
      }));
    } else {
      // For dropdown, selectedValues should be a single value
      setFormValues(prev => ({
        ...prev,
        [paramName]: selectedValues
      }));
    }
  };

  const renderRestApiParameter = (param, index) => {
    const { name, description, displayType } = param;
    const currentValue = formValues[name];
    const options = apiData[name] || [];
    const loading = apiLoading[name] || false;
    const error = apiErrors[name] || null;

    // Check if this parameter is mapped to receive parent output
    const isMappedToParent =
  !!formValues.parent_result?.mappings?.[name];

    // Handle select all functionality
    const handleSelectAll = (selectAll) => {
      if (selectAll) {
        const allValues = options.map(option => option.value);
        handleRestApiChange(name, allValues, true);
      } else {
        handleRestApiChange(name, [], true);
      }
    };

    // Check if all items are selected
    const isAllSelected = () => {
      if (!Array.isArray(currentValue) || options.length === 0) return false;
      return options.every(option => currentValue.includes(option.value));
    };

    // Check if some items are selected
    const isSomeSelected = () => {
      if (!Array.isArray(currentValue) || currentValue.length === 0) return false;
      return currentValue.length > 0 && currentValue.length < options.length;
    };

    return (
      <div key={index} style={{ marginBottom: '15px' }}>
        <label style={{
          display: 'block',
          marginBottom: '5px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {name}
          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#007bff' }}>
            <i className="fas fa-cloud"></i> API
          </span>
          {isMappedToParent && (
            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#28a745' }}>
              <i className="fas fa-link"></i> Parent linked
            </span>
          )}
        </label>

        {loading && (
          <div style={{
            padding: '8px',
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#1976d2'
          }}>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
            Loading options from API...
          </div>
        )}

        {error && (
          <div style={{
            padding: '8px',
            backgroundColor: '#ffebee',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#c62828'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
            {error}
            <button
              onClick={() => fetchApiData(name, param)}
              style={{
                marginLeft: '8px',
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-sync-alt"></i> Retry
            </button>
          </div>
        )}

        {!loading && !error && options.length > 0 && (
          <>
            {displayType === 'multichoice' ? (
              <div style={{
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: '#fff'
              }}>
                {/* Select All - Simple Layout */}
                <div style={{
                  padding: '8px',
                  backgroundColor: '#f5f5f5',
                  borderBottom: '1px solid #ddd'
                }}>
                  <label style={{ cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected()}
                      ref={checkbox => {
                        if (checkbox) checkbox.indeterminate = isSomeSelected();
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    <i className="fas fa-check-double" style={{ marginRight: '8px', color: '#007bff' }}></i>
                    Select All ({options.length} items)
                  </label>
                </div>

                {/* Options List - Simple Layout */}
                <div style={{
                  padding: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {options.map((option, optIndex) => (
                    <div key={optIndex} style={{ marginBottom: '6px' }}>
                      <label style={{
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'block',
                        padding: '4px',
                        borderRadius: '3px'
                      }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <input
                          type="checkbox"
                          checked={Array.isArray(currentValue) && currentValue.includes(option.value)}
                          onChange={(e) => {
                            const currentArray = Array.isArray(currentValue) ? currentValue : [];
                            if (e.target.checked) {
                              handleRestApiChange(name, [...currentArray, option.value], true);
                            } else {
                              handleRestApiChange(name, currentArray.filter(v => v !== option.value), true);
                            }
                          }}
                          style={{ marginRight: '8px' }}
                        />
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>

                {/* Selection Summary - Simple Layout */}
                {Array.isArray(currentValue) && currentValue.length > 0 && (
                  <div style={{
                    padding: '8px',
                    backgroundColor: '#e8f4fd',
                    borderTop: '1px solid #ddd',
                    fontSize: '12px',
                    color: '#0c5460'
                  }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                    <strong>Selected:</strong> {currentValue.length} of {options.length} items
                    <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                      {currentValue.length <= 3 ? (
                        currentValue.map(val => {
                          const option = options.find(opt => opt.value === val);
                          return option ? option.label : val;
                        }).join(', ')
                      ) : (
                        currentValue.slice(0, 3).map(val => {
                          const option = options.find(opt => opt.value === val);
                          return option ? option.label : val;
                        }).join(', ') + ` and ${currentValue.length - 3} more...`
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Regular dropdown
              <select
                value={currentValue || ''}
                onChange={(e) => handleRestApiChange(name, e.target.value, false)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="">Select {name}</option>
                {options.map((option, optIndex) => (
                  <option key={optIndex} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        {!loading && !error && options.length === 0 && (
          <div style={{
            padding: '8px',
            backgroundColor: '#fff3cd',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#856404'
          }}>
            <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
            {isMappedToParent ? 'No options available - check parent node configuration' : 'No options available from API'}
          </div>
        )}

        {description && (
          <small style={{
            display: 'block',
            marginTop: '4px',
            fontSize: '12px',
            color: '#666'
          }}>
            {description}
          </small>
        )}
      </div>
    );
  };

  // Render file parameter with path input only
  const renderFileParameter = (param, index) => {
    const { name, description, acceptedExtensions, maxFileSize } = param;
    const currentValue = formValues[name];

    const formStyles = {
      formGroup: { marginBottom: '0.75rem' },
      label: {
        display: 'block',
        marginBottom: '0.25rem',
        fontSize: '0.85rem',
        fontWeight: '500'
      },
      pathInputContainer: {
        position: 'relative'
      },
      pathIcon: {
        position: 'absolute',
        left: '0.75rem',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#6c757d',
        fontSize: '0.85rem'
      },
      pathInput: {
        display: 'block',
        width: '100%',
        padding: '0.375rem 0.5rem 0.375rem 2.5rem',
        fontSize: '0.85rem',
        lineHeight: '1.5',
        color: '#495057',
        backgroundColor: '#fff',
        border: '1px solid #ced4da',
        borderRadius: '0.25rem'
      },
      helpText: {
        display: 'block',
        marginTop: '0.25rem',
        fontSize: '0.75rem',
        color: '#6c757d'
      }
    };

    return (
      <div key={index} style={formStyles.formGroup}>
        <label style={formStyles.label}>{name}</label>

        {/* File Path Input */}
        <div style={formStyles.pathInputContainer}>
          <i className="fas fa-folder-open" style={formStyles.pathIcon}></i>
          <input
            type="text"
            value={currentValue?.filePath || ''}
            onChange={e => handleFilePathInput(name, e.target.value)}
            placeholder="/path/to/your/file"
            disabled={isLoading}
            style={formStyles.pathInput}
          />
        </div>

        {/* File Info Display */}
        {currentValue && currentValue.filePath && (
          <div style={{
            marginTop: '0.5rem',
            padding: '0.5rem',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '0.25rem',
            fontSize: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
              <i className="fas fa-folder-open" style={{ marginRight: '0.5rem', color: '#4e73df' }}></i>
              <strong>File Path:</strong>
              <span style={{ marginLeft: '0.5rem' }}>{currentValue.fileName}</span>
            </div>
            <div><strong>Full Path:</strong> {currentValue.filePath}</div>
            <div style={{
              marginTop: '0.25rem',
              color: '#856404',
              fontSize: '0.7rem'
            }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.25rem' }}></i>
              Make sure the file exists at the specified path
            </div>
          </div>
        )}

        {/* Help Text */}
        {description && <small style={formStyles.helpText}>{description}</small>}
        {acceptedExtensions && (
          <small style={formStyles.helpText}>
            <strong>Accepted formats:</strong> {acceptedExtensions}
          </small>
        )}
        {maxFileSize && (
          <small style={formStyles.helpText}>
            <strong>Max file size:</strong> {maxFileSize} MB (for validation)
          </small>
        )}
        <small style={formStyles.helpText}>
          <i className="fas fa-info-circle" style={{ marginRight: '0.25rem' }}></i>
          Enter the absolute or relative path to the file on the server
        </small>
      </div>
    );
  };

  // Save configuration - simplified for path-only inputs
  // const handleSaveConfig = async () => {
  //   const configValues = { ...formValues };

  //   // No file uploads to handle, just save the configuration
  //   if (data.onUpdate) {
  //     data.onUpdate(id, {
  //       ...componentData,
  //       config: configValues,
  //       status: 'configured'
  //     });
  //   }

  //   // Close the configuration modal
  //   setIsConfiguring(false);
  // };

  const handleSaveConfig = async () => {
  const mappings = formValues.parent_result?.mappings || {};

  const edges = data.getEdges ? data.getEdges() : [];
  const connectedParents = edges
    .filter(edge => edge.target === id)
    .map(edge => edge.source);

  const mappedParents = Object.values(mappings);

  // const unmappedParents = connectedParents.filter(
  //   pid => !mappedParents.includes(pid)
  // );

  // if (unmappedParents.length > 0) {
  //   alert(
  //     `All connected parent nodes must be mapped.\nUnmapped: ${unmappedParents.join(', ')}`
  //   );
  //   return;
  // }

  const hasMapping =
  formValues.parent_result &&
  Object.keys(formValues.parent_result.mappings || {}).length > 0;

  if (connectedParents.length > 0 && !hasMapping) {
    alert("Please map at least one parent node.");
    return;
  }

  data.onUpdate(id, {
    ...componentData,
    config: { ...formValues },
    status: 'configured'
  });

  setIsConfiguring(false);
};



  // Render icon based on component data
  const renderIcon = () => {
    const iconStyle = {
      width: '40px',
      height: '40px',
      cursor: 'pointer',
      filter: status === 'configured' ? 'none' : 'grayscale(100%)',
      opacity: status === 'configured' ? 1 : 0.5,
      transition: 'all 0.3s ease'
    };

    if (component.icon_base64) {
      return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            onClick={handleConfigure}
            src={`data:image/png;base64,${component.icon_base64}`}
            alt={component.name}
            style={iconStyle}
          />
          {/* Colored overlay indicator */}
          <div style={{
            position: 'absolute',
            bottom: '-5px',
            right: '-5px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: status === 'configured' ? '#28a745' : '#dc3545',
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }} />
        </div>
      );
    } else if (component.icon_class) {
      return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <i
            className={component.icon_class}
            style={{
              ...iconStyle,
              fontSize: '2rem',
              color: status === 'configured' ? '#28a745' : '#6c757d'
            }}
            onClick={handleConfigure}
          />
          {/* Colored dot indicator */}
          <div style={{
            position: 'absolute',
            bottom: '-5px',
            right: '-5px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: status === 'configured' ? '#28a745' : '#dc3545',
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }} />
        </div>
      );
    } else {
      return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <i
            className="fas fa-puzzle-piece"
            style={{
              ...iconStyle,
              fontSize: '2rem',
              color: status === 'configured' ? '#28a745' : '#6c757d'
            }}
            onClick={handleConfigure}
          />
          {/* Colored dot indicator */}
          <div style={{
            position: 'absolute',
            bottom: '-5px',
            right: '-5px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: status === 'configured' ? '#28a745' : '#dc3545',
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }} />
        </div>
      );
    }
  };

  // Handle delete
  const handleDelete = (e) => {
    e.stopPropagation();
    if (data.onDelete) {
      data.onDelete();
    }
  };

  // Render form fields with path-only file inputs and REST API support
  const renderFields = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{
            display: 'inline-block',
            width: '1rem',
            height: '1rem',
            border: '0.2em solid #4e73df',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spinner-border 0.75s linear infinite',
            marginBottom: '0.5rem'
          }}></div>
          <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0' }}>Loading component parameters...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          padding: '0.5rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '0.25rem',
          marginBottom: '1rem',
          fontSize: '0.85rem'
        }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
          {error}
          <div style={{ marginTop: '0.5rem' }}>
            <button
              onClick={fetchComponentParameters}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                backgroundColor: '#4e73df',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-sync-alt" style={{ marginRight: '0.25rem' }}></i> Try Again
            </button>
          </div>
        </div>
      );
    }

    const parameters = componentParams?.parameters || component.parameters;
    console.log(parameters)
    if (!parameters || !Array.isArray(parameters)) {
      return <p style={{ fontSize: '0.85rem' }}>No parameters available for this component.</p>;
    }

    // Common styles for form elements
    const formStyles = {
      formGroup: { marginBottom: '0.75rem' },
      label: {
        display: 'block',
        marginBottom: '0.25rem',
        fontSize: '0.85rem',
        fontWeight: '500'
      },
      input: {
        display: 'block',
        width: '100%',
        padding: '0.375rem 0.5rem',
        fontSize: '0.85rem',
        lineHeight: '1.5',
        color: '#495057',
        backgroundColor: '#fff',
        border: '1px solid #ced4da',
        borderRadius: '0.25rem'
      },
      helpText: {
        display: 'block',
        marginTop: '0.25rem',
        fontSize: '0.75rem',
        color: '#6c757d'
      }
    };
    
const edges = data.getEdges ? data.getEdges() : [];

const connectedParentNodeIds = edges
  .filter(edge => edge.target === id)
  .map(edge => edge.source);

const connectedParentNodes = nodes.filter(
  node => connectedParentNodeIds.includes(node.id)
);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Parent Node Selector Component */}
        {/* <ParentNodeSelector
  enabled={!!formValues.parent_result}
  nodes={connectedParentNodes}
  currentNodeId={id}
  currentNodeParams={getCurrentNodeParams()}
  selectedMappingParams={selectedMappingParams}
  setSelectedMappingParams={setSelectedMappingParams}
  onSelectionChange={(mapping) => {
    setSelectedMappingParams(mapping);

    if (Object.keys(mapping).length > 0) {
      setFormValues(prev => ({
        ...prev,
        parent_result: {
          isPreviousOutput: true,
          mappings: mapping   // ✅ dictionary saved
        }
      }));
    } else {
      setFormValues(prev => {
        const updated = { ...prev };
        delete updated.parent_result;
        return updated;
      });
    }
  }}
/> */}

<ParentNodeSelector
  enabled={true}
  nodes={connectedParentNodes}
  currentNodeId={id}
  currentNodeParams={getCurrentNodeParams()}
  selectedMappingParams={formValues.parent_result?.mappings || {}}
  onSelectionChange={(mapping) => {
    setFormValues(prev => ({
      ...prev,
      parent_result: Object.keys(mapping).length
        ? { isPreviousOutput: true, mappings: mapping }
        : undefined
    }));
  }}
/>



        {/* Component Parameters */}
        
{parameters
  .filter(param => !formValues.parent_result?.mappings?.[param.name])
  .map((param, index) => {
// .filter(param => param.name !== selectedMappingParams)
          const { name, dataType, description } = param;
          const currentValue = formValues[name] !== undefined ? formValues[name] : '';

          switch (dataType) {
            case 'restapi':
              return renderRestApiParameter(param, index);

            case 'string':
              return (
                <div key={index} style={formStyles.formGroup}>
                  <label style={formStyles.label}>{name}</label>
                  <input
                    type="text"
                    value={currentValue}
                    onChange={e => handleFieldChange(name, e.target.value)}
                    style={formStyles.input}
                    placeholder={`Enter ${name}`}
                  />
                  {description && <small style={formStyles.helpText}>{description}</small>}
                </div>
              );

            case 'integer':
            case 'float':
              return (
                <div key={index} style={formStyles.formGroup}>
                  <label style={formStyles.label}>{name}</label>
                  <input
                    type="number"
                    value={currentValue}
                    onChange={e => handleFieldChange(name, dataType === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
                    style={formStyles.input}
                    placeholder={`Enter ${name}`}
                  />
                  {description && <small style={formStyles.helpText}>{description}</small>}
                </div>
              );

            case 'boolean':
              return (
                <div key={index} style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    id={`param-${name}`}
                    checked={!!currentValue}
                    onChange={e => handleFieldChange(name, e.target.checked)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <label htmlFor={`param-${name}`} style={{ fontSize: '0.85rem', marginBottom: 0 }}>{name}</label>
                  {description && <small style={{ ...formStyles.helpText, marginLeft: '0.5rem' }}>{description}</small>}
                </div>
              );

            case 'file':
              return renderFileParameter(param, index);

            default:
              return (
                <div key={index} style={formStyles.formGroup}>
                  <label style={formStyles.label}>{name}</label>
                  <input
                    type="text"
                    value={currentValue}
                    onChange={e => handleFieldChange(name, e.target.value)}
                    style={formStyles.input}
                    placeholder={`Enter ${name}`}
                  />
                  {description && <small style={formStyles.helpText}>{description}</small>}
                </div>
              );
          }
        })}
      </div>
    );
  };

  // Generate connection indicators
  const renderConnectionIndicators = () => {
    const hasParent = isUsingParentNode();
    const edges = data.getEdges ? data.getEdges() : [];
    const incomingEdges = edges.filter(edge => edge.target === id);
    const outgoingEdges = edges.filter(edge => edge.source === id);

    return (
      <>
        {hasParent && (
          <div style={{
            position: 'absolute',
            top: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#d1ecf1',
            color: '#0c5460',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '0.7rem',
            whiteSpace: 'nowrap'
          }}>
            <i className="fas fa-arrow-up" style={{ marginRight: '3px' }}></i>
            Using {
              (() => {
                const parentId = getSelectedParentNodeId();
                const parentNode = nodes.find(n => n.id === parentId);
                const mappings = formValues.parent_result?.mappings;
                const targetParam = mappings ? Object.keys(mappings)[0] : null;
                return parentNode ?
                  `${parentNode.data?.component?.name || 'Node'}${targetParam ? ` → ${targetParam}` : ''}` :
                  'Parent';
              })()
            }
          </div>
        )}

        {incomingEdges.length > 0 && !hasParent && (
          <div style={{
            position: 'absolute',
            top: '-24px',
            left: '10px',
            backgroundColor: '#4e73df',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '0.7rem'
          }}>
            <i className="fas fa-arrow-down" style={{ marginRight: '3px' }}></i>
            {incomingEdges.length}
          </div>
        )}

        {outgoingEdges.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '-24px',
            right: '10px',
            backgroundColor: '#4e73df',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '0.7rem'
          }}>
            <i className="fas fa-arrow-right" style={{ marginRight: '3px' }}></i>
            {outgoingEdges.length}
          </div>
        )}
      </>
    );
  };

  // Create modal content for portal rendering
  const renderModalContent = () => {
    if (!isConfiguring) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-container md">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{`Configure ${component.name || 'Component'} (Node ${nodeNumber || '?'})`}</h5>
            </div>
            <div className="modal-body">
              {component.description && (
                <div className="alert alert-info">
                  <i className="fas fa-info-circle" style={{ marginRight: '0.35rem' }}></i>
                  {component.description}
                </div>
              )}

              {renderFields()}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={handleCloseConfig}
                className="modal-close-button mx-2"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="modal-save-button"
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className="node-container"
        style={{
          padding: '10px',
          minWidth: '60px',
          textAlign: 'center',
          position: 'relative',
          backgroundColor: 'transparent'
        }}
      >
        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Left}
          style={{ width: '8px', height: '8px', left: '-4px' }}
          isConnectable={isConnectable}
        />

        {/* Node number badge */}
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '-8px',
          backgroundColor: '#4e73df',
          color: 'white',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold',
          zIndex: 5
        }}>
          {nodeNumber || '?'}
        </div>

        {/* Connection indicators */}
        {renderConnectionIndicators()}

        {/* Node content - Just the icon */}
        {renderIcon()}

        {/* Parent node badge - when this node is configured to use a parent node's output */}
        {isUsingParentNode() && (
          <div style={{
            position: 'absolute',
            top: '3px',
            left: '30px',
            fontSize: '0.6rem',
            backgroundColor: '#d1ecf1',
            color: '#0c5460',
            padding: '1px 4px',
            borderRadius: '3px'
          }}>
            <i className="fas fa-link" style={{ marginRight: '2px' }}></i>
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={handleDelete}
          style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            padding: '2px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '0.6rem',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.8,
            transition: 'opacity 0.2s'
          }}
          onMouseOver={(e) => e.target.style.opacity = '1'}
          onMouseOut={(e) => e.target.style.opacity = '0.8'}
          title="Delete"
        >
          <i className="fas fa-times" style={{ fontSize: '0.5rem' }}></i>
        </button>

        {/* Output handle */}
        <Handle
          type="source"
          position={Position.Right}
          style={{ width: '8px', height: '8px', right: '-4px' }}
          isConnectable={isConnectable}
        />
      </div>

      {/* Configuration Modal - Render with portal */}
      {isConfiguring && ReactDOM.createPortal(renderModalContent(), document.body)}
    </>
  );
};

export default WorkflowComponentNode;