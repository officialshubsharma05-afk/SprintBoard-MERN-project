import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  Search, 
  Filter, 
  Calendar, 
  LayoutGrid, 
  List, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FolderKanban,
  User,
  ArrowRight,
  Activity
} from 'lucide-react';
import { 
  getProjects, 
  getProjectById, 
  createProject, 
  updateProject, 
  deleteProject 
} from '../../services/projectService';
import { getActivities } from '../../services/activityService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Active items for edit / details
  const [selectedProject, setSelectedProject] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [projectActivities, setProjectActivities] = useState([]);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    priority: 'medium',
    dueDate: '',
  });

  // Fetch all projects for the authenticated user
  const fetchProjectList = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const res = await getProjects(params);
      if (res?.success) {
        setProjects(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects from MongoDB:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to load projects from server.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectList();
  }, [statusFilter, priorityFilter]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProjectList();
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active',
      priority: 'medium',
      dueDate: '',
    });
    setFormError('');
    setCreateModalOpen(true);
  };

  // Create Project submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Please enter a project name');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const res = await createProject(formData);
      if (res?.success) {
        setCreateModalOpen(false);
        setFeedback({ type: 'success', message: 'Project created successfully!' });
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
        fetchProjectList();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'active',
      priority: project.priority || 'medium',
      dueDate: project.dueDate ? project.dueDate.substring(0, 10) : '',
    });
    setFormError('');
    setEditModalOpen(true);
  };

  // Edit Project submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Please enter a project name');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const res = await updateProject(selectedProject._id, formData);
      if (res?.success) {
        setEditModalOpen(false);
        setFeedback({ type: 'success', message: 'Project updated successfully!' });
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
        fetchProjectList();
        if (detailsModalOpen) {
          viewProjectDetails(selectedProject._id);
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update project');
    } finally {
      setSubmitting(false);
    }
  };

  // View Project Details and Recent Activity Log
  const viewProjectDetails = async (id) => {
    try {
      setDetailsLoading(true);
      setDetailsModalOpen(true);
      setProjectActivities([]);

      const [projectRes, activitiesRes] = await Promise.all([
        getProjectById(id),
        getActivities({ projectId: id }),
      ]);

      if (projectRes?.success) {
        setSelectedProject(projectRes.data);
      }
      if (activitiesRes?.success) {
        setProjectActivities(activitiesRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load project details and activity logs:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to fetch project details',
      });
      setDetailsModalOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Delete Project
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete project "${name}"? All associated tasks will also be deleted.`)) {
      return;
    }

    try {
      const res = await deleteProject(id);
      if (res?.success) {
        setProjects((prev) => prev.filter((p) => p._id !== id));
        setFeedback({ type: 'success', message: `Project "${name}" was deleted.` });
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
        if (detailsModalOpen && selectedProject?._id === id) {
          setDetailsModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete project',
      });
    }
  };

  return (
    <div>
      {/* Top Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Project Management
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Create, view, update, and manage your projects with full ownership control
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* View Toggle */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '2px',
          }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? 'var(--primary-50)' : 'transparent',
                color: viewMode === 'table' ? 'var(--primary-600)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
              }}
              title="Table View"
            >
              <List size={14} /> Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                background: viewMode === 'cards' ? 'var(--primary-50)' : 'transparent',
                color: viewMode === 'cards' ? 'var(--primary-600)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
              }}
              title="Cards View"
            >
              <LayoutGrid size={14} /> Cards
            </button>
          </div>

          <Button variant="primary" icon={Plus} onClick={openCreateModal}>
            Create Project
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

      {/* Filter and Search Bar */}
      <Card style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '240px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="Search your projects by name..."
                className="form-input"
                style={{ paddingLeft: '36px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">Search</Button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              className="form-select"
              style={{ width: '160px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              className="form-select"
              style={{ width: '150px' }}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Projects Display: Table or Cards */}
      {loading ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading your projects from MongoDB...
          </div>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
            }}>
              <FolderKanban size={24} />
            </div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No projects found
            </p>
            <p style={{ fontSize: '13px', marginTop: '4px', maxWidth: '380px', margin: '4px auto 16px' }}>
              You haven't created any projects matching these criteria yet.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={openCreateModal}
            >
              Create New Project
            </Button>
          </div>
        </Card>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <Card>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Created Date</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((proj) => (
                  <tr key={proj._id}>
                    <td>
                      <Link
                        to={`/projects/${proj._id}`}
                        style={{
                          fontWeight: 600,
                          color: 'var(--primary-600)',
                          textDecoration: 'none',
                          fontSize: '14px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                      >
                        {proj.name}
                      </Link>
                      {proj.description && (
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                          maxWidth: '320px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {proj.description}
                        </div>
                      )}
                    </td>
                    <td><Badge type="status" value={proj.status} /></td>
                    <td><Badge type="priority" value={proj.priority} /></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {new Date(proj.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {proj.dueDate ? new Date(proj.dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => navigate(`/projects/${proj._id}`)}
                          title="View Project Details Page"
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#2563eb',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <Eye size={14} /> Details
                        </button>
                        <button
                          onClick={() => openEditModal(proj)}
                          title="Edit Project"
                          style={{
                            background: '#f8fafc',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(proj._id, proj.name)}
                          title="Delete Project"
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            color: '#b91c1c',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '12px',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* CARDS VIEW */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {projects.map((proj) => (
            <div
              key={proj._id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <Badge type="status" value={proj.status} />
                  <Badge type="priority" value={proj.priority} />
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
                  <Link
                    to={`/projects/${proj._id}`}
                    style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-600)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  >
                    {proj.name}
                  </Link>
                </h3>

                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  marginBottom: '16px',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: '40px',
                }}>
                  {proj.description || 'No description provided.'}
                </p>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-light)',
                  paddingTop: '12px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginBottom: '14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    <span>Due: {proj.dueDate ? new Date(proj.dueDate).toLocaleDateString() : 'None'}</span>
                  </div>
                  <div>
                    <span>Created: {new Date(proj.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Eye}
                    onClick={() => navigate(`/projects/${proj._id}`)}
                    style={{ flex: 1 }}
                  >
                    Details
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Edit3}
                    onClick={() => openEditModal(proj)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleDelete(proj._id, proj.name)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================
          CREATE PROJECT MODAL
          ======================================================== */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit} disabled={submitting}>
              {submitting ? 'Creating Project...' : 'Create Project'}
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

        <form onSubmit={handleCreateSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="create-name">Project Name *</label>
            <input
              id="create-name"
              type="text"
              required
              className="form-input"
              placeholder="e.g. Mobile Banking App Sprint"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="create-desc">Description</label>
            <textarea
              id="create-desc"
              rows={3}
              className="form-textarea"
              placeholder="Outline the scope, deliverables, and goals for this project..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="create-status">Status</label>
              <select
                id="create-status"
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="create-priority">Priority</label>
              <select
                id="create-priority"
                className="form-select"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="create-date">Target Due Date</label>
            <input
              id="create-date"
              type="date"
              className="form-input"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ========================================================
          EDIT PROJECT MODAL
          ======================================================== */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSubmit} disabled={submitting}>
              {submitting ? 'Saving Changes...' : 'Save Changes'}
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

        <form onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-name">Project Name *</label>
            <input
              id="edit-name"
              type="text"
              required
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-desc">Description</label>
            <textarea
              id="edit-desc"
              rows={3}
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-status">Status</label>
              <select
                id="edit-status"
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-priority">Priority</label>
              <select
                id="edit-priority"
                className="form-select"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-date">Target Due Date</label>
            <input
              id="edit-date"
              type="date"
              className="form-input"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ========================================================
          VIEW PROJECT DETAILS MODAL
          ======================================================== */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Project Details"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            {selectedProject && (
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => handleDelete(selectedProject._id, selectedProject.name)}
              >
                Delete
              </Button>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setDetailsModalOpen(false)}>
                Close
              </Button>
              {selectedProject && (
                <Button
                  variant="primary"
                  icon={Edit3}
                  onClick={() => {
                    setDetailsModalOpen(false);
                    openEditModal(selectedProject);
                  }}
                >
                  Edit Project
                </Button>
              )}
            </div>
          </div>
        }
      >
        {detailsLoading || !selectedProject ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading project details...
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedProject.name}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Badge type="status" value={selectedProject.status} />
                <Badge type="priority" value={selectedProject.priority} />
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-main)',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '18px',
              fontSize: '13.5px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
            }}>
              {selectedProject.description || 'No description provided for this project.'}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              marginBottom: '18px',
            }}>
              <div style={{ padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Created By
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <User size={16} color="var(--primary-600)" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    {selectedProject.createdBy?.name || 'You'}
                  </span>
                </div>
              </div>

              <div style={{ padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Created Date
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <Calendar size={16} color="var(--primary-600)" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    {new Date(selectedProject.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div style={{ padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Target Due Date
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <Clock size={16} color="var(--primary-600)" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    {selectedProject.dueDate ? new Date(selectedProject.dueDate).toLocaleDateString() : 'Not set'}
                  </span>
                </div>
              </div>
            </div>

            {/* Task metrics for this project */}
            <div style={{
              padding: '14px',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Associated Tasks
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {selectedProject.completedTaskCount ?? 0} of {selectedProject.taskCount ?? 0} completed
                </span>
              </div>
              <div style={{
                height: '8px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  backgroundColor: 'var(--primary-600)',
                  width: `${(selectedProject.taskCount ?? 0) > 0 ? Math.round(((selectedProject.completedTaskCount ?? 0) / selectedProject.taskCount) * 100) : 0}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>

            {/* Recent Activity Log Section */}
            <div style={{ marginTop: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Activity size={17} color="var(--primary-600)" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Recent Activity History
                </h3>
                <span style={{
                  fontSize: '11px',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-muted)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontWeight: 600,
                }}>
                  {projectActivities.length} {projectActivities.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              {projectActivities.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  border: '1px dashed var(--border-light)',
                  borderRadius: '8px',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  backgroundColor: 'var(--bg-main)',
                }}>
                  No activity recorded for this project yet. Create or update an issue to see the live activity timeline.
                </div>
              ) : (
                <div style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  paddingRight: '4px',
                }}>
                  {projectActivities.map((act) => (
                    <div
                      key={act._id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '11px 14px',
                        backgroundColor: '#ffffff',
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
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

                        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {act.action}
                        </p>

                        {act.issueId && (
                          <div style={{
                            marginTop: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '11.5px',
                            backgroundColor: 'var(--bg-main)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                          }}>
                            <span style={{ fontWeight: 600 }}>Issue:</span>
                            <span style={{ maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Projects;
