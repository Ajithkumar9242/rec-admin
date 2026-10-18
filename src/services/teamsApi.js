import api from './api.js';

export const teamsApi = {
  // Teams
  getTeams: (params) =>
    api.get('/teams', { params }).then((res) => res.data),

  getTeam: (id) =>
    api.get(`/teams/${id}`).then((res) => res.data),

  createTeam: (data) =>
    api.post('/teams', data).then((res) => res.data),

  updateTeam: (id, data) =>
    api.put(`/teams/${id}`, data).then((res) => res.data),

  deleteTeam: (id) =>
    api.delete(`/teams/${id}`).then((res) => res.data),

  // Members in Teams
  addMember: (teamId, data) =>
    api.post(`/teams/${teamId}/members`, data).then((res) => res.data),

  removeMember: (teamId, memberId) =>
    api.delete(`/teams/${teamId}/members/${memberId}`).then((res) => res.data),

  updateMemberRole: (teamId, memberId, data) =>
    api.patch(`/teams/${teamId}/members/${memberId}/role`, data).then((res) => res.data),

  // Global Members Directory
  getMembers: (params) =>
    api.get('/teams/members/directory', { params }).then((res) => res.data),

  updateMemberStatus: (userId, data) =>
    api.patch(`/teams/members/${userId}/status`, data).then((res) => res.data),

  inviteMember: (data) =>
    api.post('/teams/members/invite', data).then((res) => res.data),

  resendInvitation: (invitationId) =>
    api.post(`/teams/members/invitations/${invitationId}/resend`).then((res) => res.data),

  // Roles & Permissions
  getRoles: (params) =>
    api.get('/roles', { params }).then((res) => res.data),

  getRole: (id) =>
    api.get(`/roles/${id}`).then((res) => res.data),

  createRole: (data) =>
    api.post('/roles', data).then((res) => res.data),

  updateRole: (id, data) =>
    api.put(`/roles/${id}`, data).then((res) => res.data),

  deleteRole: (id) =>
    api.delete(`/roles/${id}`).then((res) => res.data),

  getPermissionSchema: () =>
    api.get('/roles/schema').then((res) => res.data),

  getMyPermissions: () =>
    api.get('/roles/me').then((res) => res.data),
};
