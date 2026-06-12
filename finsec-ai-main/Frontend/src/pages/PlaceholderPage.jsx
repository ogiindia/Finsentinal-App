import React from 'react';

const PlaceholderPage = ({ title }) => {
  const themeColor = '#012834';

  return (
    <div style={{ padding: '2rem', minHeight: 'calc(100vh - 140px)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: themeColor, marginBottom: '1rem' }}>{title}</h1>
        <p style={{ color: '#6b7280' }}>This page is under development.</p>
      </div>
    </div>
  );
};

export default PlaceholderPage;
