import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  FolderKanban,
  CheckSquare,
  Clock,
  CircleDot,
  RotateCcw,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LayoutGrid,
  List,
  GripVertical
} from 'lucide-react';
import { getIssues, createIssue, updateIssue, deleteIssue } from '../../services/issueService';
import { getProjects } from '../../services/projectService';
import socket from '../../services/socket';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const Issues = () => {
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [draggedIssueId, setDraggedIssueId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Search input state and debounced value
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Dropdown filter states (sent as backend query parameters)
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'To Do',
    priority: 'Medium',
    projectId: '',
  });

  // Debounce search input by 350ms to avoid unnecessary API requests
  useEffect(() => {
    if (searchInput.trim() !== debouncedSearch) {
      setSearching(true);
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch projects list for project dropdown filter
  const fetchUserProjects = async () => {
    try {
      const res = await getProjects();
      if (res?.success) {
        setProjects(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load projects for dropdown:', err);
    }
  };

  // Efficiently fetch issues from backend with combined query parameters
  const fetchIssuesFromBackend = async (overrideParams = {}) => {
    try {
      setLoading(true);

      // Construct query parameters object for backend
      const params = {};
      const projId = overrideParams.projectId !== undefined ? overrideParams.projectId : selectedProjectId;
      const stat = overrideParams.status !== undefined ? overrideParams.status : statusFilter;
      const prio = overrideParams.priority !== undefined ? overrideParams.priority : priorityFilter;
      const srch = overrideParams.search !== undefined ? overrideParams.search : debouncedSearch;

      if (projId) params.projectId = projId;
      if (stat) params.status = stat;
      if (prio) params.priority = prio;
      if (srch) params.search = srch;

      // Axios call to backend with combined query parameters
      const res = await getIssues(params);
      if (res?.success) {
        setIssues(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch filtered issues from MongoDB:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to load issues from server.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load projects once on mount
  useEffect(() => {
    fetchUserProjects();
  }, []);

  // Real-time Socket.IO synchronization across connected users
  useEffect(() => {
    const handleIssueCreated = (newIssue) => {
      const issueProjId = newIssue.projectId?._id || newIssue.projectId;
      if (!selectedProjectId || issueProjId === selectedProjectId) {
        setIssues((prev) => {
          if (prev.some((i) => i._id === newIssue._id)) return prev;
          return [newIssue, ...prev];
        });
      }
    };

    const handleIssueUpdated = (updatedIssue) => {
      setIssues((prev) =>
        prev.map((i) => (i._id === updatedIssue._id ? updatedIssue : i))
      );
    };

    const handleIssueStatusChanged = ({ issue: updatedIssue, previousStatus, newStatus }) => {
      setIssues((prev) =>
        prev.map((i) => (i._id === updatedIssue._id ? updatedIssue : i))
      );
      setFeedback({
        type: 'success',
        message: `Real-time update: "${updatedIssue.title}" changed from ${previousStatus} to ${newStatus}`,
      });
      setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
    };

    const handleIssueDeleted = ({ issueId }) => {
      setIssues((prev) => prev.filter((i) => i._id !== issueId));
    };

    socket.on('issue:created', handleIssueCreated);
    socket.on('issue:updated', handleIssueUpdated);
    socket.on('issue:statusChanged', handleIssueStatusChanged);
    socket.on('issue:deleted', handleIssueDeleted);

    return () => {
      socket.off('issue:created', handleIssueCreated);
      socket.off('issue:updated', handleIssueUpdated);
      socket.off('issue:statusChanged', handleIssueStatusChanged);
      socket.off('issue:deleted', handleIssueDeleted);
    };
  }, [selectedProjectId]);

  // Fetch issues whenever debouncedSearch, selectedProjectId, statusFilter, or priorityFilter changes
  useEffect(() => {
    fetchIssuesFromBackend();
  }, [debouncedSearch, selectedProjectId, statusFilter, priorityFilter]);

  // Clear all filters (including search) and refetch all issues from backend
  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedProjectId('');
    setStatusFilter('');
    setPriorityFilter('');
    fetchIssuesFromBackend({
      projectId: '',
      status: '',
      priority: '',
      search: '',
    });
  };

  const hasActiveFilters = Boolean(
    selectedProjectId || statusFilter || priorityFilter || debouncedSearch
  );

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      title: '',
      description: '',
      status: 'To Do',
      priority: 'Medium',
      projectId: selectedProjectId || (projects.length > 0 ? projects[0]._id : ''),
    });
    setFormError('');
    setAddModalOpen(true);
  };

  // Create Issue
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Please enter an issue title');
      return;
    }
    if (!formData.projectId) {
      setFormError('Please select a project');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const res = await createIssue(formData);
      if (res?.success) {
        setAddModalOpen(false);
        setFeedback({ type: 'success', message: 'Issue created successfully!' });
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
        fetchIssuesFromBackend();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create issue');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (issue) => {
    setSelectedIssue(issue);
    setFormData({
      title: issue.title || '',
      description: issue.description || '',
      status: issue.status || 'To Do',
      priority: issue.priority || 'Medium',
      projectId: issue.projectId?._id || issue.projectId || '',
    });
    setFormError('');
    setEditModalOpen(true);
  };

  // Edit Issue
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Please enter an issue title');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const res = await updateIssue(selectedIssue._id, formData);
      if (res?.success) {
        setEditModalOpen(false);
        setFeedback({ type: 'success', message: 'Issue updated successfully!' });
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
        fetchIssuesFromBackend();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update issue');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Inline Status Change
  const handleQuickStatusChange = async (issueId, newStatus) => {
    try {
      const res = await updateIssue(issueId, { status: newStatus });
      if (res?.success) {
        fetchIssuesFromBackend();
      }
    } catch (err) {
      console.error('Failed to change issue status:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update status',
      });
    }
  };

  // Quick Inline Priority Change
  const handleQuickPriorityChange = async (issueId, newPriority) => {
    try {
      const res = await updateIssue(issueId, { priority: newPriority });
      if (res?.success) {
        fetchIssuesFromBackend();
      }
    } catch (err) {
      console.error('Failed to change issue priority:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update priority',
      });
    }
  };

  // Delete Issue
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete issue "${title}"?`)) return;

    try {
      const res = await deleteIssue(id);
      if (res?.success) {
        setFeedback({ type: 'success', message: `Issue "${title}" was deleted.` });
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
        fetchIssuesFromBackend();
      }
    } catch (err) {
      console.error('Failed to delete issue:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete issue',
      });
    }
  };

  // Drag and Drop handlers for Kanban Board
  const handleDragStart = (e, issueId) => {
    e.dataTransfer.setData('text/plain', issueId);
    setDraggedIssueId(issueId);
  };

  const handleDragOver = (e, columnStatus) => {
    e.preventDefault();
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const issueId = e.dataTransfer.getData('text/plain') || draggedIssueId;
    setDraggedIssueId(null);

    if (!issueId) return;

    const currentIssue = issues.find((i) => i._id === issueId);
    if (!currentIssue || currentIssue.status === targetStatus) return;

    // Optimistically update status in UI
    setIssues((prev) =>
      prev.map((iss) => (iss._id === issueId ? { ...iss, status: targetStatus } : iss))
    );

    try {
      const res = await updateIssue(issueId, { status: targetStatus });
      if (res?.success) {
        setFeedback({
          type: 'success',
          message: `Issue moved to "${targetStatus}". Activity logged in MongoDB.`,
        });
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      }
    } catch (err) {
      console.error('Failed to move issue:', err);
      fetchIssuesFromBackend();
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update issue status',
      });
    }
  };

  // Summary counts based on returned issues
  const todoCount = issues.filter((i) => i.status === 'To Do').length;
  const inProgressCount = issues.filter((i) => i.status === 'In Progress').length;
  const doneCount = issues.filter((i) => i.status === 'Done').length;

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
            Issue Search & Filtering
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Fast debounced search by title and multi-parameter filtering powered by MongoDB
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'inline-flex',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '3px',
          }}>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'kanban' ? 'var(--primary-600)' : 'transparent',
                color: viewMode === 'kanban' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutGrid size={15} />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'table' ? 'var(--primary-600)' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={15} />
              <span>Table</span>
            </button>
          </div>

          <Button variant="primary" icon={Plus} onClick={openAddModal}>
            Add Issue
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

      {/* Metric Counters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '22px'
      }}>
        <div className="stat-card" style={{ padding: '16px 18px' }}>
          <div className="stat-header">
            <span className="stat-title">Matching Issues</span>
            <div className="stat-icon" style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', width: '32px', height: '32px' }}>
              <CheckSquare size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '22px' }}>{issues.length}</div>
          <div className="stat-footer">{hasActiveFilters ? 'Filtered results' : 'All workspace issues'}</div>
        </div>

        <div className="stat-card" style={{ padding: '16px 18px' }}>
          <div className="stat-header">
            <span className="stat-title">To Do</span>
            <div className="stat-icon" style={{ backgroundColor: '#f1f5f9', color: '#475569', width: '32px', height: '32px' }}>
              <CircleDot size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '22px' }}>{todoCount}</div>
          <div className="stat-footer">Status: To Do</div>
        </div>

        <div className="stat-card" style={{ padding: '16px 18px' }}>
          <div className="stat-header">
            <span className="stat-title">In Progress</span>
            <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb', width: '32px', height: '32px' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '22px' }}>{inProgressCount}</div>
          <div className="stat-footer">Status: In Progress</div>
        </div>

        <div className="stat-card" style={{ padding: '16px 18px' }}>
          <div className="stat-header">
            <span className="stat-title">Done</span>
            <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669', width: '32px', height: '32px' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '22px' }}>{doneCount}</div>
          <div className="stat-footer">Status: Done</div>
        </div>
      </div>

      {/* ========================================================
          SEARCH INPUT WITH DEBOUNCE & FILTER CONTROLS BAR
          ======================================================== */}
      <Card style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', flex: '1' }}>
            
            {/* Search Input with Debounce & Clear Icon */}
            <div style={{ position: 'relative', minWidth: '240px', flex: '1.2' }}>
              <input
                type="text"
                placeholder="Search issues by title (debounced)..."
                className="form-input"
                style={{ paddingLeft: '34px', paddingRight: searchInput ? '32px' : '12px', fontSize: '13px', padding: '8px 32px 8px 34px' }}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              {searching ? (
                <Loader2
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '11px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--primary-600)',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              ) : searchInput ? (
                <X
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '11px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSearchInput('')}
                  title="Clear search input"
                />
              ) : null}
            </div>

            {/* Project Dropdown Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FolderKanban size={15} color="var(--text-muted)" />
              <select
                className="form-select"
                style={{ width: '180px', fontSize: '13px', padding: '8px 12px' }}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                title="Filter by Project"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Status Dropdown Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} color="var(--text-muted)" />
              <select
                className="form-select"
                style={{ width: '150px', fontSize: '13px', padding: '8px 12px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                title="Filter by Status"
              >
                <option value="">All Statuses</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>

            {/* Priority Dropdown Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                className="form-select"
                style={{ width: '140px', fontSize: '13px', padding: '8px 12px' }}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                title="Filter by Priority"
              >
                <option value="">All Priorities</option>
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={handleClearFilters}
              style={{ color: '#b91c1c', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Active Filter Badges Display */}
        {hasActiveFilters && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-light)',
            flexWrap: 'wrap',
            fontSize: '12px',
          }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Active Backend Filters:</span>

            {debouncedSearch && (
              <span style={{
                backgroundColor: '#eef2ff',
                color: 'var(--primary-700)',
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}>
                Search: "{debouncedSearch}"
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearchInput('')} />
              </span>
            )}

            {selectedProjectId && (
              <span style={{
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-700)',
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 500,
              }}>
                Project: {projects.find((p) => p._id === selectedProjectId)?.name || 'Selected'}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedProjectId('')} />
              </span>
            )}

            {statusFilter && (
              <span style={{
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 500,
              }}>
                Status: {statusFilter}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('')} />
              </span>
            )}

            {priorityFilter && (
              <span style={{
                backgroundColor: '#fff7ed',
                color: '#c2410c',
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 500,
              }}>
                Priority: {priorityFilter}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setPriorityFilter('')} />
              </span>
            )}
          </div>
        )}
      </Card>

      {/* ========================================================
          DATA TABLE OR SUITABLE MESSAGE WHEN NO RESULTS FOUND
          ======================================================== */}
      <Card>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Searching issues in MongoDB...
          </div>
        ) : issues.length === 0 ? (
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
              <Search size={24} />
            </div>

            {debouncedSearch ? (
              <>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  No issues found matching "{debouncedSearch}"
                </p>
                <p style={{ fontSize: '13px', marginTop: '4px', maxWidth: '380px', margin: '4px auto 16px' }}>
                  We couldn't find any issues matching your search term and active filters.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RotateCcw}
                  onClick={handleClearFilters}
                >
                  Clear Search & Filters
                </Button>
              </>
            ) : hasActiveFilters ? (
              <>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  No matching issues found
                </p>
                <p style={{ fontSize: '13px', marginTop: '4px', maxWidth: '380px', margin: '4px auto 16px' }}>
                  No issues match the selected project, status, and priority combination.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RotateCcw}
                  onClick={handleClearFilters}
                >
                  Clear All Filters
                </Button>
              </>
            ) : (
              <>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  No issues found
                </p>
                <p style={{ fontSize: '13px', marginTop: '4px', maxWidth: '380px', margin: '4px auto 16px' }}>
                  {projects.length === 0
                    ? 'Create a project first before adding issues.'
                    : 'Add your first issue to track bugs, features, or sprint items.'}
                </p>
                {projects.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={openAddModal}
                  >
                    Add Issue
                  </Button>
                )}
              </>
            )}
          </div>
        ) : viewMode === 'kanban' ? (
          /* ========================================================
             INTERACTIVE KANBAN BOARD WITH DRAG & DROP
             ======================================================== */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '18px',
            alignItems: 'start',
          }}>
            {[
              { id: 'To Do', label: 'To Do', icon: CircleDot, count: todoCount, headerBg: '#f1f5f9', color: '#475569', borderTop: '#64748b' },
              { id: 'In Progress', label: 'In Progress', icon: Clock, count: inProgressCount, headerBg: '#eff6ff', color: '#2563eb', borderTop: '#3b82f6' },
              { id: 'Done', label: 'Done', icon: CheckCircle2, count: doneCount, headerBg: '#ecfdf5', color: '#059669', borderTop: '#10b981' },
            ].map((col) => {
              const ColumnIcon = col.icon;
              const columnIssues = issues.filter((iss) => iss.status === col.id);
              const isOver = dragOverColumn === col.id;

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                  style={{
                    backgroundColor: isOver ? '#f0fdf4' : 'var(--bg-main)',
                    borderRadius: '10px',
                    border: isOver ? '2px dashed #10b981' : '1px solid var(--border-light)',
                    borderTop: `3px solid ${col.borderTop}`,
                    padding: '14px',
                    minHeight: '440px',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Column Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ColumnIcon size={16} color={col.color} />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {col.label}
                      </span>
                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: '#ffffff',
                        color: col.color,
                        border: '1px solid var(--border-light)',
                        padding: '1px 7px',
                        borderRadius: '999px',
                      }}>
                        {col.count}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setFormData({
                          title: '',
                          description: '',
                          status: col.id,
                          priority: 'Medium',
                          projectId: projects[0]?._id || '',
                        });
                        setAddModalOpen(true);
                      }}
                      title={`Add issue to ${col.label}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Cards Lane */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    flex: 1,
                  }}>
                    {columnIssues.length === 0 ? (
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '24px 12px',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                        textAlign: 'center',
                        minHeight: '120px',
                      }}>
                        Drag an issue here or click +
                      </div>
                    ) : (
                      columnIssues.map((issue) => (
                        <div
                          key={issue._id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, issue._id)}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid var(--border-light)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            boxShadow: 'var(--shadow-sm)',
                            cursor: 'grab',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            opacity: draggedIssueId === issue._id ? 0.4 : 1,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                          }}
                        >
                          {/* Card Top: Badges */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                          }}>
                            <Badge type="priority" value={issue.priority} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                              <GripVertical size={14} style={{ opacity: 0.6 }} />
                            </div>
                          </div>

                          {/* Card Title */}
                          <h4 style={{
                            fontSize: '13.5px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: '6px',
                            lineHeight: '1.3',
                          }}>
                            {issue.title}
                          </h4>

                          {/* Card Description */}
                          {issue.description && (
                            <p style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              marginBottom: '10px',
                              lineHeight: '1.4',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}>
                              {issue.description}
                            </p>
                          )}

                          {/* Card Project Tag */}
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            backgroundColor: 'var(--bg-main)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: 'var(--text-secondary)',
                            marginBottom: '10px',
                          }}>
                            <FolderKanban size={12} color="var(--primary-600)" />
                            <span style={{ maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {issue.projectId?.name || 'Unassigned'}
                            </span>
                          </div>

                          {/* Card Footer: Date & Actions */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderTop: '1px solid var(--border-light)',
                            paddingTop: '8px',
                            marginTop: '2px',
                          }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {new Date(issue.createdAt).toLocaleDateString()}
                            </span>

                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => openEditModal(issue)}
                                title="Edit Issue"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-secondary)',
                                  padding: '4px',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                }}
                              >
                                <Edit3 size={13} />
                              </button>

                              <button
                                onClick={() => handleDelete(issue._id, issue.title)}
                                title="Delete Issue"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#dc2626',
                                  padding: '4px',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================
             FULL DATA TABLE VIEW
             ======================================================== */
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Project</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                        {issue.title}
                      </div>
                    </td>
                    <td>
                      <div style={{
                        fontSize: '12.5px',
                        color: 'var(--text-secondary)',
                        maxWidth: '220px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }} title={issue.description}>
                        {issue.description || '—'}
                      </div>
                    </td>
                    <td>
                      {/* Status Dropdown */}
                      <select
                        value={issue.status}
                        onChange={(e) => handleQuickStatusChange(issue._id, e.target.value)}
                        className="form-select"
                        style={{
                          padding: '5px 8px',
                          fontSize: '12px',
                          width: '135px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          backgroundColor:
                            issue.status === 'Done' ? 'var(--status-completed-bg)' :
                            issue.status === 'In Progress' ? 'var(--status-progress-bg)' :
                            'var(--status-todo-bg)',
                          color:
                            issue.status === 'Done' ? 'var(--status-completed-text)' :
                            issue.status === 'In Progress' ? 'var(--status-progress-text)' :
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
                      {/* Priority Dropdown */}
                      <select
                        value={issue.priority}
                        onChange={(e) => handleQuickPriorityChange(issue._id, e.target.value)}
                        className="form-select"
                        style={{
                          padding: '5px 8px',
                          fontSize: '12px',
                          width: '110px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          backgroundColor:
                            issue.priority === 'High' ? 'var(--priority-urgent-bg)' :
                            issue.priority === 'Medium' ? 'var(--priority-medium-bg)' :
                            'var(--priority-low-bg)',
                          color:
                            issue.priority === 'High' ? 'var(--priority-urgent-text)' :
                            issue.priority === 'Medium' ? 'var(--priority-medium-text)' :
                            'var(--priority-low-text)',
                          border: '1px solid var(--border-light)',
                        }}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-secondary)'
                      }}>
                        <FolderKanban size={14} color="var(--primary-500)" />
                        {issue.projectId?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => openEditModal(issue)}
                          title="Edit Issue"
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
                          onClick={() => handleDelete(issue._id, issue.title)}
                          title="Delete Issue"
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
        )}
      </Card>

      {/* ========================================================
          ADD ISSUE MODAL
          ======================================================== */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Issue"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddSubmit} disabled={submitting}>
              {submitting ? 'Creating Issue...' : 'Add Issue'}
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

        <form onSubmit={handleAddSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="issue-title">Issue Title *</label>
            <input
              id="issue-title"
              type="text"
              required
              className="form-input"
              placeholder="e.g. Fix responsive layout breakpoint on mobile"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="issue-project">Target Project *</label>
            <select
              id="issue-project"
              required
              className="form-select"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            >
              {projects.length === 0 && <option value="">No projects available</option>}
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="issue-desc">Description</label>
            <textarea
              id="issue-desc"
              rows={3}
              className="form-textarea"
              placeholder="Describe steps to reproduce, requirements, or notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="issue-status">Status</label>
              <select
                id="issue-status"
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Issue"
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
            <label className="form-label" htmlFor="edit-issue-title">Issue Title *</label>
            <input
              id="edit-issue-title"
              type="text"
              required
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-issue-project">Project *</label>
            <select
              id="edit-issue-project"
              required
              className="form-select"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-issue-desc">Description</label>
            <textarea
              id="edit-issue-desc"
              rows={3}
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-issue-status">Status</label>
              <select
                id="edit-issue-status"
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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

export default Issues;
