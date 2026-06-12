// AppLayout.jsx
import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function AppLayout({ userSession, sessionTime, onLogout, loading, themeColor }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        userSession={userSession}
        sessionTime={sessionTime}
        handleLogout={onLogout}
        loading={loading}       // still used
        themeColor={themeColor}
      />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
