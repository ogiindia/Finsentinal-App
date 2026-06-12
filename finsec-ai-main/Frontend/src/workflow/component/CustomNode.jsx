// src/components/CustomNode.jsx
import React from 'react';
import { Handle, Position } from 'reactflow';

export const CustomNode = ({ data }) => {
  const { nodeType, label, icon, iconData, onEdit, onDelete } = data;
  
  // Determine if the node should have input/output handles
  const hasInputHandle = nodeType !== 'data'; // All except data nodes have inputs
  const hasOutputHandle = nodeType !== 'model'; // All except model nodes have outputs
  
  // Handle icon rendering - prioritize iconData (base64) over Font Awesome icons
  const renderIcon = () => {
    if (iconData) {
      // If we have base64 icon data, render it as an image
      return (
        <img 
          src={`data:image/png;base64,${iconData}`} 
          alt={label}
          className="component-icon" 
        />
      );
    } else if (icon) {
      // If we have a Font Awesome icon class, render it
      return <i className={`fas fa-${icon}`}></i>;
    } else {
      // Fallback to puzzle piece icon
      return <i className="fas fa-puzzle-piece"></i>;
    }
  };
  
  return (
    <div className={`pipeline-icon ${nodeType === 'custom' ? 'custom-component' : ''}`}>
      {/* Input handle */}
      {hasInputHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="connection-point start"
        />
      )}
      
      {/* Node content */}
      {renderIcon()}
      
      <div className="node-label">{label}</div>
      
      {/* Parameter values summary for custom components */}
      {nodeType === 'custom' && data.parameterValues && (
        <div className="parameter-summary">
          {/* Display a few key parameters if needed */}
          {Object.keys(data.parameterValues || {}).length > 0 && (
            <small className="parameters-badge">
              {Object.keys(data.parameterValues).length} params
            </small>
          )}
        </div>
      )}
      
      {/* Node action buttons */}
      <div className="node-actions">
        <button className="edit-button" onClick={onEdit} title="Edit">
          <i className="fas fa-edit"></i>
        </button>
        
        {/* Only show delete button for custom components or if explicitly enabled */}
        {(nodeType === 'custom' || data.showDelete) && (
          <button className="delete-button" onClick={onDelete} title="Delete">
            <i className="fas fa-trash"></i>
          </button>
        )}
      </div>
      
      {/* Output handle */}
      {hasOutputHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="connection-point end"
        />
      )}
    </div>
  );
};