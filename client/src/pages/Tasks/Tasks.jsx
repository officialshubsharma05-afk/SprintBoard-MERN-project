import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Search, Filter } from 'lucide-react';
import { getTasks, createTask, updateTask, deleteTask } from '../../services/taskService';
import { getProjects } from '../../services/projectService';
import { getTeamMembers } from '../../services/dashboardService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: '',
    assignedTo: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
  });

  const fetchTasksList = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedProject) params.projectId = selectedProject;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const res = await getTasks(params);
      if (res?.success) {
        setTasks(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [projRes, usersRes] = await Promise.all([
        getProjects(),
        getTeamMembers(),
      ]);
      if (projRes?.success) setProjects(projRes.data);
      if (usersRes?.success) setTeamMembers(usersRes.data);
    } catch (err) {
      console.error('Failed to load project/user metadata:', err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchTasksList();
  }, [selectedProject, statusFilter, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasksList();
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
      setTasks(
        tasks.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.project) return;

    try {
      setSubmitting(true);
      const res = await createTask(formData);
      if (res?.success) {
        setModalOpen(false);
        setFormData({
          title: '',
          description: '',
          project: '',
          assignedTo: '',
          status: 'todo',
          priority: 'medium',
          dueDate: '',
        });
        fetchTasksList();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(id);
      setTasks(tasks.filter((t) => t._id !== id));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  return (
    <div>
      {/* Header */}
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
            Tasks & Sprints
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Manage assignments, track status workflows, and meet sprint deadlines
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setModalOpen(true)}>
          New Task
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '220px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="Search tasks by title..."
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

          {/* Project Filter */}
          <select
            className="form-select"
            style={{ width: '180px' }}
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="form-select"
            style={{ width: '150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="completed">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            className="form-select"
            style={{ width: '140px' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </Card>

      {/* Tasks Table */}
      <Card>
        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>No tasks found</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Create a task to assign work items and track completion.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setModalOpen(true)}
              style={{ marginTop: '16px' }}
            >
              Create Task
            </Button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Project</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Status Workflow</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{task.title}</div>
                      {task.description && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {task.project?.name || '—'}
                    </td>
                    <td>
                      {task.assignedTo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                            {task.assignedTo.name?.charAt(0) || 'U'}
                          </div>
                          <span style={{ fontSize: '13px' }}>{task.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Unassigned</span>
                      )}
                    </td>
                    <td><Badge type="priority" value={task.priority} /></td>
                    <td>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task._id, e.target.value)}
                        className="form-select"
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          width: '130px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          fontWeight: 500,
                        }}
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(task._id)}
                        title="Delete Task"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Task Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New Task"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Task'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label" htmlFor="title">Task Title *</label>
            <input
              id="title"
              type="text"
              required
              className="form-input"
              placeholder="e.g. Implement JWT authentication"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="project">Project *</label>
            <select
              id="project"
              required
              className="form-select"
              value={formData.project}
              onChange={(e) => setFormData({ ...formData, project: e.target.value })}
            >
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={3}
              className="form-textarea"
              placeholder="Acceptance criteria, sub-tasks, notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="assignedTo">Assignee</label>
              <select
                id="assignedTo"
                className="form-select"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="priority">Priority</label>
              <select
                id="priority"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="status">Initial Status</label>
              <select
                id="status"
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dueDate">Due Date</label>
              <input
                id="dueDate"
                type="date"
                className="form-input"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              >
              </input>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tasks;
