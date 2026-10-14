import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import authReducer from '../store/authSlice.js';
import themeReducer, { toggleTheme } from '../store/themeSlice.js';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';
import { ThemeSwitcher } from '../components/ThemeSwitcher.jsx';
import { ProtectedRoute } from '../components/ProtectedRoute.jsx';
import '../i18n/index.js';
import i18n, { changeAppLanguage } from '../i18n/index.js';
import api from '../services/api.js';

// Helper to render with fresh Redux store and router
function renderWithProviders(ui, { initialState = {}, route = '/login' } = {}) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      theme: themeReducer,
    },
    preloadedState: initialState,
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>
    ),
  };
}

describe('Frontend Auth & UI Foundations', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    changeAppLanguage('en');
  });

  describe('1. Form Validation & Controls', () => {
    it('displays validation errors when submitting empty login form', async () => {
      renderWithProviders(<LoginPage />);

      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('displays error alert when auth state has an error', () => {
      renderWithProviders(<LoginPage />, {
        initialState: {
          auth: {
            user: null,
            isAuthenticated: false,
            isInitialized: true,
            loading: false,
            error: 'Invalid credentials provided',
            pending2FA: { requires2FA: false, adminId: null },
          },
        },
      });

      expect(screen.getByText(/invalid credentials provided/i)).toBeInTheDocument();
    });
  });

  describe('2. Login and 2FA Navigation', () => {
    it('renders 2FA verification step when pending2FA is true', () => {
      renderWithProviders(<LoginPage />, {
        initialState: {
          auth: {
            user: null,
            isAuthenticated: false,
            isInitialized: true,
            loading: false,
            error: null,
            pending2FA: { requires2FA: true, adminId: 'test-admin-id' },
          },
        },
      });

      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/000000/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify code/i })).toBeInTheDocument();
    });

    it('switches from TOTP to Backup Code recovery step', async () => {
      renderWithProviders(<LoginPage />, {
        initialState: {
          auth: {
            user: null,
            isAuthenticated: false,
            isInitialized: true,
            loading: false,
            error: null,
            pending2FA: { requires2FA: true, adminId: 'test-admin-id' },
          },
        },
      });

      const backupCodeLink = screen.getByRole('button', { name: /use a backup code instead/i });
      fireEvent.click(backupCodeLink);

      await waitFor(() => {
        expect(screen.getByText(/backup code verification/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /verify backup code/i })).toBeInTheDocument();
      });
    });
  });

  describe('3. Language Switching (English / German)', () => {
    it('switches application language and reflects in translation', async () => {
      expect(i18n.t('auth.signInButton')).toBe('Sign In');

      changeAppLanguage('de');
      expect(i18n.language).toBe('de');
      expect(i18n.t('auth.signInButton')).toBe('Anmelden');

      changeAppLanguage('en');
      expect(i18n.language).toBe('en');
      expect(i18n.t('auth.signInButton')).toBe('Sign In');
    });

    it('renders LanguageSwitcher component properly', () => {
      const { container } = renderWithProviders(<LanguageSwitcher />);
      expect(container.querySelector('.ant-select')).toBeInTheDocument();
    });
  });

  describe('4. Theme Switching (Light / Dark)', () => {
    it('toggles theme state in Redux store', () => {
      const store = configureStore({
        reducer: { theme: themeReducer },
      });

      expect(store.getState().theme.isDarkMode).toBe(false);

      store.dispatch(toggleTheme());
      expect(store.getState().theme.isDarkMode).toBe(true);

      store.dispatch(toggleTheme());
      expect(store.getState().theme.isDarkMode).toBe(false);
    });

    it('renders ThemeSwitcher toggle button', () => {
      renderWithProviders(<ThemeSwitcher />);
      expect(screen.getByRole('button', { name: /toggle theme mode/i })).toBeInTheDocument();
    });
  });

  describe('5. Protected Route Guard & Session Initialization', () => {
    it('shows loading spinner when session is not yet initialized', () => {
      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        {
          initialState: {
            auth: {
              user: null,
              isAuthenticated: false,
              isInitialized: false, // Initializing session with backend
              loading: true,
              error: null,
              pending2FA: { requires2FA: false, adminId: null },
            },
          },
        }
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('renders protected child when authenticated and initialized', () => {
      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        {
          initialState: {
            auth: {
              user: { id: 'admin-1', email: 'admin@recruitrain.com', role: 'ADMIN' },
              isAuthenticated: true,
              isInitialized: true,
              loading: false,
              error: null,
              pending2FA: { requires2FA: false, adminId: null },
            },
          },
        }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});
