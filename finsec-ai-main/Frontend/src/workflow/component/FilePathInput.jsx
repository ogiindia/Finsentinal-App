// src/components/FilePathInput.jsx
import React from 'react';

/**
 * Simple File Path Input Component for specifying file paths only
 */
export const FilePathInput = ({ 
  name, 
  label, 
  value, 
  onChange, 
  description, 
  acceptedExtensions, 
  maxFileSize, 
  allowMultiple = false,
  disabled = false,
  required = false,
  placeholder = "/path/to/your/file"
}) => {
  
  // Handle path input
  const handlePathChange = (e) => {
    const path = e.target.value;
    if (onChange) {
      onChange(name, {
        fileName: path.split('/').pop() || path,
        fileSize: 0,
        fileType: '',
        filePath: path,
        isNewFile: false,
        isPathInput: true
      });
    }
  };
  
  // Get current file info
  const fileData = value && typeof value === 'object' ? value : null;
  const pathValue = fileData?.filePath || '';
  
  const formStyles = {
    formGroup: {
      marginBottom: '0.75rem'
    },
    label: {
      display: 'block',
      marginBottom: '0.25rem',
      fontSize: '0.85rem',
      fontWeight: '500',
      color: '#333'
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
      backgroundColor: disabled ? '#e9ecef' : '#fff',
      border: '1px solid #ced4da',
      borderRadius: '0.25rem',
      boxSizing: 'border-box'
    },
    fileInfoDisplay: {
      marginTop: '0.5rem',
      padding: '0.5rem',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '0.25rem',
      fontSize: '0.75rem'
    }
  };
  
  return (
    <div style={formStyles.formGroup}>
      {label && (
        <label style={formStyles.label}>
          {label}
          {required && <span style={{ color: '#dc3545', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      
      {/* File Path Input */}
      <div style={formStyles.pathInputContainer}>
        <i className="fas fa-folder-open" style={formStyles.pathIcon}></i>
        <input
          type="text"
          value={pathValue}
          onChange={handlePathChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={formStyles.pathInput}
        />
      </div>
      
      {/* File Info Display */}
      {fileData && fileData.filePath && (
        <div style={formStyles.fileInfoDisplay}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
            <i className="fas fa-folder-open" style={{ marginRight: '0.5rem', color: '#4e73df' }}></i>
            <strong>File Path:</strong>
            <span style={{ marginLeft: '0.5rem' }}>{fileData.fileName}</span>
          </div>
          <div><strong>Full Path:</strong> {fileData.filePath}</div>
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
      
      {/* Help Text and Constraints */}
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

export default FilePathInput;