import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import authReducer, { AuthState } from '../store/authSlice.js';
import themeReducer, { toggleTheme } from '../store/themeSlice.js';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';
import { ThemeSwitcher } from '../components/ThemeSwitcher.jsx';
import { ProtectedRoute } from '../components/ProtectedRoute.jsx';
import '../i18n/index.js';
import i18n, { changeAppLanguage } from '../i18n/index.js';

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

describe('RecruiTrain Admin Frontend Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    changeAppLanguage('en');
  });

  describe('1. Form Controls & Validation', () => {
    it('displays validation errors when submitting empty login form', async () => {
      renderWithProviders(<LoginPage />);

      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('displays error alert when auth error exists', () => {
      renderWithProviders(<LoginPage />, {
        initialState: {
          auth: {
            user: null,
            authState: AuthState.UNAUTHENTICATED,
            isAuthenticated: false,
            isInitialized: true,
            loading: false,
            error: 'Invalid credentials provided',
            pendingAdminId: null,
          },
        },
      });

      expect(screen.getByText(/invalid credentials provided/i)).toBeInTheDocument();
    });
  });

  describe('2. Authentication State Machine Navigation', () => {
    it('renders 2FA verification step when state is PASSWORD_ACCEPTED_MFA_PENDING', () => {
      renderWithProviders(<LoginPage />, {
        initialState: {
          auth: {
            user: null,
            authState: AuthState.PASSWORD_ACCEPTED_MFA_PENDING,
            isAuthenticated: false,
            isInitialized: true,
            loading: false,
            error: null,
            pendingAdminId: 'test-admin-id',
          },
        },
      });

      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/000000/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify code/i })).toBeInTheDocument();
    });

    it('switches to Backup Code recovery view from TOTP view', async () => {
      renderWithProviders(<LoginPage />, {
        initialState: {
          auth: {
            user: null,
            authState: AuthState.PASSWORD_ACCEPTED_MFA_PENDING,
            isAuthenticated: false,
            isInitialized: true,
            loading: false,
            error: null,
            pendingAdminId: 'test-admin-id',
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

    it('renders MFA enrollment view when state is MFA_ENROLLMENT_REQUIRED', () => {
      renderWithProviders(<LoginPage />, {
        initialState: {
          auth: {
            user: null,
            authState: AuthState.MFA_ENROLLMENT_REQUIRED,
            isAuthenticated: false,
            isInitialized: true,
            loading: false,
            error: null,
            pendingAdminId: 'test-admin-id',
          },
        },
      });

      expect(screen.getByText(/set up two-factor authentication/i)).toBeInTheDocument();
    });
  });

  describe('3. Language Switching (English / German)', () => {
    it('switches application language and reflects in translated labels', async () => {
      expect(i18n.t('auth.signInButton')).toBe('Sign In');

      changeAppLanguage('de');
      expect(i18n.language).toBe('de');
      expect(i18n.t('auth.signInButton')).toBe('Anmelden');

      changeAppLanguage('en');
      expect(i18n.language).toBe('en');
      expect(i18n.t('auth.signInButton')).toBe('Sign In');
    });

    it('renders LanguageSwitcher component with current selection', () => {
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

    it('renders ThemeSwitcher toggle control', () => {
      renderWithProviders(<ThemeSwitcher />);
      expect(screen.getByRole('button', { name: /toggle theme mode/i })).toBeInTheDocument();
    });
  });

  describe('5. Protected Route Initialization & Access Guard', () => {
    it('shows loading indicator when session is not yet initialized', () => {
      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        {
          initialState: {
            auth: {
              user: null,
              authState: AuthState.UNAUTHENTICATED,
              isAuthenticated: false,
              isInitialized: false,
              loading: true,
              error: null,
              pendingAdminId: null,
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
              user: { id: 'admin-1', email: 'superadmin@recruitrain.com', role: 'SUPER_ADMIN' },
              authState: AuthState.AUTHENTICATED_MFA_VERIFIED,
              isAuthenticated: true,
              isInitialized: true,
              loading: false,
              error: null,
              pendingAdminId: null,
            },
          },
        }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});
