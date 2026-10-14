import axios from 'axios';

let currentCsrfToken = '';

export function setCsrfToken(token) {
  currentCsrfToken = token;
}

export function getCsrfToken() {
  return currentCsrfToken;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach CSRF Token to state-changing requests
api.interceptors.request.use((config) => {
  if (currentCsrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    config.headers['X-CSRF-Token'] = currentCsrfToken;
  }
  return config;
});

// Capture CSRF Token from response headers if provided
api.interceptors.response.use(
  (response) => {
    const csrfHeader = response.headers['x-csrf-token'];
    if (csrfHeader) {
      currentCsrfToken = csrfHeader;
    }
    return response;
  },
  (error) => {
    if (error.response?.headers?.['x-csrf-token']) {
      currentCsrfToken = error.response.headers['x-csrf-token'];
    }
    return Promise.reject(error);
  }
);

export default api;
