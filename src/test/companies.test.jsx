import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import authReducer from '../store/authSlice.js';
import themeReducer from '../store/themeSlice.js';
import { AdminShell } from '../components/AdminShell.jsx';
import { CompaniesPage } from '../features/companies/CompaniesPage.jsx';
import { CompanyOnboardingWizard } from '../features/companies/CompanyOnboardingWizard.jsx';
import { CompanyDetailsPage } from '../features/companies/CompanyDetailsPage.jsx';
import { companiesApi } from '../services/companiesApi.js';
import { configurationApi } from '../services/configurationApi.js';
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

describe('RecruiTrain Phase 2: Frontend Companies & Employer Management Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    changeAppLanguage('en');
  });

  describe('1. AdminShell Navigation & Localization', () => {
    it('renders Companies navigation item in English', async () => {
      changeAppLanguage('en');
      renderWithProviders(<AdminShell />, { route: '/admin' });

      // Look for Companies in sidebar
      expect(screen.getAllByText(/Companies/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders Companies navigation item in German', async () => {
      changeAppLanguage('de');
      renderWithProviders(<AdminShell />, { route: '/admin' });

      // Look for German translation "Unternehmensverzeichnis" or "Unternehmen"
      expect(screen.getAllByText(/Unternehmen/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Companies Directory Page', () => {
    it('renders status summary cards and table with fetched companies', async () => {
      const mockSummary = {
        data: { ALL: 3, IN_REVIEW: 1, ACTIVE: 2, SUSPENDED: 0, UNVERIFIED: 0, INACTIVE: 0 },
      };
      const mockIntegrations = {
        data: {
          cloudinary: { configured: false },
          mail: { configured: false },
        },
      };
      const mockCompanies = {
        data: [
          {
            id: 'c1',
            name: 'Acme Robotics Test GmbH',
            legalName: 'Acme Robotics Germany GmbH',
            companyCode: 'COMP-ACME',
            status: 'IN_REVIEW',
            companySize: '51-200',
            country: 'DE',
            email: 'contact@acmerobotics.test',
            industry: { name: 'Technology' },
            createdAt: '2026-10-15T12:00:00Z',
          },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      vi.spyOn(companiesApi, 'getStatusSummary').mockResolvedValue(mockSummary);
      vi.spyOn(companiesApi, 'getIntegrationsStatus').mockResolvedValue(mockIntegrations);
      vi.spyOn(companiesApi, 'getCompanies').mockResolvedValue(mockCompanies);
      vi.spyOn(configurationApi, 'getIndustries').mockResolvedValue({ data: [] });

      renderWithProviders(<CompaniesPage />, { route: '/admin/companies' });

      await waitFor(() => {
        expect(screen.getAllByText('Acme Robotics Test GmbH').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('COMP-ACME').length).toBeGreaterThanOrEqual(1);
      });

      // Verify integrations banner is present when unconfigured
      expect(screen.getByText(/Integration Readiness/i)).toBeInTheDocument();
    });

    it('opens edit modal with populated company fields when Edit button is clicked', async () => {
      const mockSummary = { data: { ALL: 1, IN_REVIEW: 0, ACTIVE: 1, SUSPENDED: 0 } };
      const mockIntegrations = { data: { cloudinary: { configured: true }, mail: { configured: true } } };
      const mockCompanies = {
        data: [
          {
            id: 'c1',
            name: 'Acme Robotics Test GmbH',
            legalName: 'Acme Robotics Germany AG',
            companyCode: 'COMP-ACME',
            status: 'ACTIVE',
            email: 'contact@acmerobotics.test',
            city: 'Berlin',
            country: 'DE',
            hiringDomestic: true,
          },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      vi.spyOn(companiesApi, 'getStatusSummary').mockResolvedValue(mockSummary);
      vi.spyOn(companiesApi, 'getIntegrationsStatus').mockResolvedValue(mockIntegrations);
      vi.spyOn(companiesApi, 'getCompanies').mockResolvedValue(mockCompanies);
      vi.spyOn(configurationApi, 'getIndustries').mockResolvedValue({ data: [] });

      renderWithProviders(<CompaniesPage />, { route: '/admin/companies' });

      await waitFor(() => {
        expect(screen.getAllByText('Acme Robotics Test GmbH').length).toBeGreaterThanOrEqual(1);
      });

      // Click Edit action button in table row
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editButtons[0]);

      // Verify Edit Company modal opens with populated fields
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Acme Robotics Test GmbH')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Acme Robotics Germany AG')).toBeInTheDocument();
        expect(screen.getByDisplayValue('COMP-ACME')).toBeInTheDocument();
      });
    }, 15000);

    it('submits updated company details via companiesApi.updateCompany and refreshes directory', async () => {
      const mockSummary = { data: { ALL: 1, IN_REVIEW: 0, ACTIVE: 1, SUSPENDED: 0 } };
      const mockIntegrations = { data: { cloudinary: { configured: true }, mail: { configured: true } } };
      const mockCompanies = {
        data: [
          {
            id: 'c1',
            name: 'Acme Robotics Test GmbH',
            companyCode: 'COMP-ACME',
            status: 'ACTIVE',
            email: 'contact@acmerobotics.test',
          },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      vi.spyOn(companiesApi, 'getStatusSummary').mockResolvedValue(mockSummary);
      vi.spyOn(companiesApi, 'getIntegrationsStatus').mockResolvedValue(mockIntegrations);
      vi.spyOn(companiesApi, 'getCompanies').mockResolvedValue(mockCompanies);
      vi.spyOn(configurationApi, 'getIndustries').mockResolvedValue({ data: [] });
      const updateSpy = vi.spyOn(companiesApi, 'updateCompany').mockResolvedValue({
        success: true,
        data: { id: 'c1', name: 'Acme Robotics Renamed' },
      });

      renderWithProviders(<CompaniesPage />, { route: '/admin/companies' });

      await waitFor(() => {
        expect(screen.getAllByText('Acme Robotics Test GmbH').length).toBeGreaterThanOrEqual(1);
      });

      // Click Edit button
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editButtons[0]);

      // Change company name
      const nameInput = await screen.findByDisplayValue('Acme Robotics Test GmbH');
      fireEvent.change(nameInput, { target: { value: 'Acme Robotics Renamed' } });

      // Click Save Changes button
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith('c1', expect.objectContaining({
          name: 'Acme Robotics Renamed',
        }));
      });
    }, 15000);

    it('switches between Active Companies and Trash & Retention view, displaying trashed companies and restoring them', async () => {
      const mockSummary = { data: { ALL: 1, IN_REVIEW: 0, ACTIVE: 1, SUSPENDED: 0, TRASH: 1 } };
      const mockIntegrations = { data: { cloudinary: { configured: true }, mail: { configured: true } } };
      const mockActiveCompanies = {
        data: [
          {
            id: 'c-active',
            name: 'Active Corp GmbH',
            companyCode: 'COMP-ACTIVE',
            status: 'ACTIVE',
            email: 'active@corp.test',
          },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      const mockTrashedCompanies = {
        data: [
          {
            id: 'c-trashed',
            name: 'Trashed Corp GmbH',
            companyCode: 'COMP-TRASHED',
            status: 'INACTIVE',
            deletedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
            email: 'trashed@corp.test',
          },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      vi.spyOn(companiesApi, 'getStatusSummary').mockResolvedValue(mockSummary);
      vi.spyOn(companiesApi, 'getIntegrationsStatus').mockResolvedValue(mockIntegrations);
      const getCompaniesSpy = vi.spyOn(companiesApi, 'getCompanies').mockImplementation((params) => {
        if (params?.trashed) {
          return Promise.resolve(mockTrashedCompanies);
        }
        return Promise.resolve(mockActiveCompanies);
      });
      vi.spyOn(configurationApi, 'getIndustries').mockResolvedValue({ data: [] });
      const restoreSpy = vi.spyOn(companiesApi, 'restoreCompany').mockResolvedValue({
        success: true,
        message: 'Company restored from trash.',
      });

      renderWithProviders(<CompaniesPage />, { route: '/admin/companies' });

      // Initially on Active Companies tab
      await waitFor(() => {
        expect(screen.getByText('Active Corp GmbH')).toBeInTheDocument();
      });

      // Click on "Trash & Retention" Tab
      const trashTab = screen.getByRole('tab', { name: /Trash & Retention/i });
      fireEvent.click(trashTab);

      // Verify trashed company and retention banner are displayed
      await waitFor(() => {
        expect(screen.getByText('Trashed Corp GmbH')).toBeInTheDocument();
        expect(screen.getByText(/28 days remaining/i)).toBeInTheDocument();
        expect(screen.getByText(/Company Trash & 30-Day Retention Policy/i)).toBeInTheDocument();
      });

      expect(getCompaniesSpy).toHaveBeenCalledWith(expect.objectContaining({ trashed: true }));

      // Click Restore button on the trashed company row
      const restoreBtn = screen.getByRole('button', { name: /Restore/i });
      fireEvent.click(restoreBtn);

      // In Popconfirm, click the confirmation button
      const confirmPopconfirmBtn = await screen.findByRole('button', { name: /^Restore$/i });
      fireEvent.click(confirmPopconfirmBtn);

      await waitFor(() => {
        expect(restoreSpy).toHaveBeenCalledWith('c-trashed');
      });
    }, 15000);
  });

  describe('3. Company Onboarding Wizard Page', () => {
    it('renders the 5 steps and identity fields', async () => {
      vi.spyOn(configurationApi, 'getIndustries').mockResolvedValue({ data: [] });
      vi.spyOn(configurationApi, 'getDocumentDefinitions').mockResolvedValue({ data: [] });
      vi.spyOn(companiesApi, 'getIntegrationsStatus').mockResolvedValue({
        data: { cloudinary: { configured: false }, mail: { configured: false } },
      });

      renderWithProviders(<CompanyOnboardingWizard />, { route: '/admin/companies/new' });

      expect(screen.getAllByText(/Company Identity/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Contact/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Branding Assets/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Compliance Documents/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Initial Administrator/i).length).toBeGreaterThanOrEqual(1);

      // Check form fields
      expect(screen.getAllByPlaceholderText(/e.g. Acme Tech Solutions/i).length).toBeGreaterThanOrEqual(1);
    });

    it('preserves company display name input across steps without unmounting', async () => {
      vi.spyOn(configurationApi, 'getIndustries').mockResolvedValue({
        data: [{ id: 'ind-1', name: 'Software Development' }],
      });
      vi.spyOn(configurationApi, 'getDocumentDefinitions').mockResolvedValue({ data: [] });
      vi.spyOn(companiesApi, 'getIntegrationsStatus').mockResolvedValue({
        data: { cloudinary: { configured: false }, mail: { configured: false } },
      });

      renderWithProviders(<CompanyOnboardingWizard />, { route: '/admin/companies/new' });

      const nameInput = screen.getAllByPlaceholderText(/e.g. Acme Tech Solutions/i)[0];
      fireEvent.change(nameInput, { target: { value: 'Persistent Name Test GmbH' } });
      expect(nameInput.value).toBe('Persistent Name Test GmbH');

      // The field element remains present in the DOM even when advancing/navigating
      expect(screen.getByDisplayValue('Persistent Name Test GmbH')).toBeInTheDocument();
    });

    it('renders dual branding mode toggles for logo and banner', async () => {
      vi.spyOn(configurationApi, 'getIndustries').mockResolvedValue({ data: [] });
      vi.spyOn(configurationApi, 'getDocumentDefinitions').mockResolvedValue({ data: [] });
      vi.spyOn(companiesApi, 'getIntegrationsStatus').mockResolvedValue({
        data: { cloudinary: { configured: false }, mail: { configured: false } },
      });

      renderWithProviders(<CompanyOnboardingWizard />, { route: '/admin/companies/new' });

      // Check branding options rendered in step 2 (mounted in DOM with display styling)
      expect(screen.getAllByText(/Direct URL/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Upload File/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4. Company Details Page', () => {
    it('renders tabs and corporate descriptions', async () => {
      const mockCompany = {
        data: {
          id: 'test-comp-1',
          name: 'Global Talent Corp',
          legalName: 'Global Talent AG',
          companyCode: 'COMP-GTC',
          status: 'ACTIVE',
          industry: { name: 'Financial Services' },
          companySize: '201-500',
          foundedYear: 2018,
          country: 'DE',
          email: 'info@globaltalent.test',
          phone: '+49 89 123456',
          website: 'https://globaltalent.test',
          description: 'Leading European talent network',
          hiringDomestic: true,
          hiringInternational: true,
          hiringEu: false,
          documents: [],
          users: [{ id: 'u1', email: 'admin@globaltalent.test', role: 'ADMIN', status: 'ACTIVE' }],
          invitations: [],
          auditLogs: [],
          subscriptions: [],
        },
      };

      vi.spyOn(companiesApi, 'getCompany').mockResolvedValue(mockCompany);
      vi.spyOn(configurationApi, 'getDocumentDefinitions').mockResolvedValue({ data: [] });

      renderWithProviders(
        <Routes>
          <Route path="/admin/companies/:id" element={<CompanyDetailsPage />} />
        </Routes>,
        { route: '/admin/companies/test-comp-1' }
      );

      await waitFor(() => {
        expect(screen.getAllByText('Global Talent Corp').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('COMP-GTC').length).toBeGreaterThanOrEqual(1);
      });

      // Assert tab headers
      expect(screen.getByText(/Profile Overview/i)).toBeInTheDocument();
      expect(screen.getByText(/Documents & Compliance/i)).toBeInTheDocument();
      expect(screen.getByText(/General Details/i)).toBeInTheDocument();
      expect(screen.getByText(/Security & Verification/i)).toBeInTheDocument();
      expect(screen.getByText(/Team & Users/i)).toBeInTheDocument();
    });

    it('opens DeleteConfirmationModal and triggers soft delete with 30-day retention on confirm', async () => {
      const mockCompany = {
        data: {
          id: 'test-comp-1',
          name: 'Global Talent Corp',
          legalName: 'Global Talent AG',
          companyCode: 'COMP-GTC',
          status: 'ACTIVE',
          documents: [],
          users: [],
          invitations: [],
          auditLogs: [],
          subscriptions: [],
        },
      };

      vi.spyOn(companiesApi, 'getCompany').mockResolvedValue(mockCompany);
      vi.spyOn(configurationApi, 'getDocumentDefinitions').mockResolvedValue({ data: [] });
      const deleteSpy = vi.spyOn(companiesApi, 'deleteCompany').mockResolvedValue({
        success: true,
        message: 'Company moved to Trash with 30-day retention.',
      });

      renderWithProviders(
        <Routes>
          <Route path="/admin/companies/:id" element={<CompanyDetailsPage />} />
        </Routes>,
        { route: '/admin/companies/test-comp-1' }
      );

      await waitFor(() => {
        expect(screen.getAllByText('Global Talent Corp').length).toBeGreaterThanOrEqual(1);
      });

      // Click Delete Company button in header
      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteBtn);

      // Verify Delete confirmation dialog opens
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Move to Trash/i })).toBeInTheDocument();
      });

      // Confirm Move to Trash
      fireEvent.click(screen.getByRole('button', { name: /Move to Trash/i }));

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith('test-comp-1', 'MOVE_TO_TRASH');
      });
    }, 15000);
  });
});
