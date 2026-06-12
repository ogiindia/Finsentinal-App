// src/components/Modal.jsx
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import './Modal.css';

export const Modal = ({ isOpen, title, children, onClose, onSave, size = 'md', saveButtonText = 'Save Configuration' }) => {
  if (!isOpen) return null;
  
  // Add overflow hidden to body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    
    // Cleanup when modal closes
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  // Prevent click propagation from modal content to overlay
  const handleModalClick = (e) => {
    e.stopPropagation();
  };
  
  // Create the modal content
  const modalContent = (
    <div 
      onClick={onClose}
      className="modal-overlay"
    >
      <div 
        onClick={handleModalClick}
        className={`modal-container ${size}`}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
          </div>
          <div className="modal-body">
            {children}
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              onClick={onClose}
              className="modal-close-button mx-2"
            >
              Close
            </button>
            <button 
              type="button" 
              onClick={onSave}
              className="modal-save-button"
            >
              {saveButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Use a portal to render the modal directly in the document body
  // This ensures it's not constrained by any parent container
  return ReactDOM.createPortal(modalContent, document.body);
};