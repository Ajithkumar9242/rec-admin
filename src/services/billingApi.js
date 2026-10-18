import api from './api.js';

export const billingApi = {
  // Plans
  getPlans: (params) => api.get('/billing/plans', { params }).then((res) => res.data),
  getPlan: (id) => api.get(`/billing/plans/${id}`).then((res) => res.data),
  createPlan: (data) => api.post('/billing/plans', data).then((res) => res.data),
  updatePlan: (id, data) => api.patch(`/billing/plans/${id}`, data).then((res) => res.data),
  togglePlanStatus: (id, status) => api.patch(`/billing/plans/${id}/status`, { status }).then((res) => res.data),
  archivePlan: (id) => api.delete(`/billing/plans/${id}`).then((res) => res.data),
  restorePlan: (id) => api.post(`/billing/plans/${id}/restore`).then((res) => res.data),
  deletePlanPermanently: (id) => api.delete(`/billing/plans/${id}`, { params: { mode: 'DELETE_PERMANENTLY' } }).then((res) => res.data),

  // Subscriptions
  getSubscriptions: (params) => api.get('/billing/subscriptions', { params }).then((res) => res.data),
  getSubscription: (id) => api.get(`/billing/subscriptions/${id}`).then((res) => res.data),
  createSubscription: (data) => api.post('/billing/subscriptions', data).then((res) => res.data),
  updateEntitlements: (id, data) => api.patch(`/billing/subscriptions/${id}/entitlements`, data).then((res) => res.data),
  upgradeSubscription: (id, data) => api.post(`/billing/subscriptions/${id}/upgrade`, data).then((res) => res.data),
  cancelSubscription: (id, data) => api.post(`/billing/subscriptions/${id}/cancel`, data).then((res) => res.data),
  revokeSubscription: (id, data) => api.post(`/billing/subscriptions/${id}/revoke`, data).then((res) => res.data),
  applyPlanQuotas: (id, data) => api.post(`/billing/subscriptions/${id}/apply-plan-quotas`, data).then((res) => res.data),
  getSubscriptionHistory: (id) => api.get(`/billing/subscriptions/${id}/history`).then((res) => res.data),

  // Invoices & Payments
  getInvoices: (params) => api.get('/billing/invoices', { params }).then((res) => res.data),
  getInvoice: (id) => api.get(`/billing/invoices/${id}`).then((res) => res.data),
  createInvoice: (data) => api.post('/billing/invoices', data).then((res) => res.data),
  createInvoiceStripeCheckout: (id, data) => api.post(`/billing/invoices/${id}/stripe-checkout`, data).then((res) => res.data),
  confirmInvoiceStripeCheckout: (id, data) => api.post(`/billing/invoices/${id}/confirm-stripe-checkout`, data).then((res) => res.data),
  recordPayment: (id, data) => api.post(`/billing/invoices/${id}/payments`, data).then((res) => res.data),
  voidInvoice: (id, data) => api.post(`/billing/invoices/${id}/void`, data).then((res) => res.data),

  // Canonical Companies / Employers Search
  getCompanies: (params) => api.get('/billing/companies', { params }).then((res) => res.data),
  createCompany: (data) => api.post('/billing/companies', data).then((res) => res.data),

  // Analytics & Reports
  getBillingAnalytics: (params) => api.get('/billing/analytics', { params }).then((res) => res.data),

  // Stripe Payment Provider
  getStripeConfig: () => api.get('/billing/stripe/config').then((res) => res.data),
  createStripeCheckoutSession: (data) => api.post('/billing/stripe/checkout-session', data).then((res) => res.data),
  createStripePortalSession: (data) => api.post('/billing/stripe/portal-session', data).then((res) => res.data),
};

export function formatBillingError(err, fallback = 'An unexpected error occurred.') {
  if (!err) return fallback;
  if (err.response) {
    const status = err.response.status;
    const backendMessage = err.response.data?.error || err.response.data?.message;
    if (status === 401) {
      return backendMessage || 'Authentication required or session expired. Please sign in again.';
    }
    if (status === 403) {
      return backendMessage || 'Access denied: You do not have permission to perform this billing operation.';
    }
    if (status === 404) {
      return backendMessage || 'The requested billing resource or endpoint was not found (404).';
    }
    if (status >= 500) {
      return backendMessage || 'Billing service encountered an internal error. Please try again later.';
    }
    if (backendMessage) {
      return backendMessage;
    }
  }
  if (err.request) {
    return 'Unable to reach the billing server. Please verify network connectivity and backend service status.';
  }
  return err.message || fallback;
}
