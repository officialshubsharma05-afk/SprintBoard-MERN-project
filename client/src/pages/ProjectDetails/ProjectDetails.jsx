import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  CheckSquare,
  Activity,
  Layers,
  CircleDot,
  RotateCcw
} from 'lucide-react';
import { getProjectById, updateProject, deleteProject } from '../../services/projectService';
import { getIssues, createIssue, updateIssue, deleteIssue } from '../../services/issueService';
import { getActivities } from '../../services/activityService';
import socket from '../../services/socket';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Project state
  const [project, setProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [activities, setActivities] = useState([]);

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modals state
  const [editProjectModal, setEditProjectModal] = useState(false);
  const [addIssueModal, setAddIssueModal] = useState(false);
  const [editIssueModal, setEditIssueModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Project Edit Form
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    priority: 'medium',
    dueDate: '',
  });

  // Issue Create/Edit Form
  const [issueFormData, setIssueFormData] = useState({
    title: '',
    description: '',
    status: 'To Do',
    priority: 'Medium',
  });

  // Fetch all Project details, issues and activity logs
  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [projRes, issuesRes, actsRes] = await Promise.all([
        getProjectById(id),
        getIssues({ projectId: id }),
        getActivities({ projectId: id }),
      ]);

      if (projRes?.success) {
        setProject(projRes.data);
        setProjectFormData({
          name: projRes.data.name || '',
          description: projRes.data.description || '',
          status: projRes.data.status || 'active',
          priority: projRes.data.priority || 'medium',
          dueDate: projRes.data.dueDate ? projRes.data.dueDate.substring(0, 10) : '',
        });
      }

      if (issuesRes?.success) {
        setIssues(issuesRes.data || []);
      }

      if (actsRes?.success) {
        setActivities(actsRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
      setError(err.response?.data?.message || 'Failed to load project details from MongoDB.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadProjectData();
    }
  }, [id]);

  // Real-time Socket.IO synchronization for this project
  useEffect(() => {
    if (!id) return;

    socket.emit('join:project', id);

    const handleIssueCreated = (newIssue) => {
      const projId = newIssue.projectId?._id || newIssue.projectId;
      if (projId === id) {
        setIssues((prev) => {
          if (prev.some((i) => i._id === newIssue._id)) return prev;
          return [newIssue, ...prev];
        });
      }
    };

    const handleIssueUpdated = (updatedIssue) => {
      const projId = updatedIssue.projectId?._id || updatedIssue.projectId;
      if (projId === id) {
        setIssues((prev) =>
          prev.map((i) => (i._id === updatedIssue._id ? updatedIssue : i))
        );
      }
    };

    const handleIssueDeleted = ({ issueId, projectId: pId }) => {
      if (!pId || pId === id) {
        setIssues((prev) => prev.filter((i) => i._id !== issueId));
      }
    };

    const handleActivityCreated = (newActivity) => {
      const projId = newActivity.projectId?._id || newActivity.projectId;
      if (projId === id) {
        setActivities((prev) => [newActivity, ...prev]);
      }
    };

    socket.on('issue:created', handleIssueCreated);
    socket.on('issue:updated', handleIssueUpdated);
    socket.on('issue:deleted', handleIssueDeleted);
    socket.on('activity:created', handleActivityCreated);

    return () => {
      socket.emit('leave:project', id);
      socket.off('issue:created', handleIssueCreated);
      socket.off('issue:updated', handleIssueUpdated);
      socket.off('issue:deleted', handleIssueDeleted);
      socket.off('activity:created', handleActivityCreated);
    };
  }, [id]);

  // Handle Project Update
  const handleProjectUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormError('');

      const res = await updateProject(id, projectFormData);
      if (res?.success) {
        setProject(res.data);
        setEditProjectModal(false);
        setFeedback({ type: 'success', message: 'Project updated successfully!' });
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update project');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Project Delete
  const handleProjectDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete project "${project?.name}"? All associated issues will also be removed.`)) {
      return;
    }

    try {
      const res = await deleteProject(id);
      if (res?.success) {
        navigate('/projects');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project');
    }
  };

  // Handle Create Issue
  const handleCreateIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issueFormData.title.trim()) {
      setFormError('Issue title is required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const res = await createIssue({
        ...issueFormData,
        projectId: id,
      });

      if (res?.success) {
        setAddIssueModal(false);
        setIssueFormData({ title: '', description: '', status: 'To Do', priority: 'Medium' });
        setFeedback({ type: 'success', message: 'Issue created successfully!' });
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
        // Refresh issues and activities
        loadProjectData();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create issue');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Issue
  const handleEditIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issueFormData.title.trim()) {
      setFormError('Issue title is required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const res = await updateIssue(selectedIssue._id, issueFormData);
      if (res?.success) {
        setEditIssueModal(false);
        setSelectedIssue(null);
        setFeedback({ type: 'success', message: 'Issue updated successfully!' });
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
        loadProjectData();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update issue');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Quick Status Change from issue dropdown
  const handleStatusChange = async (issueId, newStatus) => {
    try {
      const res = await updateIssue(issueId, { status: newStatus });
      if (res?.success) {
        setIssues((prev) =>
          prev.map((iss) => (iss._id === issueId ? { ...iss, status: newStatus } : iss))
        );
        // Re-fetch activities to reflect the logged status change
        const actsRes = await getActivities({ projectId: id });
        if (actsRes?.success) {
          setActivities(actsRes.data || []);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update issue status');
    }
  };

  // Handle Quick Priority Change from issue dropdown
  const handlePriorityChange = async (issueId, newPriority) => {
    try {
      const res = await updateIssue(issueId, { priority: newPriority });
      if (res?.success) {
        setIssues((prev) =>
          prev.map((iss) => (iss._id === issueId ? { ...iss, priority: newPriority } : iss))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update issue priority');
    }
  };

  // Handle Delete Issue
  const handleDeleteIssue = async (issueId, title) => {
    if (!window.confirm(`Are you sure you want to delete issue "${title}"?`)) {
      return;
    }

    try {
      const res = await deleteIssue(issueId);
      if (res?.success) {
        setIssues((prev) => prev.filter((iss) => iss._id !== issueId));
        setFeedback({ type: 'success', message: `Issue "${title}" was deleted.` });
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete issue');
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        color: 'var(--text-secondary)',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--border-light)',
          borderTop: '3px solid var(--primary-600)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '14px', fontWeight: 500 }}>
          Loading project details from MongoDB...
        </span>
      </div>
    );
  }

  if (error || !project) {
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
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Unable to load project</h3>
        </div>
        <p style={{ fontSize: '13.5px', color: '#991b1b', marginBottom: '16px' }}>
          {error || 'The requested project could not be found.'}
        </p>
        <Link to="/projects">
          <Button variant="secondary" size="sm" icon={ArrowLeft}>
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate project statistics
  const totalIssuesCount = issues.length;
  const todoCount = issues.filter((i) => i.status === 'To Do').length;
  const inProgressCount = issues.filter((i) => i.status === 'In Progress').length;
  const doneCount = issues.filter((i) => i.status === 'Done').length;
  const completionRate = totalIssuesCount > 0 ? Math.round((doneCount / totalIssuesCount) * 100) : 0;

  return (
    <div>
      {/* Top Breadcrumb & Actions Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <Link
          to="/projects"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Projects</span>
        </Link>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={Edit3}
            onClick={() => {
              setProjectFormData({
                name: project.name || '',
                description: project.description || '',
                status: project.status || 'active',
                priority: project.priority || 'medium',
                dueDate: project.dueDate ? project.dueDate.substring(0, 10) : '',
              });
              setEditProjectModal(true);
            }}
          >
            Edit Project
          </Button>

          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={handleProjectDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback.message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#ecfdf5',
          border: feedback.type === 'error' ? '1px solid #fecaca' : '1px solid #a7f3d0',
          color: feedback.type === 'error' ? '#dc2626' : '#059669',
        }}>
          {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Project Overview Card */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '14px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FolderKanban size={18} />
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {project.name}
              </h1>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '720px', lineHeight: '1.6' }}>
              {project.description || 'No description provided for this project.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Badge type="status" value={project.status} />
            <Badge type="priority" value={project.priority} />
          </div>
        </div>

        {/* Project Meta Information Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-light)',
          marginTop: '16px',
        }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Created By
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <User size={15} color="var(--primary-600)" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                {project.createdBy?.name || 'You'}
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Created Date
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <Calendar size={15} color="var(--primary-600)" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Target Due Date
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <Clock size={15} color="var(--primary-600)" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'Not set'}
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Progress
            </span>
            <div style={{ marginTop: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                <span>{doneCount} of {totalIssuesCount} resolved</span>
                <span>{completionRate}%</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  backgroundColor: 'var(--primary-600)',
                  width: `${completionRate}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Project Statistics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        marginBottom: '24px',
      }}>
        <div className="stat-card" style={{ padding: '14px 18px' }}>
          <div className="stat-header">
            <span className="stat-title">Total Issues</span>
            <div className="stat-icon" style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', width: '32px', height: '32px' }}>
              <CheckSquare size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '20px' }}>{totalIssuesCount}</div>
        </div>

        <div className="stat-card" style={{ padding: '14px 18px' }}>
          <div className="stat-header">
            <span className="stat-title">To Do</span>
            <div className="stat-icon" style={{ backgroundColor: '#f1f5f9', color: '#475569', width: '32px', height: '32px' }}>
              <CircleDot size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '20px' }}>{todoCount}</div>
        </div>

        <div className="stat-card" style={{ padding: '14px 18px' }}>
          <div className="stat-header">
            <span className="stat-title">In Progress</span>
            <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb', width: '32px', height: '32px' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '20px' }}>{inProgressCount}</div>
        </div>

        <div className="stat-card" style={{ padding: '14px 18px' }}>
          <div className="stat-header">
            <span className="stat-title">Completed</span>
            <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669', width: '32px', height: '32px' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '20px' }}>{doneCount}</div>
        </div>
      </div>

      {/* Grid: Project Issues & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '24px' }}>
        {/* LEFT COLUMN: Project Issues */}
        <div>
          <Card>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={18} color="var(--primary-600)" />
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Project Issues
                </h2>
                <span style={{
                  fontSize: '11px',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-muted)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 600,
                }}>
                  {issues.length}
                </span>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setIssueFormData({ title: '', description: '', status: 'To Do', priority: 'Medium' });
                  setAddIssueModal(true);
                }}
              >
                Add Issue
              </Button>
            </div>

            {issues.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                border: '1px dashed var(--border-light)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-main)',
              }}>
                <CheckSquare size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  No issues in this project yet
                </p>
                <p style={{ fontSize: '13px', marginTop: '4px', marginBottom: '14px' }}>
                  Create an issue to track tasks, bugs, or feature requirements.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => setAddIssueModal(true)}
                >
                  Create First Issue
                </Button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((iss) => (
                      <tr key={iss._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                            {iss.title}
                          </div>
                        </td>
                        <td>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            maxWidth: '180px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {iss.description || '—'}
                          </div>
                        </td>
                        <td>
                          <select
                            value={iss.status}
                            onChange={(e) => handleStatusChange(iss._id, e.target.value)}
                            className="form-select"
                            style={{
                              padding: '4px 6px',
                              fontSize: '11.5px',
                              width: '120px',
                              borderRadius: '6px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              backgroundColor:
                                iss.status === 'Done' ? 'var(--status-completed-bg)' :
                                iss.status === 'In Progress' ? 'var(--status-progress-bg)' :
                                'var(--status-todo-bg)',
                              color:
                                iss.status === 'Done' ? 'var(--status-completed-text)' :
                                iss.status === 'In Progress' ? 'var(--status-progress-text)' :
                                'var(--status-todo-text)',
                              border: '1px solid var(--border-light)',
                            }}
                          >
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={iss.priority}
                            onChange={(e) => handlePriorityChange(iss._id, e.target.value)}
                            className="form-select"
                            style={{
                              padding: '4px 6px',
                              fontSize: '11.5px',
                              width: '95px',
                              borderRadius: '6px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              backgroundColor:
                                iss.priority === 'High' ? 'var(--priority-urgent-bg)' :
                                iss.priority === 'Medium' ? 'var(--priority-medium-bg)' :
                                'var(--priority-low-bg)',
                              color:
                                iss.priority === 'High' ? 'var(--priority-urgent-text)' :
                                iss.priority === 'Medium' ? 'var(--priority-medium-text)' :
                                'var(--priority-low-text)',
                              border: '1px solid var(--border-light)',
                            }}
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(iss.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button
                              onClick={() => {
                                setSelectedIssue(iss);
                                setIssueFormData({
                                  title: iss.title,
                                  description: iss.description || '',
                                  status: iss.status,
                                  priority: iss.priority,
                                });
                                setEditIssueModal(true);
                              }}
                              title="Edit Issue"
                              style={{
                                background: '#f8fafc',
                                border: '1px solid var(--border-light)',
                                color: 'var(--text-secondary)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteIssue(iss._id, iss.title)}
                              title="Delete Issue"
                              style={{
                                background: '#fee2e2',
                                border: '1px solid #fecaca',
                                color: '#b91c1c',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Recent Activity History */}
        <div>
          <Card>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="var(--primary-600)" />
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Recent Activity
                </h2>
              </div>
              <span style={{
                fontSize: '11px',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-muted)',
                padding: '2px 8px',
                borderRadius: '999px',
                fontWeight: 600,
              }}>
                {activities.length} {activities.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {activities.length === 0 ? (
              <div style={{
                padding: '36px 16px',
                textAlign: 'center',
                border: '1px dashed var(--border-light)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                fontSize: '13px',
                backgroundColor: 'var(--bg-main)',
              }}>
                No activity recorded yet. Create or update an issue to see the live timeline.
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxHeight: '520px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}>
                {activities.map((act) => (
                  <div
                    key={act._id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px',
                      backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                    }}
                  >
                    <div
                      className="avatar"
                      style={{
                        width: '28px',
                        height: '28px',
                        fontSize: '11px',
                        flexShrink: 0,
                        background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                      }}
                    >
                      {act.userId?.name ? act.userId.name.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {act.userId?.name || 'User'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(act.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        {act.action}
                      </p>

                      {act.issueId && (
                        <div style={{
                          marginTop: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11.5px',
                          backgroundColor: '#ffffff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-secondary)',
                        }}>
                          <span style={{ fontWeight: 600 }}>Issue:</span>
                          <span style={{ maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {act.issueId.title || 'Referenced Issue'}
                          </span>
                          {act.issueId.status && (
                            <Badge type="status" value={act.issueId.status} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ========================================================
          EDIT PROJECT MODAL
          ======================================================== */}
      <Modal
        isOpen={editProjectModal}
        onClose={() => setEditProjectModal(false)}
        title="Edit Project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditProjectModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleProjectUpdateSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        {formError && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '10px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '16px',
          }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleProjectUpdateSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-proj-name">Project Name *</label>
            <input
              id="edit-proj-name"
              type="text"
              required
              className="form-input"
              value={projectFormData.name}
              onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-proj-desc">Description</label>
            <textarea
              id="edit-proj-desc"
              rows={3}
              className="form-textarea"
              value={projectFormData.description}
              onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-proj-status">Status</label>
              <select
                id="edit-proj-status"
                className="form-select"
                value={projectFormData.status}
                onChange={(e) => setProjectFormData({ ...projectFormData, status: e.target.value })}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-proj-prio">Priority</label>
              <select
                id="edit-proj-prio"
                className="form-select"
                value={projectFormData.priority}
                onChange={(e) => setProjectFormData({ ...projectFormData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-proj-date">Target Due Date</label>
            <input
              id="edit-proj-date"
              type="date"
              className="form-input"
              value={projectFormData.dueDate}
              onChange={(e) => setProjectFormData({ ...projectFormData, dueDate: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ========================================================
          ADD ISSUE MODAL
          ======================================================== */}
      <Modal
        isOpen={addIssueModal}
        onClose={() => setAddIssueModal(false)}
        title="Add Issue to Project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddIssueModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateIssueSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Issue'}
            </Button>
          </>
        }
      >
        {formError && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '10px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '16px',
          }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateIssueSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="issue-title">Issue Title *</label>
            <input
              id="issue-title"
              type="text"
              required
              className="form-input"
              placeholder="e.g. Implement user password reset flow"
              value={issueFormData.title}
              onChange={(e) => setIssueFormData({ ...issueFormData, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="issue-desc">Description</label>
            <textarea
              id="issue-desc"
              rows={3}
              className="form-textarea"
              placeholder="Provide context, acceptance criteria, or error details..."
              value={issueFormData.description}
              onChange={(e) => setIssueFormData({ ...issueFormData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="issue-status">Status</label>
              <select
                id="issue-status"
                className="form-select"
                value={issueFormData.status}
                onChange={(e) => setIssueFormData({ ...issueFormData, status: e.target.value })}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="issue-priority">Priority</label>
              <select
                id="issue-priority"
                className="form-select"
                value={issueFormData.priority}
                onChange={(e) => setIssueFormData({ ...issueFormData, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          EDIT ISSUE MODAL
          ======================================================== */}
      <Modal
        isOpen={editIssueModal}
        onClose={() => setEditIssueModal(false)}
        title="Edit Issue"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditIssueModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditIssueSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        {formError && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '10px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '16px',
          }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleEditIssueSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-issue-title">Issue Title *</label>
            <input
              id="edit-issue-title"
              type="text"
              required
              className="form-input"
              value={issueFormData.title}
              onChange={(e) => setIssueFormData({ ...issueFormData, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-issue-desc">Description</label>
            <textarea
              id="edit-issue-desc"
              rows={3}
              className="form-textarea"
              value={issueFormData.description}
              onChange={(e) => setIssueFormData({ ...issueFormData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-issue-status">Status</label>
              <select
                id="edit-issue-status"
                className="form-select"
                value={issueFormData.status}
                onChange={(e) => setIssueFormData({ ...issueFormData, status: e.target.value })}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-issue-priority">Priority</label>
              <select
                id="edit-issue-priority"
                className="form-select"
                value={issueFormData.priority}
                onChange={(e) => setIssueFormData({ ...issueFormData, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectDetails;
