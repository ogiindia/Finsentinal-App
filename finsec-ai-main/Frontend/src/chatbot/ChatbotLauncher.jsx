import React, { useState, useEffect } from 'react';
import './Chatbot.css'; // Include styles for blinking, glowing, positioning, etc.
import ChatbotUI from './ChatbotUI';
import { Bot } from 'lucide-react';

const ChatbotLauncher = ({ serviceFlag ,chatbotPayload }) => {
  // const [showIcon, setShowIcon] = useState(serviceFlag === 'true');
  const [showIcon, setShowIcon] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (serviceFlag) {
      setShowIcon(true);
  }
  }, [serviceFlag]);



  const handleIconClick = () => {
    setChatbotOpen(true);
    setMinimized(false);
  };

  const handleClose = () => {
    setChatbotOpen(false);
  };

  const handleMinimize = () => {
    setMinimized(true);
  };

  const handleMaximize = () => {
    setMinimized(false);
  };

  // if (serviceFlag !== 'yes') return null;

  return (
    <>
  {showIcon && (
    <div className="chatbot-icon blinking" onClick={handleIconClick}>
      {/* 💬 */}
       {/* <Bot /> */}
       <img src="/src/message.png" alt="FinSentinel Logo"  className="w-15 h-12" />
    </div>
  )}
  <div style={{ display: chatbotOpen ? 'block' : 'none' }}>
    <ChatbotUI
      onClose={handleClose}
      onMinimize={handleMinimize}
      onMaximize={handleMaximize}
      minimized={minimized}
      chatbotPayload={chatbotPayload}
    />
  </div>
</>
  );
};


export default ChatbotLauncher;