// src/components/modals/CreatePipelineModal.jsx
import React, { useState } from 'react';
import { Modal } from '../Modal';
import '../Modal.css'; // Import the new Modal CSS

export const CreatePipelineModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const [pipelineName, setPipelineName] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState('');
  
  const handleSave = () => {
    // Validate pipeline name
    if (!pipelineName.trim()) {
      setValidationError('Please enter a pipeline name');
      return;
    }
    
    // Clear validation error if we've passed validation
    setValidationError('');
    
    // Call the parent save function
    onSave(pipelineName, description);
  };
  
  return (
    <Modal 
      isOpen={isOpen} 
      title="Save Workflow" 
      onClose={onClose} 
      onSave={handleSave}
      saveButtonText={isLoading ? "Saving..." : "Save Workflow"}
      size="md"
    >
      {validationError && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
          {validationError}
        </div>
      )}
      
      <div className="form-group">
        <label htmlFor="pipelineName">Workflow Name *</label>
        <input 
          type="text" 
          className="form-control" 
          id="pipelineName" 
          value={pipelineName}
          onChange={(e) => setPipelineName(e.target.value)}
          placeholder="Enter a name for your workflow"
          disabled={isLoading}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="pipelineDescription">Description (Optional)</label>
        <textarea 
          className="form-control" 
          id="pipelineDescription" 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter a description for your workflow"
          rows="3"
          disabled={isLoading}
        />
      </div>
      
      <div className="alert alert-info">
        <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
        Saving this workflow will store the complete pipeline, including all components, connections, and configurations. You can load it later to continue working on it or run it with different inputs.
      </div>
    </Modal>
  );
};

export default CreatePipelineModal;