import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MENU_CONFIG } from '../service/menuConfig';

const HomePage = ({ userData }) => {
  const navigate = useNavigate();

  // ✅ EXACT SAME FILTERING LOGIC AS HEADER
  const visibleCards = MENU_CONFIG.filter(item => {
    // Remove Home card explicitly
    if (item.path === '/home') return false;

    // Same role logic as Header
    if (!item.roles) return true;

    return item.roles.includes(userData?.user_type);
  });

  return (
    <div style={{ padding: '2rem', minHeight: 'calc(100vh - 90px)' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
          FinSentinel AI
        </h1>

        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Fraud monitoring and intelligence platform
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {visibleCards.map(item => (
            <div
              key={item.title}
              onClick={() => navigate(item.path)}
              style={{
                backgroundColor: 'white',
                padding: '1.75rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}
              >
                <div
                  style={{
                    backgroundColor: `${item.iconColor}20`,
                    padding: '0.65rem',
                    borderRadius: '0.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <item.icon size={28} color={item.iconColor} />
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>
                  {item.title}
                </h3>
              </div>

              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  lineHeight: 1.45
                }}
              >
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;