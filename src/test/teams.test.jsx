import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../store/authSlice.js';
import themeReducer from '../store/themeSlice.js';
import { AdminShell } from '../components/AdminShell.jsx';
import { TeamsPage } from '../features/teams/TeamsPage.jsx';
import { teamsApi } from '../services/teamsApi.js';
import { companiesApi } from '../services/companiesApi.js';
import { App as AntdApp } from 'antd';
import '../i18n/index.js';
import { changeAppLanguage } from '../i18n/index.js';

function renderWithProviders(ui, { initialState = {}, route = '/' } = {}) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      theme: themeReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: { name: 'Admin Tester', email: 'admin@recruitrain.test', role: 'SUPER_ADMIN' },
        ...initialState.auth,
      },
      theme: { isDarkMode: false, ...initialState.theme },
    },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <AntdApp>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[route]}>
            {ui}
          </MemoryRouter>
        </AntdApp>
      </Provider>
    ),
  };
}

describe('RecruiTrain Teams & Permission Management (RBAC) Frontend Suite', () => {
  const mockTeams = [
    {
      id: 'team-1',
      name: 'Engineering Talent Squad',
      description: 'Core technical recruitment',
      companyId: 'comp-1',
      company: { id: 'comp-1', name: 'Acme Global Corp' },
      createdAt: new Date().toISOString(),
      _count: { members: 3 },
      members: [],
    },
  ];

  const mockMembers = [
    {
      id: 'member-1',
      email: 'recruiter1@acme.com',
      firstName: 'Sarah',
      lastName: 'Connor',
      name: 'Sarah Connor',
      role: 'RECRUITER',
      effectiveRoleName: 'Recruiter',
      status: 'ACTIVE',
      company: { id: 'comp-1', name: 'Acme Global Corp' },
      teams: [{ teamId: 'team-1', teamName: 'Engineering Talent Squad', role: 'Recruiter' }],
      pendingInvitation: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'member-2',
      email: 'invited@acme.com',
      firstName: 'John',
      lastName: 'Smith',
      name: 'John Smith',
      role: 'MEMBER',
      effectiveRoleName: 'Member',
      status: 'INVITED',
      company: { id: 'comp-1', name: 'Acme Global Corp' },
      teams: [],
      pendingInvitation: { id: 'inv-1', sentAt: new Date().toISOString(), expiresAt: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    },
  ];

  const mockRoles = [
    {
      id: 'role-superadmin',
      name: 'Super Admin',
      code: 'SUPER_ADMIN',
      description: 'Complete platform-wide administrative control',
      isSystem: true,
      assignedCount: 1,
      permissions: {
        DASHBOARD: { READ: true, CREATE: true, EDIT: true, DELETE: true, EXPORT: true },
        COMPANIES: { READ: true, CREATE: true, EDIT: true, DELETE: true, EXPORT: true },
        CANDIDATES: { READ: true, CREATE: true, EDIT: true, DELETE: true, EXPORT: true },
        JOBS: { READ: true, CREATE: true, EDIT: true, DELETE: true, EXPORT: true },
        APPLICATIONS: { READ: true, CREATE: true, EDIT: true, DELETE: true, EXPORT: true },
        TEAMS: { READ: true, CREATE: true, EDIT: true, DELETE: true, EXPORT: true },
        BILLING: { READ: true, CREATE: true, EDIT: true, DELETE: true, EXPORT: true },
      },
    },
    {
      id: 'role-recruiter',
      name: 'Recruiter',
      code: 'RECRUITER',
      description: 'Manage candidates and jobs',
      isSystem: true,
      assignedCount: 4,
      permissions: {
        DASHBOARD: { READ: true, CREATE: false, EDIT: false, DELETE: false, EXPORT: false },
        COMPANIES: { READ: true, CREATE: false, EDIT: false, DELETE: false, EXPORT: false },
        CANDIDATES: { READ: true, CREATE: true, EDIT: true, DELETE: false, EXPORT: true },
        JOBS: { READ: true, CREATE: true, EDIT: true, DELETE: false, EXPORT: false },
        APPLICATIONS: { READ: true, CREATE: true, EDIT: true, DELETE: false, EXPORT: true },
        TEAMS: { READ: true, CREATE: false, EDIT: false, DELETE: false, EXPORT: false },
        BILLING: { READ: false, CREATE: false, EDIT: false, DELETE: false, EXPORT: false },
      },
    },
    {
      id: 'role-custom-lead',
      name: 'Lead Talent Partner',
      code: 'CUSTOM_LEAD',
      description: 'Custom leadership role',
      isSystem: false,
      assignedCount: 0,
      permissions: {
        CANDIDATES: { READ: true, CREATE: true, EDIT: true, DELETE: true, EXPORT: true },
      },
    },
  ];

  const mockSchema = {
    modules: [
      { key: 'DASHBOARD', label: 'Dashboard & Analytics' },
      { key: 'COMPANIES', label: 'Companies' },
      { key: 'CANDIDATES', label: 'Candidates' },
      { key: 'JOBS', label: 'Jobs' },
      { key: 'APPLICATIONS', label: 'Applications & Pipeline' },
      { key: 'TEAMS', label: 'Teams & Permissions' },
      { key: 'BILLING', label: 'Billing & Subscriptions' },
    ],
    actions: [
      { key: 'READ', label: 'Read / View' },
      { key: 'CREATE', label: 'Create' },
      { key: 'EDIT', label: 'Edit' },
      { key: 'DELETE', label: 'Delete' },
      { key: 'EXPORT', label: 'Export' },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    changeAppLanguage('en');

    vi.spyOn(teamsApi, 'getTeams').mockResolvedValue({ success: true, teams: mockTeams, pagination: { total: 1 } });
    vi.spyOn(teamsApi, 'getMembers').mockResolvedValue({ success: true, members: mockMembers, pagination: { total: 2 } });
    vi.spyOn(teamsApi, 'getRoles').mockResolvedValue({ success: true, data: mockRoles });
    vi.spyOn(teamsApi, 'getPermissionSchema').mockResolvedValue({ success: true, data: mockSchema });
    vi.spyOn(companiesApi, 'getCompanies').mockResolvedValue({
      success: true,
      data: [{ id: 'comp-1', name: 'Acme Global Corp' }],
    });
  });

  describe('1. Navigation & Shell Integration', () => {
    it('renders Teams & Permissions navigation link in AdminShell', () => {
      renderWithProviders(<AdminShell />, { route: '/admin' });
      expect(screen.getAllByText(/Teams & Permissions/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Teams & Members Directory View', () => {
    it('renders statistics cards, teams table and members directory', async () => {
      renderWithProviders(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Teams & Permission Management \(RBAC\)/i)).toBeInTheDocument();
      });

      // Quick Stats
      expect(screen.getByText(/Active Teams/i)).toBeInTheDocument();
      expect(screen.getByText(/Team Members/i)).toBeInTheDocument();
      expect(screen.getByText(/Defined Roles/i)).toBeInTheDocument();

      // Team record
      await waitFor(() => {
        expect(screen.getAllByText('Engineering Talent Squad').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Acme Global Corp').length).toBeGreaterThanOrEqual(1);
      });

      // Member records
      await waitFor(() => {
        expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
        expect(screen.getByText('recruiter1@acme.com')).toBeInTheDocument();
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('invited@acme.com')).toBeInTheDocument();
        expect(screen.getByText('Resend Invite')).toBeInTheDocument();
      });
    });

    it('opens Create Team modal upon clicking button', async () => {
      renderWithProviders(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Teams & Permission Management/i)).toBeInTheDocument();
      });

      const createBtn = screen.getByRole('button', { name: /Create Team/i });
      fireEvent.click(createBtn);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Engineering Recruitment Team/i)).toBeInTheDocument();
      });
    });

    it('opens Invite Member modal upon clicking button', async () => {
      renderWithProviders(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Teams & Permission Management/i)).toBeInTheDocument();
      });

      const inviteBtn = screen.getByRole('button', { name: /Invite Member/i });
      fireEvent.click(inviteBtn);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/colleague@organization.com/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. Roles & Granular Permission Matrix (RBAC)', () => {
    it('switches to Roles tab and renders role cards', async () => {
      renderWithProviders(<TeamsPage />);

      const rolesTab = screen.getByRole('tab', { name: /Roles & Granular Permissions/i });
      fireEvent.click(rolesTab);

      await waitFor(() => {
        expect(screen.getByText(/Role-Based Access Control \(RBAC\)/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Super Admin')).toBeInTheDocument();
      expect(screen.getAllByText('Recruiter').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Lead Talent Partner')).toBeInTheDocument();
    });

    it('opens Permission Matrix modal with 5 action columns and module rows', async () => {
      renderWithProviders(<TeamsPage />);

      // Switch to roles tab
      const rolesTab = screen.getByRole('tab', { name: /Roles & Granular Permissions/i });
      fireEvent.click(rolesTab);

      await waitFor(() => {
        expect(screen.getByText('Lead Talent Partner')).toBeInTheDocument();
      });

      const configButtons = screen.getAllByRole('button', { name: /Configure Matrix/i });
      fireEvent.click(configButtons[0]);

      await waitFor(() => {
        expect(screen.getAllByText(/Permission Matrix/i).length).toBeGreaterThanOrEqual(1);
      });

      // Actions in matrix table
      expect(screen.getByText(/Read \/ View/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Create/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Edit/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Delete/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Export/i).length).toBeGreaterThanOrEqual(1);

      // Modules in matrix table
      expect(screen.getByText(/Dashboard & Analytics/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Candidates/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Jobs/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Billing & Subscriptions/i)).toBeInTheDocument();
    });
  });

  describe('4. Multilingual i18n Verification', () => {
    it('switches between English and German translations seamlessly', async () => {
      renderWithProviders(<TeamsPage />);

      // Switch to German
      changeAppLanguage('de');

      await waitFor(() => {
        expect(screen.getByText(/Teams & Berechtigungsverwaltung \(RBAC\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Aktive Teams/i)).toBeInTheDocument();
      });

      // Switch back to English
      changeAppLanguage('en');

      await waitFor(() => {
        expect(screen.getByText(/Teams & Permission Management \(RBAC\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Active Teams/i)).toBeInTheDocument();
      });
    });
  });
});
