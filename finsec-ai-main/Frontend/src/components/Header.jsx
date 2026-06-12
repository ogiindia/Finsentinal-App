import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Clock, LogOut } from 'lucide-react';
import { MENU_CONFIG } from '../service/menuConfig';

const HEADER1_HEIGHT = 50; // px
const HEADER2_HEIGHT = 46; // px

const TOTAL_HEADER_HEIGHT = HEADER1_HEIGHT + HEADER2_HEIGHT;


const Header = ({
  userData,
  userSession,
  userSession: sessionUser,
  sessionTime,
  handleLogout,
  loading = false,
  themeColor
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/home';

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ✅ Menu filtering INSIDE component (correct)
  const menuItems = MENU_CONFIG.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(userData?.user_type);
  });

  // const spacerHeight = isHomePage
  //   ? `${HEADER1_HEIGHT}px`
  //   : isScrolled
  //     ? `${HEADER2_HEIGHT}px`
  //     : `${HEADER1_HEIGHT + HEADER2_HEIGHT}px`;

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        {/* ================= HEADER 1 ================= */}
        {!isScrolled && (
          <div
            style={{
              backgroundColor: themeColor,
              color: 'white',
              padding: '1rem 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              height: `${HEADER1_HEIGHT}px`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/src/finlogo.png" alt="FinSentinel Logo" style={{ width: 35, height: 35 }} />
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Ink Free' }}>
                FinSentinel AI 
                
                <sup style={{ fontFamily: 'Arial', fontSize: '0.5em', marginLeft: '2px' }}>
                    TM
                  </sup>

              </h1>
            </div>

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={17} />
                <span style={{ fontSize: '0.8rem' }}>{userSession}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={17} />
                <span style={{ fontSize: '0.8rem' }}>{sessionTime}</span>
              </div>

              <button
                onClick={handleLogout}
                disabled={loading}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem'
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}

        {/* ================= HEADER 2 (NAV) ================= */}
        {!isHomePage && (
          <div
            style={{
              backgroundColor: '#1B263B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isScrolled ? 'flex-start' : 'center',
              paddingLeft: isScrolled ? '15px' : '0',
              transition: 'all 0.3s ease',
              color: 'white',
              height: `${HEADER2_HEIGHT}px`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
            }}
          >
            {isScrolled && (
              <img
                src="/src/finlogo.png"
                alt="FinSentinel Logo"
                style={{ width: 28, height: 28, marginLeft: 8 }}
              />
            )}

            <nav
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: isScrolled ? 'flex-start' : 'center',
                paddingLeft: isScrolled ? '10px' : '0'
              }}
            >
              {menuItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: isActive ? '#4bcd3e' : 'white',
                      border: 'none',
                      padding: '0.7rem 1.1rem',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: isActive ? 800 : 600,
                      borderBottom: isActive
                        ? '5px solid #4bcd3e'
                        : '3px solid transparent'
                    }}
                  >
                    {item.title}
                  </button>
                );
              })}
            </nav>

            {isScrolled && (
              <div style={{ width: 140, paddingRight: '15px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} />
                <span style={{ fontSize: '0.85rem' }}>{sessionUser}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* <div style={{ height: spacerHeight }} /> */}
      <div style={{ height: `${TOTAL_HEADER_HEIGHT}px` }} />
    </>
  );
};

export default Header;