import React from 'react';
import Header from './components/Header';

const AuthenticatedLayout = ({ children, userSession, sessionTime, handleLogout, themeColor }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        userSession={userSession}
        sessionTime={sessionTime}
        handleLogout={handleLogout}
        loading={false}
        themeColor={themeColor}
      />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default AuthenticatedLayout;
