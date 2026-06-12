// src/components/NotificationSystem.jsx
import React from 'react';

export const NotificationSystem = ({ notifications }) => {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="notification-container" style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      maxWidth: '400px'
    }}>
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`alert alert-${notification.type} notification`}
          style={{
            marginBottom: '10px',
            padding: '12px 20px',
            borderRadius: '4px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            animation: 'slide-in 0.3s ease-out',
            backgroundColor: getBackgroundColor(notification.type),
            color: getTextColor(notification.type),
            border: `1px solid ${getBorderColor(notification.type)}`
          }}
        >
          {getIcon(notification.type)}
          <span style={{ marginLeft: '10px' }}>{notification.message}</span>
        </div>
      ))}
    </div>
  );
};

// Helper functions for styling notifications
function getBackgroundColor(type) {
  switch (type) {
    case 'success': return '#d4edda';
    case 'info': return '#d1ecf1';
    case 'warning': return '#fff3cd';
    case 'danger': return '#f8d7da';
    default: return '#d1ecf1';
  }
}

function getBorderColor(type) {
  switch (type) {
    case 'success': return '#c3e6cb';
    case 'info': return '#bee5eb';
    case 'warning': return '#ffeeba';
    case 'danger': return '#f5c6cb';
    default: return '#bee5eb';
  }
}

function getTextColor(type) {
  switch (type) {
    case 'success': return '#155724';
    case 'info': return '#0c5460';
    case 'warning': return '#856404';
    case 'danger': return '#721c24';
    default: return '#0c5460';
  }
}

function getIcon(type) {
  switch (type) {
    case 'success': return <i className="fas fa-check-circle"></i>;
    case 'info': return <i className="fas fa-info-circle"></i>;
    case 'warning': return <i className="fas fa-exclamation-triangle"></i>;
    case 'danger': return <i className="fas fa-exclamation-circle"></i>;
    default: return <i className="fas fa-info-circle"></i>;
  }
}

export default NotificationSystem;