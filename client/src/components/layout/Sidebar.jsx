import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  LogOut, 
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/issues', label: 'Issues', icon: CheckSquare },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <NavLink to="/" className="logo-container">
          <div className="logo-badge">
            <Layers size={20} />
          </div>
          <span>SprintBoard</span>
        </NavLink>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-label">Main Menu</span>
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (window.innerWidth <= 900 && toggleSidebar) toggleSidebar();
              }}
            >
              <Icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}

        {/* Explicit Logout Item in Navigation Menu */}
        <button
          onClick={logout}
          className="nav-item"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: '#f87171',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
            fontSize: '14px',
            marginTop: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#f87171';
          }}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </nav>

      {user && (
        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize' }}>
                {user.role || 'Member'}
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
