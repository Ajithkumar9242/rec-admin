import api from './api.js';

export const candidateApi = {
  // ----------------------------------------------------
  // Admin & Management Endpoints
  // ----------------------------------------------------

  getCandidates: (params) =>
    api.get('/candidates/admin', { params }).then((res) => res.data),

  getCandidate: (id) =>
    api.get(`/candidates/admin/${id}`).then((res) => res.data),

  createCandidate: (data, isFormData = false) =>
    api
      .post('/candidates/admin', data, isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)
      .then((res) => res.data),

  parseResume: (formData) =>
    api
      .post('/candidates/admin/parse-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data),

  updateCandidate: (id, data) =>
    api.put(`/candidates/admin/${id}`, data).then((res) => res.data),

  updateCandidateStatus: (id, data) =>
    api.patch(`/candidates/admin/${id}/status`, data).then((res) => res.data),

  resendInvitation: (id) =>
    api.post(`/candidates/admin/${id}/resend-invitation`).then((res) => res.data),

  uploadResumeByAdmin: (id, formData) =>
    api
      .post(`/candidates/admin/${id}/resume`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data),

  getResumeBlob: (id, disposition = 'inline') =>
    api
      .get(`/candidates/admin/${id}/resume`, {
        params: { disposition },
        responseType: 'blob',
      })
      .then((res) => res.data),

  deleteCandidate: (id, mode = 'MOVE_TO_TRASH') =>
    api.delete(`/candidates/admin/${id}`, { params: { mode } }).then((res) => res.data),

  restoreCandidate: (id) =>
    api.post(`/candidates/admin/${id}/restore`).then((res) => res.data),

  // ----------------------------------------------------
  // Candidate Invitation Endpoints (Public)
  // ----------------------------------------------------

  verifyInvitation: (token) =>
    api.get('/candidates/invitations/verify', { params: { token } }).then((res) => res.data),

  activateInvitation: (data) =>
    api.post('/candidates/invitations/activate', data).then((res) => res.data),

  // ----------------------------------------------------
  // Candidate Self-Service Endpoints
  // ----------------------------------------------------

  getMe: () =>
    api.get('/candidates/me').then((res) => res.data),

  updateMe: (data) =>
    api.put('/candidates/me', data).then((res) => res.data),

  uploadResume: (formData) =>
    api
      .post('/candidates/me/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data),

  getSavedJobs: () =>
    api.get('/candidates/me/saved-jobs').then((res) => res.data),

  saveJob: (jobId) =>
    api.post(`/candidates/me/saved-jobs/${jobId}`).then((res) => res.data),

  removeSavedJob: (jobId) =>
    api.delete(`/candidates/me/saved-jobs/${jobId}`).then((res) => res.data),

  getMyApplications: () =>
    api.get('/candidates/me/applications').then((res) => res.data),
};

export default candidateApi;
