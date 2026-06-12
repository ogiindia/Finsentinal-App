// src/components/Sidebar.jsx
import React from 'react';
import './Sidebar.css';

export const Sidebar = ({
  onExportPipelineClick,
  onClearCanvasClick,
  isExportEnabled,
  sections = [],
  renderComponents,
  onAddComponentClick
}) => {
  return (
    <div className="custom-sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <h5>Workflow Components</h5>
        <button className="add-btn" onClick={onAddComponentClick} title="Create New Component">
          <i className="fas fa-plus"></i> Create
        </button>
      </div>
      
      {/* Component Sections */}
      <div className="sidebar-content">
        {sections.length === 0 ? (
          <div className="text-center p-3 text-muted">
            <i className="fas fa-info-circle me-2"></i>
            No components available. Click "Create" to add a component.
          </div>
        ) : (
          renderComponents && renderComponents(sections)
        )}
      </div>
      
      {/* Divider */}
      <div className="custom-sidebar-divider"></div>
      
      {/* Footer Actions */}
      <div className="custom-sidebar-footer">
        <a 
          href="#" 
          className={`custom-sidebar-link ${!isExportEnabled ? 'disabled' : ''}`} 
          onClick={isExportEnabled ? onExportPipelineClick : undefined}
        >
          <i className="fas fa-file-export"></i>
          Save Workflow
        </a>
        <a href="#" className="custom-sidebar-link" onClick={onClearCanvasClick}>
          <i className="fas fa-trash"></i>
          Clear Canvas
        </a>
      </div>
    </div>
  );
};

export default Sidebar;