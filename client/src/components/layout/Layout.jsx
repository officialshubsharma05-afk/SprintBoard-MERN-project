import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname === '/' || pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/projects') return 'Projects';
    if (pathname.startsWith('/projects/')) return 'Project Details';
    if (pathname.startsWith('/issues')) return 'Issue Management';
    return 'SprintBoard';
  };

  return (
    <div className="app-container">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(2px)',
            zIndex: 35,
          }}
          aria-hidden="true"
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="main-wrapper">
        <Navbar
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          title={getPageTitle(location.pathname)}
        />
        <main className="content-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
