import api from './api.js';

export const configurationApi = {
  // ==========================================
  // Industries & Sectors
  // ==========================================
  getIndustries: (params) => api.get('/configuration/industries', { params }).then((res) => res.data),
  getIndustry: (id) => api.get(`/configuration/industries/${id}`).then((res) => res.data),
  createIndustry: (data) => api.post('/configuration/industries', data).then((res) => res.data),
  updateIndustry: (id, data) => api.patch(`/configuration/industries/${id}`, data).then((res) => res.data),
  toggleIndustryStatus: (id, status) =>
    api.patch(`/configuration/industries/${id}/status`, { status }).then((res) => res.data),
  deleteIndustry: (id, mode = 'MOVE_TO_TRASH') =>
    api.delete(`/configuration/industries/${id}`, { params: { mode } }).then((res) => res.data),

  // ==========================================
  // Document Definitions
  // ==========================================
  getDocumentDefinitions: (params) =>
    api.get('/configuration/document-definitions', { params }).then((res) => res.data),
  getDocumentDefinition: (id) =>
    api.get(`/configuration/document-definitions/${id}`).then((res) => res.data),
  createDocumentDefinition: (data) =>
    api.post('/configuration/document-definitions', data).then((res) => res.data),
  updateDocumentDefinition: (id, data) =>
    api.patch(`/configuration/document-definitions/${id}`, data).then((res) => res.data),
  toggleDocumentStatus: (id, status) =>
    api.patch(`/configuration/document-definitions/${id}/status`, { status }).then((res) => res.data),
  deleteDocumentDefinition: (id, mode = 'MOVE_TO_TRASH') =>
    api.delete(`/configuration/document-definitions/${id}`, { params: { mode } }).then((res) => res.data),

  // ==========================================
  // Dynamic Recruitment Stages
  // ==========================================
  getRecruitmentStages: (params) =>
    api.get('/configuration/recruitment-stages', { params }).then((res) => res.data),
  getRecruitmentStage: (id) =>
    api.get(`/configuration/recruitment-stages/${id}`).then((res) => res.data),
  createRecruitmentStage: (data) =>
    api.post('/configuration/recruitment-stages', data).then((res) => res.data),
  updateRecruitmentStage: (id, data) =>
    api.patch(`/configuration/recruitment-stages/${id}`, data).then((res) => res.data),
  reorderRecruitmentStages: (stages) =>
    api.put('/configuration/recruitment-stages/reorder', { stages }).then((res) => res.data),
  toggleStageStatus: (id, status) =>
    api.patch(`/configuration/recruitment-stages/${id}/status`, { status }).then((res) => res.data),
  deleteRecruitmentStage: (id, mode = 'MOVE_TO_TRASH') =>
    api.delete(`/configuration/recruitment-stages/${id}`, { params: { mode } }).then((res) => res.data),

  // ==========================================
  // Platform Settings
  // ==========================================
  getPlatformSettings: () => api.get('/configuration/settings').then((res) => res.data),
  updateCandidateSettings: (data) =>
    api.patch('/configuration/settings/candidate', data).then((res) => res.data),
  updateEmployerVisibility: (data) =>
    api.patch('/configuration/settings/employer-visibility', data).then((res) => res.data),
  updateJobSettings: (data) =>
    api.patch('/configuration/settings/job', data).then((res) => res.data),
  getConfigAuditLogs: (params) =>
    api.get('/configuration/settings/audit-logs', { params }).then((res) => res.data),
};

export function formatConfigurationError(err, fallback = 'An unexpected error occurred.') {
  if (!err) return fallback;
  if (err.response) {
    const status = err.response.status;
    const backendMessage = err.response.data?.error || err.response.data?.message;
    if (status === 401) {
      return backendMessage || 'Authentication required or session expired. Please sign in again.';
    }
    if (status === 403) {
      return backendMessage || 'Access denied: You do not have permission to perform this configuration action.';
    }
    if (status === 404) {
      return backendMessage || 'The requested configuration resource was not found (404).';
    }
    if (status === 409) {
      return backendMessage || 'A duplicate record conflict occurred.';
    }
    if (err.response.data?.issues && Array.isArray(err.response.data.issues)) {
      const issueDetails = err.response.data.issues.map((i) => `${i.field}: ${i.message}`).join(', ');
      return `Validation error (${issueDetails})`;
    }
    if (backendMessage) {
      return backendMessage;
    }
  }
  if (err.request) {
    return 'Unable to reach the configuration server. Please verify network connectivity.';
  }
  return err.message || fallback;
}
