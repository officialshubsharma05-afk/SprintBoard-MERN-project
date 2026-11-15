import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  Layers, 
  LogOut, 
  ChevronDown, 
  FolderKanban, 
  CheckSquare, 
  LayoutDashboard,
  ShieldCheck,
  Mail
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ toggleSidebar, title = 'Dashboard' }) => {
  const { user, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on navigation
  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="top-navbar">
      <div className="top-navbar-left">
        <button
          onClick={toggleSidebar}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '6px',
          }}
          aria-label="Toggle Navigation"
        >
          <Menu size={20} />
        </button>

        {/* SprintBoard Logo Badge */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)',
            }}
          >
            <Layers size={17} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            SprintBoard
          </span>
        </Link>

        {/* Subtle Divider */}
        <span style={{ color: 'var(--border-subtle)', margin: '0 4px', fontSize: '16px', userSelect: 'none' }}>
          /
        </span>

        {/* Current Page Title */}
        <h1 className="page-title" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
          {title}
        </h1>
      </div>

      <div className="top-navbar-right" style={{ position: 'relative' }} ref={dropdownRef}>
        {user ? (
          <div>
            {/* User Profile Button to toggle Profile Menu */}
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: profileMenuOpen ? 'var(--bg-subtle)' : 'transparent',
                border: '1px solid',
                borderColor: profileMenuOpen ? 'var(--border-subtle)' : 'transparent',
                padding: '4px 8px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Open Profile Menu"
              aria-expanded={profileMenuOpen}
            >
              <div
                className="avatar"
                style={{
                  width: '32px',
                  height: '32px',
                  fontSize: '13px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.2' }}>
                  {user.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.2' }}>
                  {user.email || 'Member'}
                </span>
              </div>

              <ChevronDown
                size={14}
                color="var(--text-muted)"
                style={{
                  transform: profileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>

            {/* Profile Dropdown Menu */}
            {profileMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '240px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 100,
                  overflow: 'hidden',
                  animation: 'modalEnter 0.15s ease-out',
                }}
              >
                {/* Profile Header */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-main)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                    {user.email}
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '8px',
                    fontSize: '11px',
                    backgroundColor: 'var(--primary-50)',
                    color: 'var(--primary-700)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontWeight: 600,
                  }}>
                    <ShieldCheck size={12} />
                    <span>Verified User</span>
                  </div>
                </div>

                {/* Profile Menu Links */}
                <div style={{ padding: '6px' }}>
                  <Link
                    to="/"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <LayoutDashboard size={15} color="var(--primary-600)" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    to="/projects"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <FolderKanban size={15} color="var(--primary-600)" />
                    <span>Projects</span>
                  </Link>

                  <Link
                    to="/issues"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <CheckSquare size={15} color="var(--primary-600)" />
                    <span>Issues</span>
                  </Link>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid var(--border-light)', margin: '2px 0' }} />

                {/* Logout Button */}
                <div style={{ padding: '6px' }}>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      logout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      color: '#dc2626',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <LogOut size={15} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/login" className="btn btn-secondary btn-sm">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
