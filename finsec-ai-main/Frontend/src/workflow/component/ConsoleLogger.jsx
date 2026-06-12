// src/components/ConsoleLogger.jsx
import React, { useState, useEffect, useRef } from 'react';

/**
 * Component that captures and displays console logs in the UI
 */
const ConsoleLogger = ({ visible = false }) => {
  const [logs, setLogs] = useState([]);
  const logContainerRef = useRef(null);
  
  // Intercept console methods on mount
  useEffect(() => {
    if (!visible) return;
    
    // Store original console methods
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };
    
    // Helper to add a log entry
    const addLogEntry = (type, args) => {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      setLogs(prevLogs => [
        ...prevLogs,
        { type, message, timestamp }
      ]);
    };
    
    // Override console methods
    console.log = (...args) => {
      originalConsole.log(...args);
      addLogEntry('log', args);
    };
    
    console.error = (...args) => {
      originalConsole.error(...args);
      addLogEntry('error', args);
    };
    
    console.warn = (...args) => {
      originalConsole.warn(...args);
      addLogEntry('warn', args);
    };
    
    console.info = (...args) => {
      originalConsole.info(...args);
      addLogEntry('info', args);
    };
    
    // Restore original methods on cleanup
    return () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    };
  }, [visible]);
  
  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);
  
  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };
  
  if (!visible) return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      height: '200px',
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      fontFamily: 'monospace',
      fontSize: '0.8rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{
        padding: '0.5rem',
        backgroundColor: '#333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 'bold' }}>Console Logs</span>
        <button 
          onClick={clearLogs}
          style={{
            backgroundColor: '#555',
            color: 'white',
            border: 'none',
            padding: '0.25rem 0.5rem',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>
      
      <div 
        ref={logContainerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '0.5rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {logs.map((log, index) => {
          // Set color based on log type
          let color = '#d4d4d4'; // default
          if (log.type === 'error') color = '#ff6b6b';
          else if (log.type === 'warn') color = '#ffd166';
          else if (log.type === 'info') color = '#4ecdc4';
          
          return (
            <div key={index} style={{ color, marginBottom: '0.25rem' }}>
              <span style={{ color: '#888' }}>[{log.timestamp}]</span> {log.message}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConsoleLogger;