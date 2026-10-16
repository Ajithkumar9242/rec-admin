import api from './api.js';

export const jobsApi = {
  getJobs: (params) =>
    api.get('/jobs', { params }).then((res) => res.data),

  getJob: (id) =>
    api.get(`/jobs/${id}`).then((res) => res.data),

  createJob: (data) =>
    api.post('/jobs', data).then((res) => res.data),

  updateJob: (id, data) =>
    api.put(`/jobs/${id}`, data).then((res) => res.data),

  updateJobStatus: (id, data) =>
    api.patch(`/jobs/${id}/status`, data).then((res) => res.data),

  deleteJob: (id, mode = 'MOVE_TO_TRASH') =>
    api.delete(`/jobs/${id}`, { params: { mode } }).then((res) => res.data),

  restoreJob: (id) =>
    api.post(`/jobs/${id}/restore`).then((res) => res.data),

  getJobApplicants: (id, params) =>
    api.get(`/jobs/${id}/applicants`, { params }).then((res) => res.data),

  parseDescriptionFile: (formData) =>
    api
      .post('/jobs/parse-description-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data),
};
