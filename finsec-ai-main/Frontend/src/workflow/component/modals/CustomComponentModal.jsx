// src/components/modals/CustomComponentModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import '../Modal.css'; // Import the new Modal CSS

export const CustomComponentModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  onDelete,
  initialData,
  componentData
}) => {
  const [formValues, setFormValues] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize form with data when the modal opens
  useEffect(() => {
    if (componentData && componentData.parameterValues) {
      setFormValues(componentData.parameterValues);
    } else {
      setFormValues({});
    }
  }, [componentData]);
  
  if (!isOpen) return null;
  
  // Handle input field changes
  const handleInputChange = (paramName, value) => {
    setFormValues(prev => ({
      ...prev,
      [paramName]: value
    }));
  };
  
  // Handle file inputs specially
  const handleFileChange = (paramName, file) => {
    setFormValues(prev => ({
      ...prev,
      [paramName]: file
    }));
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      // Call the parent component's handler to save the changes
      await onSave(formValues);
      onClose();
    } catch (error) {
      console.error('Error saving component:', error);
      setError('Failed to save component changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle delete
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${componentData.name}"?`)) {
      onDelete();
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      title={`Edit ${componentData?.name || 'Component'}`}
      onClose={onClose}
      onSave={handleSubmit}
      saveButtonText={isLoading ? "Saving..." : "Save Changes"}
      size="md"
    >
      {/* Error Message */}
      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
          {error}
        </div>
      )}

      <div className="modal-form-content">
        {componentData?.parameters?.map((param, index) => (
          <div key={index} className="form-group">
            <label>{param.name}</label>
            
            {/* Render different input types based on parameter dataType */}
            {param.dataType === 'string' && (
              param.possibleValues ? (
                <select 
                  className="form-control"
                  value={formValues[param.name] || ''}
                  onChange={(e) => handleInputChange(param.name, e.target.value)}
                  required={!param.defaultValue}
                  disabled={isLoading}
                >
                  <option value="">Select {param.name}</option>
                  {param.possibleValues.split('\n').filter(v => v.trim()).map((value, i) => (
                    <option key={i} value={value.trim()}>{value.trim()}</option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text"
                  className="form-control"
                  placeholder={`Enter ${param.name}`}
                  value={formValues[param.name] || ''}
                  onChange={(e) => handleInputChange(param.name, e.target.value)}
                  required={!param.defaultValue}
                  disabled={isLoading}
                />
              )
            )}
            
            {param.dataType === 'integer' && (
              <input 
                type="number"
                step="1"
                min={param.min || undefined}
                max={param.max || undefined}
                className="form-control"
                placeholder={`Enter ${param.name}`}
                value={formValues[param.name] || ''}
                onChange={(e) => handleInputChange(param.name, parseInt(e.target.value) || '')}
                required={!param.defaultValue}
                disabled={isLoading}
              />
            )}
            
            {param.dataType === 'float' && (
              <input 
                type="number"
                step="0.01"
                min={param.min || undefined}
                max={param.max || undefined}
                className="form-control"
                placeholder={`Enter ${param.name}`}
                value={formValues[param.name] || ''}
                onChange={(e) => handleInputChange(param.name, parseFloat(e.target.value) || '')}
                required={!param.defaultValue}
                disabled={isLoading}
              />
            )}
            
            {param.dataType === 'boolean' && (
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`edit-param-${index}`}
                  checked={formValues[param.name] === true}
                  onChange={(e) => handleInputChange(param.name, e.target.checked)}
                  disabled={isLoading}
                />
                <label className="form-check-label" htmlFor={`edit-param-${index}`}>
                  {param.name}
                </label>
              </div>
            )}
            
            {param.dataType === 'file' && (
              <div>
                <input 
                  type="file"
                  className="form-control"
                  accept={param.acceptedExtensions || '*'}
                  onChange={(e) => handleFileChange(param.name, e.target.files[0])}
                  required={!param.defaultValue && !formValues[param.name]}
                  multiple={param.allowMultiple}
                  disabled={isLoading}
                />
                {formValues[param.name] && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <small className="text-muted">Current file: {
                      typeof formValues[param.name] === 'string' 
                        ? formValues[param.name] 
                        : formValues[param.name]?.name || 'File selected'
                    }</small>
                  </div>
                )}
                {param.acceptedExtensions && (
                  <small className="form-text text-muted">
                    Accepted formats: {param.acceptedExtensions}
                  </small>
                )}
              </div>
            )}
            
            {param.defaultValue && param.dataType !== 'boolean' && (
              <small className="form-text text-muted">
                Default: {param.defaultValue}
              </small>
            )}
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
        <button 
          type="button" 
          className="btn btn-danger"
          onClick={handleDelete}
          disabled={isLoading}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          <i className="fas fa-trash" style={{ marginRight: '0.5rem' }}></i>
          Delete
        </button>
      </div>
    </Modal>
  );
};