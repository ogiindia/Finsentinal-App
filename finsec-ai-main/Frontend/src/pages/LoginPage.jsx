import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { API_BASE_URL } from '../service/service';

const LoginPage = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const themeColor = '#012834';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!loginData.username || !loginData.password) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage('Login successful!');
        setError(null);
        setLoginData({ username: '', password: '' });
        setTimeout(() => {
          if (typeof onLogin === 'function') {
            onLogin(data.username, data.sessionTimeout);
          } else {
            console.error('onLogin is not a function');
          }
        }, 1000);
      } else {
        setError(data.detail || 'Login failed');
      }
    } catch (err) {
      setError(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4f8' }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '80px', height: '80px', backgroundColor: themeColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <LogIn size={40} color="white" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: themeColor, margin: '0 0 0.5rem 0' }}>FinSentinel AI</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>Sign in to continue</p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} color="#ef4444" />
            <span style={{ color: '#991b1b', fontSize: '0.875rem' }}>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={{ backgroundColor: '#d1fae5', border: '1px solid #10b981', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} color="#10b981" />
            <span style={{ color: '#065f46', fontSize: '0.875rem' }}>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Username</label>
            <input 
              type="text" 
              value={loginData.username} 
              onChange={(e) => setLoginData({ ...loginData, username: e.target.value })} 
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }} 
              placeholder="Enter username" 
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={loginData.password} 
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} 
                style={{ width: '100%', padding: '0.5rem', paddingRight: '2.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }} 
                placeholder="Enter password" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
              >
                {showPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ width: '100%', backgroundColor: themeColor, color: 'white', padding: '0.75rem', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="#6b7280" />
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Session timeout: 15 minutes</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;