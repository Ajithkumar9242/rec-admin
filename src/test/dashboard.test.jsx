import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../store/authSlice.js';
import themeReducer from '../store/themeSlice.js';
import { DataTable, StatusBadge } from '../components/common/DataTable.jsx';
import { DeleteConfirmationModal } from '../components/common/DeleteConfirmationModal.jsx';
import { sanitizeCellForCsv } from '../utils/exportUtils.js';
import { AdminShell } from '../components/AdminShell.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import api from '../services/api.js';
import '../i18n/index.js';
import { changeAppLanguage } from '../i18n/index.js';

function renderWithProviders(ui, { initialState = {}, route = '/' } = {}) {
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
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[route]}>
          {ui}
        </MemoryRouter>
      </Provider>
    ),
  };
}

describe('Dashboard & Data Management Standards Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    changeAppLanguage('en');
  });

  describe('1. Reusable DataTable Component', () => {
    const mockColumns = [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'Role', dataIndex: 'role', key: 'role' },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status) => <StatusBadge status={status} />,
      },
    ];

    const mockData = [
      { id: '1', name: 'Alice Smith', role: 'Developer', status: 'ACTIVE' },
      { id: '2', name: 'Bob Jones', role: 'Designer', status: 'INACTIVE' },
      { id: '3', name: 'Charlie Brown', role: 'Manager', status: 'ACTIVE' },
    ];

    it('renders search bar, records, and active/inactive status badges', () => {
      render(<DataTable columns={mockColumns} dataSource={mockData} rowKey="id" />);

      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();

      // Check Status Badges
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBe(2);
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('filters records in real-time when searching client-side', () => {
      render(<DataTable columns={mockColumns} dataSource={mockData} rowKey="id" />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Designer' } });

      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
    });

    it('displays empty state when no matching records found', () => {
      render(<DataTable columns={mockColumns} dataSource={mockData} rowKey="id" />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });

      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
      expect(screen.getAllByText(/no data/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. DeleteConfirmationModal & 30-Day Trash Lifecycle', () => {
    it('displays Move to Trash (30-day retention) option and submits MOVE_TO_TRASH', () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <DeleteConfirmationModal
          open={true}
          recordTitle="Job Posting #101"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );

      // Check retention information
      expect(screen.getAllByText(/move to trash/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/30 days/i)).toBeInTheDocument();
      expect(screen.getAllByText(/delete permanently/i).length).toBeGreaterThanOrEqual(1);

      // Submit Move to Trash button
      const confirmBtn = screen.getByRole('button', { name: /move to trash/i });
      fireEvent.click(confirmBtn);

      expect(handleConfirm).toHaveBeenCalledWith('MOVE_TO_TRASH');
    });

    it('allows selecting permanent deletion and submits DELETE_PERMANENTLY', () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <DeleteConfirmationModal
          open={true}
          recordTitle="Candidate Profile"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );

      // Switch to permanent deletion
      const hardOption = screen.getByDisplayValue('DELETE_PERMANENTLY');
      fireEvent.click(hardOption);

      // Confirmation button now reads "Delete Permanently"
      const deleteButton = screen.getByRole('button', { name: /delete permanently/i });
      fireEvent.click(deleteButton);

      expect(handleConfirm).toHaveBeenCalledWith('DELETE_PERMANENTLY');
    });
  });

  describe('3. CSV Export Security & Formula Injection Defense', () => {
    it('sanitizes dangerous spreadsheet formula prefixes (=, +, -, @, \\t)', () => {
      expect(sanitizeCellForCsv('=1+1')).toBe('"\'=1+1"');
      expect(sanitizeCellForCsv('+SUM(A1:A10)')).toBe('"\'+SUM(A1:A10)"');
      expect(sanitizeCellForCsv('-2+3')).toBe('"\'\-2+3"');
      expect(sanitizeCellForCsv('@evil.com')).toBe('"\'@evil.com"');
      expect(sanitizeCellForCsv('\tcmd')).toBe('"\'\tcmd"');
    });

    it('safely escapes embedded double quotes, commas, and strips newlines', () => {
      expect(sanitizeCellForCsv('Hello, "World"')).toBe('"Hello, ""World"""');
      expect(sanitizeCellForCsv('Normal Text')).toBe('"Normal Text"');
      expect(sanitizeCellForCsv(12345)).toBe('"12345"');
      expect(sanitizeCellForCsv("Line1\nLine2")).toBe('"Line1 Line2"');
    });
  });

  describe('4. Navigation & Localization', () => {
    it('renders Dashboard sidebar item in English and German', () => {
      const initialState = {
        auth: {
          user: {
            id: 'admin-1',
            email: 'admin@recruitrain.test',
            name: 'Test Administrator',
            role: 'SUPER_ADMIN',
          },
          isAuthenticated: true,
        },
      };

      changeAppLanguage('en');
      const { unmount } = renderWithProviders(<AdminShell />, { initialState, route: '/dashboard' });
      expect(screen.getByRole('menuitem', { name: /dashboard/i })).toBeInTheDocument();
      unmount();

      changeAppLanguage('de');
      renderWithProviders(<AdminShell />, { initialState, route: '/dashboard' });
      expect(screen.getByRole('menuitem', { name: /dashboard/i })).toBeInTheDocument();
    });
  });

  describe('5. Application Shell Layout & Fixed Scrolling Behavior', () => {
    it('maintains fixed shell with independent content and sidebar scroll containers', () => {
      const initialState = {
        auth: {
          user: {
            id: 'admin-1',
            email: 'admin@recruitrain.test',
            name: 'Test Administrator',
            role: 'SUPER_ADMIN',
          },
          isAuthenticated: true,
        },
      };

      const { container } = renderWithProviders(<AdminShell />, { initialState, route: '/admin' });

      // Outer layout prevents document-level window scroll
      const outerLayout = container.querySelector('.ant-layout');
      expect(outerLayout).toBeInTheDocument();
      expect(outerLayout.style.overflow).toBe('hidden');

      // Topbar remains fixed at 64px height
      const header = container.querySelector('.ant-layout-header');
      expect(header).toBeInTheDocument();
      expect(header.style.height).toBe('64px');
      expect(header.style.flexShrink).toBe('0');

      // Main content has its own independent vertical scrolling
      const content = container.querySelector('.ant-layout-content');
      expect(content).toBeInTheDocument();
      expect(content.style.overflowY).toBe('auto');
      expect(content.style.flex).toBe('1 1 0%');

      // Sidebar has independent scroll container for menu
      const sider = container.querySelector('.ant-layout-sider');
      expect(sider).toBeInTheDocument();
      const sidebarScroll = sider.querySelector('div[style*="overflow-y: auto"]');
      expect(sidebarScroll).toBeInTheDocument();
    });
  });

  describe('6. Dashboard Grouping Filter UX & Select Dropdown Control', () => {
    const mockDashboardData = {
      success: true,
      dateRange: {
        from: '2026-09-14T00:00:00.000Z',
        to: '2026-10-14T23:59:59.999Z',
        groupBy: 'day',
      },
      kpis: {
        activeJobs: { count: null, connected: false, label: 'Active Jobs' },
        inactiveJobs: { count: null, connected: false, label: 'Inactive Jobs' },
        totalCompanies: { count: null, connected: false, label: 'Total Employers' },
        totalCandidates: { count: null, connected: false, label: 'Total Candidates' },
        totalAdmins: { count: 1, connected: true, label: 'Total Administrators' },
        activeAdmins: { count: 1, connected: true, label: 'Active Accounts' },
        mfaAdoption: { count: 1, percentage: 100, connected: true, label: 'MFA Adoption Rate' },
        totalAuditEvents: { count: 35, connected: true, label: 'Security Audit Events' },
      },
      charts: {
        auditActivity: {
          connected: true,
          label: 'Security & Audit Activity',
          groupBy: 'day',
          series: [{ bucket: '2026-10-14T00:00:00.000Z', count: 5 }],
        },
        jobPostings: { connected: false, series: [] },
        candidateRegistrations: { connected: false, series: [] },
        employerRegistrations: { connected: false, series: [] },
      },
      recentNotifications: {
        connected: false,
        items: [],
        unreadCount: 0,
      },
      recentActivity: [],
    };

    it('renders Select dropdown for grouping and asserts segmented control is absent', async () => {
      vi.spyOn(api, 'get').mockResolvedValue({ data: mockDashboardData });

      const { container } = renderWithProviders(<DashboardPage />);

      // Assert segmented control is NOT rendered
      expect(container.querySelector('.ant-segmented')).toBeNull();

      // Verify explicit Group By label and Select combobox
      expect(screen.getByText(/group by:/i)).toBeInTheDocument();
      const selectCombobox = screen.getByRole('combobox', { name: /group by/i });
      expect(selectCombobox).toBeInTheDocument();

      // Default selected option is Day
      expect(screen.getByText('Day')).toBeInTheDocument();

      // Verify date range placeholders
      expect(screen.getByPlaceholderText('From')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('To')).toBeInTheDocument();
    });

    it('updates API query parameters when selecting Month from dropdown', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: mockDashboardData });

      renderWithProviders(<DashboardPage />);

      const selectCombobox = screen.getByRole('combobox', { name: /group by/i });
      fireEvent.mouseDown(selectCombobox);

      const monthOption = document.querySelector('.ant-select-item-option[title="Month"]');
      expect(monthOption).toBeInTheDocument();
      fireEvent.click(monthOption);

      expect(getSpy).toHaveBeenCalledWith(
        '/admin/dashboard',
        expect.objectContaining({
          params: expect.objectContaining({
            groupBy: 'month',
          }),
        })
      );
    });

    it('updates API query parameters when selecting Year from dropdown', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: mockDashboardData });

      renderWithProviders(<DashboardPage />);

      const selectCombobox = screen.getByRole('combobox', { name: /group by/i });
      fireEvent.mouseDown(selectCombobox);

      const yearOption = document.querySelector('.ant-select-item-option[title="Year"]');
      expect(yearOption).toBeInTheDocument();
      fireEvent.click(yearOption);

      expect(getSpy).toHaveBeenCalledWith(
        '/admin/dashboard',
        expect.objectContaining({
          params: expect.objectContaining({
            groupBy: 'year',
          }),
        })
      );
    });
  });

  describe('7. Job Postings & Candidate Registrations Analytics Graphs', () => {
    const mockConnectedDashboardData = {
      success: true,
      dateRange: {
        from: '2026-09-14T00:00:00.000Z',
        to: '2026-10-14T23:59:59.999Z',
        groupBy: 'day',
      },
      kpis: {
        activeJobs: { count: 12, connected: true, label: 'Active Jobs' },
        inactiveJobs: { count: 3, connected: true, label: 'Inactive Jobs' },
        totalCompanies: { count: null, connected: false, label: 'Total Employers' },
        totalCandidates: { count: 45, connected: true, label: 'Total Candidates' },
        totalAdmins: { count: 1, connected: true, label: 'Total Administrators' },
        activeAdmins: { count: 1, connected: true, label: 'Active Accounts' },
        mfaAdoption: { count: 1, percentage: 100, connected: true, label: 'MFA Adoption Rate' },
        totalAuditEvents: { count: 35, connected: true, label: 'Security Audit Events' },
      },
      charts: {
        auditActivity: {
          connected: true,
          label: 'Security & Audit Events',
          groupBy: 'day',
          series: [{ bucket: '2026-10-14T00:00:00.000Z', count: 5 }],
        },
        jobPostings: {
          connected: true,
          label: 'Job Postings',
          groupBy: 'day',
          series: [
            { bucket: '2026-10-10T00:00:00.000Z', count: 4 },
            { bucket: '2026-10-12T00:00:00.000Z', count: 8 },
          ],
          total: 15,
          active: 12,
          inactive: 3,
          counts: { PUBLISHED: 12, DRAFT: 2, PENDING_APPROVAL: 1 },
        },
        candidateRegistrations: {
          connected: true,
          label: 'Candidate Registrations',
          groupBy: 'day',
          series: [
            { bucket: '2026-10-08T00:00:00.000Z', count: 15 },
            { bucket: '2026-10-11T00:00:00.000Z', count: 30 },
          ],
          total: 45,
          active: 38,
          pending: 5,
          inactive: 2,
          counts: { ACTIVE: 38, PENDING_APPROVAL: 5, INACTIVE: 2 },
        },
        employerRegistrations: { connected: false, series: [] },
      },
      recentNotifications: {
        connected: false,
        items: [],
        unreadCount: 0,
      },
      recentActivity: [],
    };

    it('renders Job Postings tab, switches to it, and renders job analytics metrics summary and chart', async () => {
      vi.spyOn(api, 'get').mockImplementation(async (url) => {
        if (url.includes('/admin/dashboard')) {
          return { data: mockConnectedDashboardData };
        }
        return { data: { items: [], counts: {}, pagination: { total: 0 } } };
      });

      renderWithProviders(<DashboardPage />);

      const jobTabs = screen.getAllByText('Job Postings');
      expect(jobTabs.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(jobTabs[0]);

      await waitFor(() => {
        expect(screen.getByText('Job Postings Trend & Volume')).toBeInTheDocument();
        expect(screen.getByText('Total Jobs:')).toBeInTheDocument();
      });

      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('Published:')).toBeInTheDocument();
      expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(1);
    });

    it('renders Candidate Registrations tab, switches to it, and renders candidate analytics metrics summary and chart', async () => {
      vi.spyOn(api, 'get').mockImplementation(async (url) => {
        if (url.includes('/admin/dashboard')) {
          return { data: mockConnectedDashboardData };
        }
        return { data: { items: [], counts: {}, pagination: { total: 0 } } };
      });

      renderWithProviders(<DashboardPage />);

      const candTabs = screen.getAllByText('Candidate Registrations');
      expect(candTabs.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(candTabs[0]);

      await waitFor(() => {
        expect(screen.getByText('Candidate Registrations Trend')).toBeInTheDocument();
        expect(screen.getByText('Total Candidates:')).toBeInTheDocument();
      });

      expect(screen.getAllByText('45').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Active:')).toBeInTheDocument();
      expect(screen.getByText('38')).toBeInTheDocument();
    });

    it('renders empty state message when series data is empty', async () => {
      const mockEmptyData = {
        ...mockConnectedDashboardData,
        charts: {
          ...mockConnectedDashboardData.charts,
          jobPostings: {
            ...mockConnectedDashboardData.charts.jobPostings,
            series: [],
            total: 0,
            counts: {},
          },
        },
      };

      vi.spyOn(api, 'get').mockImplementation(async (url) => {
        if (url.includes('/admin/dashboard')) {
          return { data: mockEmptyData };
        }
        return { data: { items: [], counts: {}, pagination: { total: 0 } } };
      });

      renderWithProviders(<DashboardPage />);

      const jobTabs = screen.getAllByText('Job Postings');
      fireEvent.click(jobTabs[0]);

      await waitFor(() => {
        expect(screen.getByText('No activity recorded in the selected date range.')).toBeInTheDocument();
      });
    });
  });
});
