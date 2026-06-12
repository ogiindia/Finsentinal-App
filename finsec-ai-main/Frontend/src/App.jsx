import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import PlaceholderPage from './pages/PlaceholderPage';
import CaseManagerPage from './pages/CaseManagerPage';
import ModelStatsPage from './components/ModelStatsPage';
import DashboardAnalysis from './components/DashboardAnalysis';
import CustomerProfilingPage from './pages/CustomerProfilingPage';
import UserAccessManager from './pages/UserAccessManager';
import MulePage from './pages/MulePage';
import ModelConfigPage from './pages/ModelConfigPage';
import { API_BASE_URL } from './service/service';
import RetrainDashboard from './pages/RetrainDashboard';
import WorkflowApp from './workflow/WorkflowApp';
import WizardNavigator from './makerchecker/WizardNavigator';
import FeatureListPage from './pages/FeatureListPage';
import { Toaster } from 'react-hot-toast';

const themeColor = '#0D1B2A';

const LoginPage = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

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
      // console.log(data)
      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage('Login successful!');
        setError(null);
        setLoginData({ username: '', password: '' });
        setTimeout(() => {
          onLogin(data);
        }, 500);
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
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <img src="/src/finlogo.png" alt="FinSentinel Logo" width='80px' height='80px' />
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
            <input type="text" value={loginData.username} onChange={(e) => setLoginData({ ...loginData, username: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }} placeholder="Enter username" />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} style={{ width: '100%', padding: '0.5rem', paddingRight: '2.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }} placeholder="Enter password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                {showPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', backgroundColor: themeColor, color: 'white', padding: '0.75rem', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="#6b7280" />
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Session timeout: 1 hour</span>
          </div>
        </form>
      </div>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userSession, setUserSession] = useState(null);
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const [userData, setUserData] = useState(null);
  const [sessionTime, setSessionTime] = useState('--:--');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const isLoggingOut = useRef(false);
  const hasCheckedSession = useRef(false);

  useEffect(() => {
    if (!hasCheckedSession.current) {
      hasCheckedSession.current = true;
      checkSession();
    }
  }, []);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }

    setIsAuthenticated(false);
    setUserSession(null);
    setSessionTimeout(null);
    setSessionTime('--:--');
    isLoggingOut.current = false;
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!isAuthenticated || !sessionTimeout) return;

    timerRef.current = setInterval(() => {
      const now = new Date().getTime();
      const timeLeft = sessionTimeout - now;

      if (timeLeft <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        handleLogout();
      } else {
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        setSessionTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, sessionTimeout, handleLogout]);

  const checkSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/session`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.authenticated) {
        const timeoutMinutes = data.sessionTimeout || 15;
        const timeoutMs = new Date().getTime() + (timeoutMinutes * 60 * 1000);

        setIsAuthenticated(true);
        setUserSession(data.username);
        setSessionTimeout(timeoutMs);
        setUserData(data);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (data) => {
    const timeoutMinutes = data.sessionTimeout || 15;
    const timeoutMs = new Date().getTime() + (timeoutMinutes * 60 * 1000);

    setIsAuthenticated(true);
    setUserSession(data.username);
    setSessionTimeout(timeoutMs);
    setUserData(data);
    navigate('/home');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', color: themeColor }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {isAuthenticated ? (
        <>
          <Header
            userData={userData}
            userSession={userSession}
            sessionTime={sessionTime}
            handleLogout={handleLogout}
            loading={false}
            themeColor={themeColor}
          />
          <Toaster position="top-right" />
          <Routes>
            <Route path="/home" element={<HomePage userData={userData}/>} />
            <Route path="/profiling" element={<CustomerProfilingPage />} />
            <Route
              path="/case-manager"
              element={
                <CaseManagerPage
                  userSession={userSession}
                  sessionTime={sessionTime}
                  handleLogout={handleLogout}
                  loading={false}
                  themeColor={themeColor}
                />
              }
            />
            <Route path="/mule" element={<MulePage themeColor={themeColor} />} />
            <Route path="/workflow" element={<WorkflowApp />} />
            <Route path="/model-stats" element={<ModelStatsPage userData={userData}/>} />
            <Route path="/model-config" element={<ModelConfigPage />} />
            <Route path="/makerchecker" element={<WizardNavigator />} />
            <Route path="/dashboardanalysis" element={<DashboardAnalysis />} />
            <Route path="/user-access" element={<UserAccessManager userData={userData} />} />
            <Route path="/feature-list" element={<FeatureListPage themeColor={themeColor} />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </div>
  );
}

export default App;
