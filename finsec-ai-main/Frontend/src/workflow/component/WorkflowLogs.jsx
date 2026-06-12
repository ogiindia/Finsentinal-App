// src/components/WorkflowLogs.jsx - Updated for embedded mode
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './Modal.css';

const WorkflowLogs = ({ isOpen, onClose, workflowId, workflowName, embedded = false }) => {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  
  const logsContainerRef = useRef(null);
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const API_BASE_URL_WORKFLOW = 'http://localhost:8002/workflow';
  
  // WebSocket connection for real-time logs
  useEffect(() => {
    if (!isOpen || !workflowId) return;
    
    const connectWebSocket = () => {
      try {
        // Create WebSocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${API_BASE_URL_WORKFLOW}/temporal/workflow/${workflowId}/logs/ws`;
        
        console.log('Connecting to WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setConnectionError(null);
        };
        
        ws.onmessage = (event) => {
          try {
            const logEntry = JSON.parse(event.data);
            
            // Normalize the log entry to ensure consistent structure
            const normalizedLogEntry = {
              timestamp: logEntry.timestamp || new Date().toISOString(),
              level: (logEntry.level || 'info').toLowerCase(), // Ensure lowercase
              message: logEntry.message || '',
              component: logEntry.component || 'system',
              stream: logEntry.stream || null,
              run_id: logEntry.run_id || null
            };
            
            setLogs(prevLogs => [...prevLogs, normalizedLogEntry]);
          } catch (error) {
            console.error('Error parsing log message:', error);
          }
        };
        
        ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          setIsConnected(false);
          
          // Attempt to reconnect after a delay (unless the modal was closed)
          if (isOpen && !reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connectWebSocket();
            }, 3000);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
          // setConnectionError('Failed to connect to log stream');
        };
        
        websocketRef.current = ws;
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        setIsConnected(false);
        setConnectionError('Failed to create WebSocket connection');
      }
    };
    
    // Load existing logs first
    loadExistingLogs().then(() => {
      // Then connect to WebSocket for real-time updates
      connectWebSocket();
    });

    // Set up automatic refresh interval
    refreshIntervalRef.current = setInterval(() => {
      if (isOpen && workflowId) {
        loadExistingLogs();
      }
    }, 5000); // Refresh every 5 seconds
    
    // Cleanup WebSocket and intervals on unmount or when modal closes
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isOpen, workflowId]);
  
  // Load existing logs from the API
  const loadExistingLogs = async () => {
    if (!workflowId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL_WORKFLOW}/temporal/workflow/${workflowId}/logs`);
      const data = await response.json();
      
      if (data.logs) {
        // Normalize all logs to ensure consistent structure
        const normalizedLogs = data.logs.map(log => ({
          timestamp: log.timestamp || new Date().toISOString(),
          level: (log.level || 'info').toLowerCase(), // Ensure lowercase
          message: log.message || '',
          component: log.component || 'system',
          stream: log.stream || null,
          run_id: log.run_id || null
        }));
        
        setLogs(normalizedLogs);
        setLastRefreshTime(new Date());
      }
    } catch (error) {
      console.error('Error loading existing logs:', error);
      setConnectionError('Failed to load existing logs');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);
  
  // Handle manual scroll to disable auto-scroll when user scrolls up
  const handleScroll = () => {
    if (!logsContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    
    setAutoScroll(isAtBottom);
  };
  
  // Filter logs based on selected level
  const filteredLogs = logs.filter(log => {
    if (filterLevel === 'all') return true;
    return log.level === filterLevel;
  });
  
  // Get log level color
  const getLogLevelColor = (level) => {
    const normalizedLevel = (level || 'info').toLowerCase().trim();
    
    switch (normalizedLevel) {
      case 'error':
        return '#dc3545';
      case 'warning':
      case 'warn':
        return '#ffc107';
      case 'info':
        return '#17a2b8';
      case 'debug':
        return '#6c757d';
      case 'success':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };
  
  // Get log level icon
  const getLogLevelIcon = (level) => {
    const normalizedLevel = (level || 'info').toLowerCase().trim();
    
    switch (normalizedLevel) {
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'warning':
      case 'warn':
        return 'fas fa-exclamation-triangle';
      case 'info':
        return 'fas fa-info-circle';
      case 'debug':
        return 'fas fa-bug';
      case 'success':
        return 'fas fa-check-circle';
      default:
        return 'fas fa-circle';
    }
  };
  
  // Get log level background color for better visibility
  const getLogLevelBackgroundColor = (level) => {
    const normalizedLevel = (level || 'info').toLowerCase().trim();
    
    switch (normalizedLevel) {
      case 'error':
        return '#fff5f5';
      case 'warning':
      case 'warn':
        return '#fffbf0';
      case 'info':
        return '#f0f9ff';
      case 'debug':
        return '#f8f9fa';
      case 'success':
        return '#f0fff4';
      default:
        return '#ffffff';
    }
  };
  
  // Clear logs
  const handleClearLogs = async () => {
    if (!workflowId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL_WORKFLOW}/temporal/workflow/${workflowId}/logs/clear`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setLogs([]);
      }
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (error) {
      return timestamp;
    }
  };
  
  // Scroll to bottom manually
  const scrollToBottom = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  // Format last refresh time
  const formatLastRefreshTime = () => {
    if (!lastRefreshTime) return 'Never';
    return lastRefreshTime.toLocaleTimeString();
  };
  
  if (!isOpen) return null;
  
  // Render content for embedded mode
  const renderContent = () => (
    <>
      {/* Controls */}
      <div style={{
        padding: '0.75rem',
        borderBottom: '1px solid #e9ecef',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        backgroundColor: embedded ? '#f8f9fa' : 'transparent'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Connection status */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '5px',
            fontSize: '0.75rem',
            color: isConnected ? '#28a745' : '#dc3545'
          }}>
            {/* <i className={`fas fa-circle ${isConnected ? 'fa-pulse' : ''}`}></i>
            {isConnected ? 'Connected' : 'Disconnected'} */}
          </div>
          
          {/* Filter by log level */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '500' }}>Filter:</label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                border: '1px solid #ced4da',
                borderRadius: '0.25rem'
              }}
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
              <option value="success">Success</option>
            </select>
          </div>
          
          {/* Auto-scroll toggle */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '5px',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
          
          {/* Log count */}
          <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>
            {filteredLogs.length} / {logs.length} logs
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Scroll to bottom button */}
          <button
            onClick={scrollToBottom}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <i className="fas fa-arrow-down"></i>
            Bottom
          </button>
          
          {/* Refresh button */}
          <button
            onClick={loadExistingLogs}
            disabled={isLoading}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: '#4e73df',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i>
            Refresh
          </button>
          
          {/* Clear logs button */}
          <button
            onClick={handleClearLogs}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <i className="fas fa-trash"></i>
            Clear
          </button>
        </div>
      </div>
      
      {/* Connection error */}
      {connectionError && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.8rem'
        }}>
          <i className="fas fa-exclamation-triangle"></i>
          {connectionError}
          <button
            onClick={loadExistingLogs}
            style={{
              marginLeft: 'auto',
              padding: '0.2rem 0.4rem',
              fontSize: '0.7rem',
              backgroundColor: '#721c24',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Logs container */}
      <div
        ref={logsContainerRef}
        onScroll={handleScroll}
        style={{
          height: embedded ? 'calc(100% - 60px)' : '500px',
          overflowY: 'auto',
          backgroundColor: '#f8f9fa',
          padding: '0.75rem',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '0.8rem',
          lineHeight: '1.4'
        }}
      >
        {isLoading && logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
            <i className="fas fa-file-alt"></i>
            <p>No logs available</p>
            {filterLevel !== 'all' && (
              <p style={{ fontSize: '0.75rem' }}>Try changing the filter level</p>
            )}
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: '0.5rem',
                padding: '0.5rem',
                backgroundColor: getLogLevelBackgroundColor(log.level),
                border: '1px solid #e9ecef',
                borderRadius: '0.25rem',
                borderLeft: `4px solid ${getLogLevelColor(log.level)}`
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '0.25rem',
                fontSize: '0.7rem',
                color: '#6c757d'
              }}>
                <span style={{ color: getLogLevelColor(log.level) }}>
                  <i className={getLogLevelIcon(log.level)}></i>
                  {(log.level || 'info').toUpperCase()}
                </span>
                <span>{formatTimestamp(log.timestamp)}</span>
                {log.component && (
                  <span style={{ 
                    backgroundColor: '#e9ecef', 
                    padding: '0.1rem 0.3rem', 
                    borderRadius: '0.2rem' 
                  }}>
                    {log.component}
                  </span>
                )}
                {log.stream && (
                  <span style={{ 
                    backgroundColor: log.stream === 'stderr' ? '#f8d7da' : '#d4edda', 
                    color: log.stream === 'stderr' ? '#721c24' : '#155724',
                    padding: '0.1rem 0.3rem', 
                    borderRadius: '0.2rem' 
                  }}>
                    {log.stream}
                  </span>
                )}
              </div>
              <div style={{ color: '#333', whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                {log.message}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
  
  // For embedded mode, render directly
  if (embedded) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {renderContent()}
      </div>
    );
  }
  
  // For modal mode, use portal
  const modalContent = (
    <div className="modal-overlay">
      <div className="modal-container xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Workflow Logs - {workflowName || `Workflow ${workflowId}`}
            </h5>
          </div>
          
          <div className="modal-body" style={{ padding: '0' }}>
            {renderContent()}
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              onClick={onClose}
              className="modal-close-button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  
  return ReactDOM.createPortal(modalContent, document.body);
};

export default WorkflowLogs;