import api from './api.js';

export const companiesApi = {
  getCompanies: (params) =>
    api.get('/companies', { params }).then((res) => res.data),

  getStatusSummary: () =>
    api.get('/companies/status-summary').then((res) => res.data),

  getIntegrationsStatus: () =>
    api.get('/companies/integrations-status').then((res) => res.data),

  getUploadSignature: (data) =>
    api.post('/companies/upload-signature', data).then((res) => res.data),

  getCompany: (id) =>
    api.get(`/companies/${id}`).then((res) => res.data),

  createCompany: (data) =>
    api.post('/companies', data).then((res) => res.data),

  updateCompany: (id, data) =>
    api.put(`/companies/${id}`, data).then((res) => res.data),

  deleteCompany: (id, mode = 'MOVE_TO_TRASH') =>
    api.delete(`/companies/${id}`, { params: { mode } }).then((res) => res.data),

  restoreCompany: (id) =>
    api.post(`/companies/${id}/restore`).then((res) => res.data),

  updateCompanyStatus: (id, data) =>
    api.patch(`/companies/${id}/status`, data).then((res) => res.data),

  reviewCompany: (id, data) =>
    api.post(`/companies/${id}/review`, data).then((res) => res.data),

  addCompanyDocument: (companyId, data) =>
    api.post(`/companies/${companyId}/documents`, data).then((res) => res.data),

  reviewCompanyDocument: (companyId, documentId, data) =>
    api.patch(`/companies/${companyId}/documents/${documentId}/review`, data).then((res) => res.data),

  deleteCompanyDocument: (companyId, documentId) =>
    api.delete(`/companies/${companyId}/documents/${documentId}`).then((res) => res.data),

  getDocumentDownloadUrl: (companyId, documentId) =>
    api.get(`/companies/${companyId}/documents/${documentId}/download`).then((res) => res.data),

  sendCompanyInvitation: (companyId, data) =>
    api.post(`/companies/${companyId}/invitations`, data).then((res) => res.data),

  resendCompanyInvitation: (companyId, invitationId) =>
    api.post(`/companies/${companyId}/invitations/${invitationId}/resend`).then((res) => res.data),

  uploadAsset: (formData) =>
    api
      .post('/companies/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data),

  uploadCompanyDocument: (companyId, formData) =>
    api
      .post(`/companies/${companyId}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data),
};
