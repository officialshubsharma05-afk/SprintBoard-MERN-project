import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderKanban, 
  CheckSquare, 
  CircleDot, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  RefreshCw, 
  ArrowUpRight, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { getDashboardStats } from '../../services/dashboardService';
import socket from '../../services/socket';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch real-time dashboard analytics from MongoDB
  const fetchStats = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await getDashboardStats();
      if (res?.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      setError(
        err.response?.data?.message || 'Failed to fetch dashboard statistics from MongoDB.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Real-time synchronization when any project or issue changes
  useEffect(() => {
    const handleLiveUpdate = () => {
      fetchStats();
    };

    socket.on('issue:created', handleLiveUpdate);
    socket.on('issue:updated', handleLiveUpdate);
    socket.on('issue:deleted', handleLiveUpdate);
    socket.on('project:created', handleLiveUpdate);
    socket.on('project:updated', handleLiveUpdate);
    socket.on('project:deleted', handleLiveUpdate);

    return () => {
      socket.off('issue:created', handleLiveUpdate);
      socket.off('issue:updated', handleLiveUpdate);
      socket.off('issue:deleted', handleLiveUpdate);
      socket.off('project:created', handleLiveUpdate);
      socket.off('project:updated', handleLiveUpdate);
      socket.off('project:deleted', handleLiveUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--border-light)',
          borderTop: '3px solid var(--primary-600)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>
          Calculating real-time analytics from MongoDB...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '12px',
        color: '#dc2626',
        maxWidth: '680px',
        margin: '20px auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <AlertCircle size={20} />
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Unable to load dashboard data</h3>
        </div>
        <p style={{ fontSize: '13.5px', color: '#991b1b', marginBottom: '16px' }}>{error}</p>
        <Button variant="danger" size="sm" icon={RefreshCw} onClick={() => fetchStats(true)}>
          Retry Connection
        </Button>
      </div>
    );
  }

  const {
    totalProjects = 0,
    totalIssues = 0,
    openIssues = 0,
    inProgressIssues = 0,
    completedIssues = 0,
    highPriorityIssues = 0,
    completionRate = 0,
    recentProjects = [],
    recentIssues = [],
  } = stats || {};

  return (
    <div>
      {/* Top Welcome Header & Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '26px'
      }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Dashboard & Analytics
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Live metrics and issue tracking aggregated directly from MongoDB
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-light)',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Refresh real-time statistics from MongoDB"
          >
            <RefreshCw
              size={14}
              style={{
                animation: refreshing ? 'spin 0.8s linear infinite' : 'none'
              }}
            />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link to="/projects">
            <Button variant="secondary" size="sm" icon={Plus}>
              New Project
            </Button>
          </Link>

          <Link to="/issues">
            <Button variant="primary" size="sm" icon={Plus}>
              New Issue
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================
          SIX REQUIRED STATISTIC CARDS
          ======================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '18px',
        marginBottom: '26px'
      }}>
        {/* CARD 1: Total Projects */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Projects</span>
            <div className="stat-icon" style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }}>
              <FolderKanban size={20} />
            </div>
          </div>
          <div className="stat-value">{totalProjects}</div>
          <div className="stat-footer">
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-600)' }}></span>
            <span>Created by your account</span>
          </div>
        </div>

        {/* CARD 2: Total Issues */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Issues</span>
            <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <CheckSquare size={20} />
            </div>
          </div>
          <div className="stat-value">{totalIssues}</div>
          <div className="stat-footer">
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
            <span>Across all active projects</span>
          </div>
        </div>

        {/* CARD 3: Open Issues (To Do) */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Open Issues</span>
            <div className="stat-icon" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
              <CircleDot size={20} />
            </div>
          </div>
          <div className="stat-value">{openIssues}</div>
          <div className="stat-footer">
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#64748b' }}></span>
            <span>Status: To Do</span>
          </div>
        </div>

        {/* CARD 4: Issues In Progress */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">In Progress</span>
            <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-value">{inProgressIssues}</div>
          <div className="stat-footer">
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706' }}></span>
            <span>Under active development</span>
          </div>
        </div>

        {/* CARD 5: Completed Issues (Done) */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Completed Issues</span>
            <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-value">{completedIssues}</div>
          <div className="stat-footer">
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }}></span>
            <span>{completionRate}% resolution rate</span>
          </div>
        </div>

        {/* CARD 6: High-Priority Issues */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">High-Priority</span>
            <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: highPriorityIssues > 0 ? '#dc2626' : 'inherit' }}>
            {highPriorityIssues}
          </div>
          <div className="stat-footer">
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }}></span>
            <span style={{ color: highPriorityIssues > 0 ? '#b91c1c' : 'inherit', fontWeight: highPriorityIssues > 0 ? 600 : 400 }}>
              {highPriorityIssues > 0 ? 'Requires prompt review' : 'No urgent bottlenecks'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress & Resolution Overview */}
      <Card style={{ marginBottom: '26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--primary-600)" />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Overall Issue Completion Rate
            </span>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-600)' }}>
            {completedIssues} of {totalIssues} Issues Resolved ({completionRate}%)
          </span>
        </div>
        <div style={{
          height: '10px',
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            backgroundColor: 'var(--primary-600)',
            width: `${completionRate}%`,
            transition: 'width 0.4s ease',
            borderRadius: '9999px',
          }} />
        </div>
      </Card>

      {/* Grid: Recent Projects & Recent Issues */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Recent Projects Widget */}
        <Card
          title="Recent Projects"
          extra={
            <Link to="/projects" style={{ fontSize: '13px', color: 'var(--primary-600)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              View All <ArrowUpRight size={14} />
            </Link>
          }
        >
          {recentProjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '14px', fontWeight: 600 }}>No projects created yet</p>
              <p style={{ fontSize: '12.5px', marginTop: '4px' }}>Create your first project to begin tracking deliverables.</p>
              <div style={{ marginTop: '14px' }}>
                <Link to="/projects">
                  <Button variant="primary" size="sm" icon={Plus}>Create Project</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Status</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((p) => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td><Badge type="status" value={p.status} /></td>
                      <td><Badge type="priority" value={p.priority} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent Issues Widget */}
        <Card
          title="Recent Issues"
          extra={
            <Link to="/issues" style={{ fontSize: '13px', color: 'var(--primary-600)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              View All <ArrowUpRight size={14} />
            </Link>
          }
        >
          {recentIssues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '14px', fontWeight: 600 }}>No issues recorded yet</p>
              <p style={{ fontSize: '12.5px', marginTop: '4px' }}>Add issues to projects to track tasks and bugs.</p>
              <div style={{ marginTop: '14px' }}>
                <Link to="/issues">
                  <Button variant="primary" size="sm" icon={Plus}>Add First Issue</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Issue Title</th>
                    <th>Project</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIssues.map((iss) => (
                    <tr key={iss._id}>
                      <td style={{ fontWeight: 600, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {iss.title}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {iss.projectId?.name || '—'}
                      </td>
                      <td><Badge type="status" value={iss.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
