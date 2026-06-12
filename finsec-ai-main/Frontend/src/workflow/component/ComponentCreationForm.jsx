// src/components/ComponentCreationForm.jsx
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import IconPicker from './IconPicker';

/**
 * Component creation form with file path input and REST API support
 */
export const ComponentCreationForm = ({ isOpen, onClose, onSave, initialData = null }) => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    section: '',
    icon: null,
    iconConfig: null,
    iconPreview: null,
    parameters: [{
      name: '',
      dataType: 'string',
      defaultValue: '',
      required: false,
      description: '',
      acceptedExtensions: '',
      maxFileSize: '',
      possibleValues: '',
      // New fields for REST API
      apiUrl: '',
      displayType: 'dropdown', // 'dropdown' or 'multichoice'
      apiMethod: 'GET',
      apiHeaders: '',
      responseDataPath: '', // JSONPath to extract data from response
      labelField: '', // Field to use as display label
      valueField: '' // Field to use as value (optional, defaults to labelField)
    }],
    pythonFilePath: '', // Only file path, no upload
    description: ''
  });

  // UI state
  const [isNewSection, setIsNewSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Style constants for form elements
  const styles = {
    formGroup: {
      marginBottom: '0.75rem'
    },
    label: {
      display: 'block',
      marginBottom: '0.25rem',
      fontSize: '0.85rem',
      fontWeight: '500'
    },
    input: {
      display: 'block',
      width: '100%',
      padding: '0.375rem 0.75rem',
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
      padding: '0.375rem 0.75rem 0.375rem 2.5rem',
      fontSize: '0.85rem',
      lineHeight: '1.5',
      color: '#495057',
      backgroundColor: '#fff',
      border: '1px solid #ced4da',
      borderRadius: '0.25rem'
    }
  };

  // Load initial data if editing an existing component
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        section: initialData.section_id || '',
        parameters: initialData.parameters || [{
          name: '',
          dataType: 'string',
          defaultValue: '',
          required: false,
          description: '',
          acceptedExtensions: '',
          maxFileSize: '',
          possibleValues: '',
          apiUrl: '',
          displayType: 'dropdown',
          apiMethod: 'GET',
          apiHeaders: '',
          responseDataPath: '',
          labelField: '',
          valueField: ''
        }],
        description: initialData.description || '',
        pythonFilePath: initialData.pythonFilePath || '',
        icon: null,
        iconPreview: null
      });

      if (initialData.section_name) {
        setSelectedSection(initialData.section_name);
      }
    }

    loadSections();
  }, [initialData]);

  // Load available sections from the API
  const loadSections = async () => {
    try {
      const mockSections = [
        { id: 1, name: 'Data Sources' },
        { id: 2, name: 'Preprocessing' },
        { id: 3, name: 'Models' },
        { id: 4, name: 'Visualization' }
      ];
      setSections(mockSections);
    } catch (error) {
      console.error('Error loading sections:', error);
      setError('Error loading component sections. Please try again.');
    }
  };

  // Toggle section dropdown
  const toggleSectionDropdown = () => {
    setShowSectionDropdown(!showSectionDropdown);
  };

    const handleIconChange = (iconConfig) => {
    setFormData(prev => ({
      ...prev,
      iconConfig
    }));
  };


  // Handle section selection
  const handleSectionSelect = (section) => {
    if (section === 'new') {
      setIsNewSection(true);
      setSelectedSection('New Section');
      setFormData({ ...formData, section: '' });
    } else {
      setIsNewSection(false);
      setSelectedSection(section.name);
      setFormData({ ...formData, section: section.name });
    }
    setShowSectionDropdown(false);
  };

  // Handle form field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle icon upload (keeping this as upload since icons are typically small)
  const handleIconUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (PNG, JPEG, GIF, SVG)');
      return;
    }

    setFormData({
      ...formData,
      icon: file,
      iconPreview: URL.createObjectURL(file)
    });
    setError(null);
  };

  // Handle Python file path input
  const handlePythonPathInput = (e) => {
    const path = e.target.value;
    setFormData({
      ...formData,
      pythonFilePath: path
    });
    setError(null);
  };

  // Add a new parameter to the component
  const handleAddParameter = () => {
    setFormData({
      ...formData,
      parameters: [
        ...formData.parameters,
        {
          name: '',
          dataType: 'string',
          defaultValue: '',
          required: false,
          description: '',
          acceptedExtensions: '',
          maxFileSize: '',
          possibleValues: '',
          apiUrl: '',
          displayType: 'dropdown',
          apiMethod: 'GET',
          apiHeaders: '',
          responseDataPath: '',
          labelField: '',
          valueField: ''
        }
      ]
    });
  };

  // Update a parameter's value
  const handleParameterChange = (index, field, value) => {
    const updatedParameters = [...formData.parameters];
    updatedParameters[index][field] = value;
    
    // Reset API-specific fields when changing away from restapi
    if (field === 'dataType' && value !== 'restapi') {
      updatedParameters[index].apiUrl = '';
      updatedParameters[index].displayType = 'dropdown';
      updatedParameters[index].apiMethod = 'GET';
      updatedParameters[index].apiHeaders = '';
      updatedParameters[index].responseDataPath = '';
      updatedParameters[index].labelField = '';
      updatedParameters[index].valueField = '';
    }
    
    setFormData({ ...formData, parameters: updatedParameters });
  };

  // Remove a parameter
  const handleRemoveParameter = (index) => {
    const updatedParameters = [...formData.parameters];
    updatedParameters.splice(index, 1);
    setFormData({ ...formData, parameters: updatedParameters });
  };

  // Validate the form before submission
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Component name is required');
      return false;
    }

    if (isNewSection && !newSectionName.trim()) {
      setError('New section name is required');
      return false;
    }

    if (!isNewSection && !formData.section) {
      setError('Please select a section');
      return false;
    }

    // Validate Python file path
    if (!initialData && !formData.pythonFilePath.trim()) {
      setError('Please enter a valid file path for the Python component');
      return false;
    }

    // Basic path validation
    if (formData.pythonFilePath && !formData.pythonFilePath.endsWith('.py')) {
      setError('Python file path must end with .py extension');
      return false;
    }

    for (const param of formData.parameters) {
      if (!param.name.trim()) {
        setError('All parameters must have a name');
        return false;
      }

      if (param.dataType === 'file') {
        if (param.acceptedExtensions && !param.acceptedExtensions.split(',').every(ext => ext.trim().startsWith('.'))) {
          setError(`File extensions for parameter "${param.name}" should start with a dot (e.g., .csv, .txt)`);
          return false;
        }

        if (param.maxFileSize && isNaN(parseFloat(param.maxFileSize))) {
          setError(`Max file size for parameter "${param.name}" must be a number in MB`);
          return false;
        }
      }

      // Validate REST API parameters
      if (param.dataType === 'restapi') {
        if (!param.apiUrl.trim()) {
          setError(`API URL is required for REST API parameter "${param.name}"`);
          return false;
        }

        // Basic URL validation
        try {
          // Allow relative URLs starting with /
          if (!param.apiUrl.startsWith('/')) {
            new URL(param.apiUrl);
          }
        } catch {
          setError(`Invalid API URL for parameter "${param.name}"`);
          return false;
        }

        // For object arrays, labelField is required. For simple arrays, it's optional
        if (param.responseDataPath && !param.labelField.trim()) {
          setError(`Label field is required when using Response Data Path for REST API parameter "${param.name}"`);
          return false;
        }
      }
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const submitData = {
        name: formData.name,
        section: isNewSection ? newSectionName : selectedSection,
        parameters: formData.parameters,
        description: formData.description || '',
        pythonFilePath: formData.pythonFilePath, // Only path, no file
        icon: formData.icon
      };

      console.log('Submitting data:', submitData);

      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error('Error saving component:', error.response?.data || error.message);
      setError(error.response?.data?.detail || 'Error saving component. Please check the server logs.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render REST API parameter fields
  const renderRestApiFields = (parameter, index) => {
    return (
      <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#e3f2fd', borderRadius: '0.25rem' }}>
        <h6 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: '600', color: '#1976d2' }}>
          <i className="fas fa-cloud" style={{ marginRight: '0.5rem' }}></i>
          REST API Configuration
        </h6>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>API URL *</label>
          <input
            type="text"
            value={parameter.apiUrl || ''}
            onChange={(e) => handleParameterChange(index, "apiUrl", e.target.value)}
            style={styles.input}
            placeholder="Enter API URL with placeholders"
            disabled={isLoading}
            required
          />
          <small style={styles.helpText}>
            Use placeholders to access parent node data. Examples:
          </small>
          
          {/* Placeholder Examples */}
          <div style={{
            marginTop: '0.5rem',
            padding: '0.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '0.25rem',
            fontSize: '0.75rem'
          }}>
            <div><strong>Available Placeholders:</strong></div>
            <div style={{ marginTop: '0.25rem' }}>
              <code style={{ backgroundColor: '#e9ecef', padding: '0.1rem 0.3rem', borderRadius: '0.2rem' }}>
                {'{parent_output}'}
              </code> - Default output (filePath, output, result, or data)
            </div>
            <div style={{ marginTop: '0.25rem' }}>
              <code style={{ backgroundColor: '#e9ecef', padding: '0.1rem 0.3rem', borderRadius: '0.2rem' }}>
                {'{parent_result.parameterName}'}
              </code> - Specific parameter from parent node
            </div>
            <div style={{ marginTop: '0.5rem', color: '#0c5460' }}>
              <strong>Examples:</strong>
              <div>• <code>/utils/get_columns/{'{parent_result.inputFile}'}</code></div>
              <div>• <code>/utils/process/{'{parent_result.datasetPath}'}</code></div>
              <div>• <code>/utils/analyze/{'{parent_output}'}</code></div>
            </div>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>HTTP Method</label>
          <select
            value={parameter.apiMethod || 'GET'}
            onChange={(e) => handleParameterChange(index, "apiMethod", e.target.value)}
            style={styles.input}
            disabled={isLoading}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Display Type</label>
          <select
            value={parameter.displayType || 'dropdown'}
            onChange={(e) => handleParameterChange(index, "displayType", e.target.value)}
            style={styles.input}
            disabled={isLoading}
          >
            <option value="dropdown">Dropdown (single selection)</option>
            <option value="multichoice">Multi-choice (multiple selection)</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Response Data Path</label>
          <input
            type="text"
            value={parameter.responseDataPath || ''}
            onChange={(e) => handleParameterChange(index, "responseDataPath", e.target.value)}
            style={styles.input}
            placeholder="data.items or leave empty for root array"
            disabled={isLoading}
          />
          <small style={styles.helpText}>
            JSONPath to the array in the API response (e.g., "data.items"). Leave empty if response is already an array.
          </small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Label Field</label>
          <input
            type="text"
            value={parameter.labelField || ''}
            onChange={(e) => handleParameterChange(index, "labelField", e.target.value)}
            style={styles.input}
            placeholder="name (or leave empty for simple arrays)"
            disabled={isLoading}
          />
          <small style={styles.helpText}>
            Field name to use as display label. Leave empty for simple string arrays.
          </small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Value Field</label>
          <input
            type="text"
            value={parameter.valueField || ''}
            onChange={(e) => handleParameterChange(index, "valueField", e.target.value)}
            style={styles.input}
            placeholder="id (optional, defaults to label field)"
            disabled={isLoading}
          />
          <small style={styles.helpText}>
            Field name to use as the actual value. If empty, the label field will be used.
          </small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Request Headers (JSON)</label>
          <textarea
            value={parameter.apiHeaders || ''}
            onChange={(e) => handleParameterChange(index, "apiHeaders", e.target.value)}
            style={{ ...styles.input, minHeight: '60px' }}
            placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
            disabled={isLoading}
          />
          <small style={styles.helpText}>
            Optional HTTP headers as JSON object. Leave empty if no headers are needed.
          </small>
        </div>

        <div style={{
          padding: '0.5rem',
          backgroundColor: '#fff3cd',
          color: '#856404',
          borderRadius: '0.25rem',
          fontSize: '0.8rem',
          border: '1px solid #ffeaa7'
        }}>
          <i className="fas fa-lightbulb" style={{ marginRight: '0.35rem' }}></i>
          <strong>Pro Tip:</strong> Use specific parameter names like <code>{'{parent_result.inputFile}'}</code> when the parent node has multiple parameters.
        </div>
      </div>
    );
  };

  // Render a parameter form group
  const renderParameterFields = (parameter, index) => {
    return (
      <div key={index} style={{
        border: '1px solid #dee2e6',
        borderRadius: '0.25rem',
        padding: '0.75rem',
        marginBottom: '0.75rem',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid #dee2e6'
        }}>
          <h6 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>Parameter {index + 1}</h6>
          <button
            onClick={() => handleRemoveParameter(index)}
            disabled={formData.parameters.length === 1 || isLoading}
            style={{
              padding: '0.2rem 0.4rem',
              backgroundColor: '#e74a3b',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
            type="button"
          >
            <i className="fas fa-times"></i> Remove
          </button>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Name *</label>
          <input
            type="text"
            value={parameter.name}
            onChange={(e) => handleParameterChange(index, "name", e.target.value)}
            style={styles.input}
            placeholder="Enter parameter name"
            disabled={isLoading}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Data Type</label>
          <select
            value={parameter.dataType}
            onChange={(e) => handleParameterChange(index, "dataType", e.target.value)}
            style={styles.input}
            disabled={isLoading}
          >
            <option value="string">String</option>
            <option value="integer">Integer</option>
            <option value="float">Float</option>
            <option value="boolean">Boolean</option>
            <option value="file">File</option>
            <option value="restapi">REST API</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Description</label>
          <input
            type="text"
            value={parameter.description || ''}
            onChange={(e) => handleParameterChange(index, "description", e.target.value)}
            style={styles.input}
            placeholder="Enter parameter description"
            disabled={isLoading}
          />
        </div>

        {/* REST API specific fields */}
        {parameter.dataType === 'restapi' && renderRestApiFields(parameter, index)}

        {parameter.dataType === 'string' && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Possible Values (Optional)</label>
            <textarea
              value={parameter.possibleValues || ''}
              onChange={(e) => handleParameterChange(index, "possibleValues", e.target.value)}
              style={{ ...styles.input, minHeight: '60px' }}
              placeholder="Enter each possible value on a new line"
              disabled={isLoading}
            />
            <small style={styles.helpText}>
              Enter one value per line. If provided, this will create a dropdown selection.
            </small>
          </div>
        )}

        {parameter.dataType === 'file' && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Accepted File Extensions</label>
              <input
                type="text"
                value={parameter.acceptedExtensions || ''}
                onChange={(e) => handleParameterChange(index, "acceptedExtensions", e.target.value)}
                style={styles.input}
                placeholder=".csv, .txt, .xlsx"
                disabled={isLoading}
              />
              <small style={styles.helpText}>
                Comma-separated list of file extensions (e.g., .csv, .txt, .xlsx)
              </small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Maximum File Size (MB)</label>
              <input
                type="number"
                value={parameter.maxFileSize || ''}
                onChange={(e) => handleParameterChange(index, "maxFileSize", e.target.value)}
                style={styles.input}
                placeholder="10"
                step="0.1"
                min="0"
                disabled={isLoading}
              />
              <small style={styles.helpText}>
                Maximum file size in megabytes (MB) - for validation purposes
              </small>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <input
                type="checkbox"
                id={`allowMultiple-${index}`}
                checked={parameter.allowMultiple || false}
                onChange={(e) => handleParameterChange(index, "allowMultiple", e.target.checked)}
                disabled={isLoading}
                style={{ marginRight: '0.5rem' }}
              />
              <label htmlFor={`allowMultiple-${index}`} style={{ fontSize: '0.85rem' }}>
                Allow multiple files
              </label>
            </div>
          </>
        )}

        {parameter.dataType !== 'file' && parameter.dataType !== 'boolean' && parameter.dataType !== 'restapi' && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Default Value</label>
            <input
              type="text"
              value={parameter.defaultValue || ''}
              onChange={(e) => handleParameterChange(index, "defaultValue", e.target.value)}
              style={styles.input}
              placeholder={`Default value for ${parameter.dataType}`}
              disabled={isLoading}
            />
          </div>
        )}

        {parameter.dataType === 'boolean' && (
          <div style={{ marginBottom: '0.5rem' }}>
            <input
              type="checkbox"
              id={`default-${index}`}
              checked={parameter.defaultValue === 'true'}
              onChange={(e) => handleParameterChange(index, "defaultValue", e.target.checked ? 'true' : 'false')}
              disabled={isLoading}
              style={{ marginRight: '0.5rem' }}
            />
            <label htmlFor={`default-${index}`} style={{ fontSize: '0.85rem' }}>
              Default Value (checked = true)
            </label>
          </div>
        )}

        <div style={{ marginBottom: '0.5rem' }}>
          <input
            type="checkbox"
            id={`required-${index}`}
            checked={parameter.required}
            onChange={(e) => handleParameterChange(index, "required", e.target.checked)}
            disabled={isLoading}
            style={{ marginRight: '0.5rem' }}
          />
          <label htmlFor={`required-${index}`} style={{ fontSize: '0.85rem' }}>
            Required
          </label>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      title={initialData ? "Edit Component" : "Create New Component"}
      onClose={onClose}
      onSave={handleSubmit}
      saveButtonText={isLoading ? "Saving..." : (initialData ? "Update Component" : "Create Component")}
      size="md"
    >
      {error && (
        <div style={{
          padding: '0.5rem 0.75rem',
          marginBottom: '0.75rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '0.25rem',
          fontSize: '0.85rem',
          border: '1px solid #f5c6cb'
        }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: '0.35rem' }}></i>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ fontSize: '0.85rem' }}>
        <div style={styles.formGroup}>
          <label htmlFor="componentName" style={styles.label}>Component Name *</label>
          <input
            type="text"
            id="componentName"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter component name"
            required
            disabled={isLoading}
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Section *</label>
          <div style={{
            position: 'relative',
            marginBottom: isNewSection ? '0.75rem' : '0'
          }}>
            <div
              onClick={toggleSectionDropdown}
              style={{
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.375rem 0.5rem',
                backgroundColor: '#fff',
                border: '1px solid #ced4da',
                borderRadius: '0.25rem',
                fontSize: '0.85rem'
              }}
            >
              <span>{selectedSection || "Select Section"}</span>
              <i className={`fas fa-chevron-${showSectionDropdown ? 'up' : 'down'}`} style={{ marginLeft: '0.5rem' }}></i>
            </div>

            {showSectionDropdown && !isLoading && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 10,
                width: '100%',
                backgroundColor: '#fff',
                border: '1px solid #ced4da',
                borderRadius: '0.25rem',
                boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
                maxHeight: '200px',
                overflowY: 'auto',
                marginTop: '2px'
              }}>
                {sections.map((section, index) => (
                  <div
                    key={index}
                    onClick={() => handleSectionSelect(section)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      borderBottom: index < sections.length - 1 ? '1px solid #e9ecef' : 'none',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {section.name}
                  </div>
                ))}
                <div style={{ height: '1px', backgroundColor: '#e9ecef', margin: '0.25rem 0' }}></div>
                <div
                  onClick={() => handleSectionSelect('new')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <i className="fas fa-plus-circle" style={{ marginRight: '0.5rem', color: '#4e73df' }}></i> New Section
                </div>
              </div>
            )}
          </div>
        </div>

        {isNewSection && (
          <div style={styles.formGroup}>
            <label style={styles.label}>New Section Name *</label>
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Enter new section name"
              required
              disabled={isLoading}
              style={styles.input}
            />
          </div>
        )}

              <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Component Icon
        </label>
        <IconPicker
          value={formData.iconConfig}
          onChange={handleIconChange}
          disabled={false}
        />
        <small style={{ color: '#6c757d', marginTop: '0.25rem', display: 'block' }}>
          Select an icon from the library or upload your own
        </small>
      </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Component Icon</label>
          <input
            type="file"
            onChange={handleIconUpload}
            accept="image/png,image/jpeg,image/gif,image/svg+xml"
            disabled={isLoading}
            style={styles.input}
          />
          <small style={styles.helpText}>
            Upload an icon for your component (PNG, JPEG, GIF, or SVG)
          </small>

          {formData.iconPreview && (
            <div style={{ marginTop: '0.5rem' }}>
              <img
                src={formData.iconPreview}
                alt="Icon Preview"
                style={{
                  maxWidth: '80px',
                  maxHeight: '80px',
                  border: '1px solid #dee2e6',
                  padding: '0.25rem',
                  borderRadius: '0.25rem'
                }}
              />
            </div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter component description"
            rows="2"
            disabled={isLoading}
            style={{
              ...styles.input,
              resize: 'vertical',
              minHeight: '60px'
            }}
          />
        </div>

        {/* Python Implementation File Path */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Python Implementation File Path {!initialData && '*'}</label>
          
          <div style={styles.pathInputContainer}>
            <i className="fas fa-folder-open" style={styles.pathIcon}></i>
            <input
              type="text"
              value={formData.pythonFilePath}
              onChange={handlePythonPathInput}
              placeholder="/path/to/your/component.py"
              disabled={isLoading}
              required={!initialData}
              style={styles.pathInput}
            />
          </div>

          <small style={styles.helpText}>
            Enter the absolute or relative path to a Python file on the server containing the component logic.
          </small>

          {/* File Path Display */}
          {formData.pythonFilePath && (
            <div style={{
              marginTop: '0.5rem',
              fontSize: '0.8rem',
              padding: '0.5rem',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '0.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <i className="fas fa-folder-open" style={{ marginRight: '0.5rem', color: '#4e73df' }}></i>
                <strong>Path:</strong> <span style={{ marginLeft: '0.5rem' }}>{formData.pythonFilePath}</span>
              </div>
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
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>Component Parameters</h5>
            <button
              type="button"
              onClick={handleAddParameter}
              disabled={isLoading}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#4e73df',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <i className="fas fa-plus"></i> Add Parameter
            </button>
          </div>

          <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: '#6c757d' }}>
            Define the parameters that users will configure when adding this component to a workflow.
          </div>

          {formData.parameters.map((parameter, index) => (
            renderParameterFields(parameter, index)
          ))}
        </div>

        <div style={{
          padding: '0.5rem 0.75rem',
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          borderRadius: '0.25rem',
          fontSize: '0.8rem',
          border: '1px solid #bee5eb'
        }}>
          <i className="fas fa-info-circle" style={{ marginRight: '0.35rem' }}></i>
          <strong>Note:</strong> Make sure the Python file exists at the specified path and contains the component logic.
        </div>
      </form>
    </Modal>
  );
};