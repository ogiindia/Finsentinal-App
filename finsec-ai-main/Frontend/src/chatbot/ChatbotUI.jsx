import React, { useState, useEffect } from 'react';
import './Chatbot.css';
import { Sparkles } from 'lucide-react';

const ChatbotUI = ({ onClose, onMinimize, onMaximize, minimized, maximized, chatbotPayload }) => {
  const [userQuestion, setUserQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [initialized, setInitialized] = useState(false);
  // console.log(chatbotPayload)

  // Load saved messages on mount
useEffect(() => {
  const savedMessages = localStorage.getItem('chatMessages');
  if (savedMessages && JSON.parse(savedMessages).length > 0) {
    setMessages(JSON.parse(savedMessages));
    setInitialized(true);
  }
}, []);

useEffect(() => {
  localStorage.setItem('chatMessages', JSON.stringify(messages));
}, [messages]);

useEffect(() => {
  if (!initialized && messages.length === 0) {
    setInitialized(true);

    // Add initial user message
    setMessages([{ type: 'user', text: 'Can I get the Summary of this Alert' }]);

    // Stream bot response
    setTimeout(async () => {
      setIsTyping(true);
      const botMessage = chatbotPayload;
      let streamedText = '';
      const words = botMessage.split(' ');

      for (let i = 0; i < words.length; i++) {
        streamedText += words[i] + ' ';
        await new Promise(resolve => setTimeout(resolve, 150));
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.type === 'stream') {
            updated[updated.length - 1].text = streamedText;
          } else {
            updated.push({ type: 'stream', text: streamedText });
          }
          return updated;
        });
      }
      setIsTyping(false);
    }, 500);
  }
}, [initialized, messages]);

  // Save messages whenever they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  // Show initial user message and bot response only if no previous chat
 useEffect(() => {
  const savedMessages = localStorage.getItem('chatMessages');
  if (savedMessages && JSON.parse(savedMessages).length > 0) {
    setMessages(JSON.parse(savedMessages));
    setInitialized(true);
  }
}, []);

useEffect(() => {
  if (!initialized && messages.length === 0) {
    setInitialized(true);

    // Add initial user message
    setMessages([{ type: 'user', text: 'Can I get the Summary of this Alert' }]);

    // Stream bot response
    setTimeout(async () => {
      setIsTyping(true);
      const botMessage = chatbotPayload;
      let streamedText = '';
      const words = botMessage.split(' ');

      for (let i = 0; i < words.length; i++) {
        streamedText += words[i] + ' ';
        await new Promise(resolve => setTimeout(resolve, 150));
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.type === 'stream') {
            updated[updated.length - 1].text = streamedText;
          } else {
            updated.push({ type: 'stream', text: streamedText });
          }
          return updated;
        });
      }
      setIsTyping(false);
    }, 500);
  }
}, [initialized, messages]);

  const handleSend = async () => {
    if (!userQuestion.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { type: 'user', text: userQuestion }]);
    setUserQuestion('');

    // Simulate bot response with streaming
    setIsTyping(true);
    const apiResponse = 'Thanks for your question! I will provide details shortly.';
    let streamedText = '';
    const words = apiResponse.split(' ');

    for (let i = 0; i < words.length; i++) {
      streamedText += words[i] + ' ';
      await new Promise(resolve => setTimeout(resolve, 150));
      setMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.type === 'stream') {
          updated[updated.length - 1].text = streamedText;
        } else {
          updated.push({ type: 'stream', text: streamedText });
        }
        return updated;
      });
    }
    setIsTyping(false);
  };

  return (
    <div className={`chatbot-ui ${minimized ? 'minimized' : maximized ? 'fullscreen' : 'normal'}`}>
      {/* Header */}
      <div className="chatbot-header">
        <div className="chatbot-info">
          <h4><Sparkles className="w-6 h-6" /> AI Insights</h4>
        </div>
        <div className="chatbot-controls">
          <button onClick={onMinimize}>_</button>
          <button onClick={onMaximize}>▢</button>
          <button onClick={onClose}>✖</button>
        </div>
      </div>

      {/* Content */}
      {!minimized && (
        <div className="chatbot-content">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.type === 'user' ? 'user' : 'bot'} fade-in`}>
              {msg.text}
            </div>
          ))}

          {isTyping && (
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {!minimized && (
        <div className="chatbot-footer">
          <input
            type="text"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            placeholder="Enter your message..."
          />
          <div className="footer-icons">
            <span role="img" aria-label="emoji">😊</span>
            <span role="img" aria-label="attachment">📎</span>
          </div>
          <button className="send-btn" onClick={handleSend}>➤</button>
        </div>
      )}
    </div>
  );
};

export default ChatbotUI;