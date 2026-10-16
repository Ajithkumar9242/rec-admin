import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../store/authSlice.js';
import themeReducer from '../store/themeSlice.js';
import { IndustriesPage } from '../features/configuration/IndustriesPage.jsx';
import { CompanyDocumentsPage } from '../features/configuration/CompanyDocumentsPage.jsx';
import { CandidateDocumentsPage } from '../features/configuration/CandidateDocumentsPage.jsx';
import { RecruitmentStagesPage } from '../features/configuration/RecruitmentStagesPage.jsx';
import { CandidateSettingsPage } from '../features/configuration/CandidateSettingsPage.jsx';
import { EmployerVisibilityPage } from '../features/configuration/EmployerVisibilityPage.jsx';
import { JobSettingsPage } from '../features/configuration/JobSettingsPage.jsx';
import { AdminShell } from '../components/AdminShell.jsx';
import { configurationApi } from '../services/configurationApi.js';
import '../i18n/index.js';
import { changeAppLanguage } from '../i18n/index.js';

function renderWithProviders(ui, { initialState = {}, route = '/admin/configuration/industries' } = {}) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      theme: themeReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: { name: 'Config Admin Tester', email: 'config_tester@recruitrain.test', role: 'SUPER_ADMIN' },
        ...initialState.auth,
      },
      theme: { isDarkMode: false, ...initialState.theme },
    },
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

describe('RecruiTrain Phase 1: Platform Configuration Frontend Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    changeAppLanguage('en');
  });

  // ==========================================
  // 1. Industries & Sectors Management
  // ==========================================
  describe('1. Industries & Sectors Management', () => {
    it('renders industries table with name, code, parent industry, and status', async () => {
      vi.spyOn(configurationApi, 'getIndustries').mockImplementation((params) => {
        if (params?.hierarchy === 'true') {
          return Promise.resolve({
            success: true,
            data: [
              {
                id: 'ind-1',
                name: 'Information Technology',
                code: 'IT',
                parentId: null,
                status: 'ACTIVE',
                children: [
                  { id: 'ind-2', name: 'Cybersecurity', code: 'CYBER', parentId: 'ind-1', status: 'ACTIVE' },
                ],
              },
            ],
          });
        }
        return Promise.resolve({
          success: true,
          data: [
            {
              id: 'ind-1',
              name: 'Information Technology',
              code: 'IT',
              parentId: null,
              status: 'ACTIVE',
              _count: { children: 1 },
            },
          ],
        });
      });

      renderWithProviders(<IndustriesPage />);

      expect(await screen.findByText('Information Technology')).toBeInTheDocument();
      expect(screen.getByText('IT')).toBeInTheDocument();
      expect(screen.getByText('None (Root Level Industry)')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('toggles to hierarchy view and opens create modal', async () => {
      vi.spyOn(configurationApi, 'getIndustries').mockResolvedValue({
        success: true,
        data: [],
      });

      renderWithProviders(<IndustriesPage />);

      const hierBtn = await screen.findByRole('button', { name: /hierarchy view/i });
      fireEvent.click(hierBtn);
      expect(screen.getByRole('button', { name: /table view/i })).toBeInTheDocument();

      const createBtn = screen.getByRole('button', { name: /new industry/i });
      fireEvent.click(createBtn);
      expect(screen.getByText('Create Industry / Sector')).toBeInTheDocument();
    });
  });

  // ==========================================
  // 2. Company & Candidate Document Definitions
  // ==========================================
  describe('2. Document Definitions Management', () => {
    it('renders company document definitions with required badges and size limits', async () => {
      vi.spyOn(configurationApi, 'getDocumentDefinitions').mockResolvedValue({
        success: true,
        data: [
          {
            id: 'doc-1',
            targetType: 'COMPANY',
            name: 'Commercial Register Extract',
            code: 'HANDELSREGISTER',
            isRequired: true,
            acceptedFileTypes: ['.pdf', 'application/pdf'],
            maxFileSizeMb: 15,
            status: 'ACTIVE',
          },
        ],
      });

      renderWithProviders(<CompanyDocumentsPage />);

      expect(await screen.findByText('Commercial Register Extract')).toBeInTheDocument();
      expect(screen.getByText('HANDELSREGISTER')).toBeInTheDocument();
      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(screen.getByText('15 MB')).toBeInTheDocument();
      expect(screen.getByText('.pdf')).toBeInTheDocument();
    });

    it('renders candidate document definitions component', async () => {
      vi.spyOn(configurationApi, 'getDocumentDefinitions').mockResolvedValue({
        success: true,
        data: [
          {
            id: 'cand-doc-1',
            targetType: 'CANDIDATE',
            name: 'Resume / Curriculum Vitae',
            code: 'CV',
            isRequired: false,
            acceptedFileTypes: ['.pdf', '.docx'],
            maxFileSizeMb: 10,
            status: 'ACTIVE',
          },
        ],
      });

      renderWithProviders(<CandidateDocumentsPage />);

      expect(await screen.findByText('Resume / Curriculum Vitae')).toBeInTheDocument();
      expect(screen.getByText('Optional')).toBeInTheDocument();
    });
  });

  // ==========================================
  // 3. Dynamic Recruitment Stages
  // ==========================================
  describe('3. Dynamic Recruitment Stages', () => {
    it('renders stages with order badges, category tags and reorder action buttons', async () => {
      vi.spyOn(configurationApi, 'getRecruitmentStages').mockResolvedValue({
        success: true,
        data: [
          {
            id: 'stage-1',
            name: 'Initial Screening',
            category: 'SCREENING',
            order: 0,
            status: 'ACTIVE',
            isSystem: false,
          },
          {
            id: 'stage-2',
            name: 'Technical Challenge',
            category: 'INTERVIEW',
            order: 1,
            status: 'ACTIVE',
            isSystem: false,
          },
        ],
      });

      renderWithProviders(<RecruitmentStagesPage />);

      expect(await screen.findByText('Initial Screening')).toBeInTheDocument();
      expect(screen.getByText('Technical Challenge')).toBeInTheDocument();
      expect(screen.getByText('SCREENING')).toBeInTheDocument();
      expect(screen.getByText('INTERVIEW')).toBeInTheDocument();
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
    });
  });

  // ==========================================
  // 4. Candidate Settings
  // ==========================================
  describe('4. Candidate Settings Component', () => {
    it('renders candidate settings form and displays Super Admin restriction alert when role is ADMIN', async () => {
      vi.spyOn(configurationApi, 'getPlatformSettings').mockResolvedValue({
        success: true,
        data: {
          acceptedResumeFileTypes: ['.pdf', '.docx'],
          autoApproveCandidateProfiles: false,
          showEmployerContactDetails: false,
        },
      });

      renderWithProviders(<CandidateSettingsPage />, {
        initialState: {
          auth: {
            user: { name: 'Regular Admin', role: 'ADMIN' },
          },
        },
      });

      expect(await screen.findByText('Candidate Settings')).toBeInTheDocument();
      expect(
        screen.getByText(/Global platform configurations are strictly restricted to Super Administrators/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save candidate settings/i })).toBeDisabled();
    });

    it('enables save button for Super Administrators', async () => {
      vi.spyOn(configurationApi, 'getPlatformSettings').mockResolvedValue({
        success: true,
        data: {
          acceptedResumeFileTypes: ['.pdf'],
          autoApproveCandidateProfiles: true,
          showEmployerContactDetails: true,
        },
      });

      renderWithProviders(<CandidateSettingsPage />);

      const saveBtn = await screen.findByRole('button', { name: /save candidate settings/i });
      expect(saveBtn).not.toBeDisabled();
    });
  });

  // ==========================================
  // 5. Employer Visibility Settings
  // ==========================================
  describe('5. Employer Visibility Component', () => {
    it('renders employer visibility toggles and active backend privacy notice', async () => {
      vi.spyOn(configurationApi, 'getPlatformSettings').mockResolvedValue({
        success: true,
        data: {
          showCandidateResumes: true,
          showCandidateFullName: true,
          showCandidateEmail: false,
          showCandidatePhone: false,
        },
      });

      renderWithProviders(<EmployerVisibilityPage />);

      expect(await screen.findByText('Employer Visibility Settings')).toBeInTheDocument();
      expect(screen.getByText(/Backend Enforcement Active/i)).toBeInTheDocument();
      expect(screen.getByText('Show Candidate Resumes to Employers')).toBeInTheDocument();
      expect(screen.getByText('Show Candidate Full Name')).toBeInTheDocument();
      expect(screen.getByText('Show Candidate Email')).toBeInTheDocument();
      expect(screen.getByText('Show Candidate Phone Number')).toBeInTheDocument();
    });
  });

  // ==========================================
  // 6. Job Settings
  // ==========================================
  describe('6. Job Settings Component', () => {
    it('renders automatic job approval switch and workflow notice', async () => {
      vi.spyOn(configurationApi, 'getPlatformSettings').mockResolvedValue({
        success: true,
        data: {
          autoApproveJobs: false,
        },
      });

      renderWithProviders(<JobSettingsPage />);

      expect(await screen.findByText('Job Settings')).toBeInTheDocument();
      expect(screen.getByText(/When automatic job approval is disabled/i)).toBeInTheDocument();
      expect(screen.getByText('Automatic Job Approval')).toBeInTheDocument();
    });
  });

  // ==========================================
  // 7. Navigation & Localization
  // ==========================================
  describe('7. Navigation & Localization', () => {
    it('renders Platform Configuration sidebar group and children in English and German', async () => {
      const { unmount } = renderWithProviders(<AdminShell />);

      expect(screen.getByText('Platform Configuration')).toBeInTheDocument();

      // Open submenu to verify children
      fireEvent.click(screen.getByText('Platform Configuration'));

      expect(screen.getByText('Industries & Sectors')).toBeInTheDocument();
      expect(screen.getByText('Company Documents')).toBeInTheDocument();
      expect(screen.getByText('Candidate Documents')).toBeInTheDocument();
      expect(screen.getByText('Recruitment Stages')).toBeInTheDocument();
      expect(screen.getByText('Candidate Settings')).toBeInTheDocument();
      expect(screen.getByText('Employer Visibility')).toBeInTheDocument();
      expect(screen.getByText('Job Settings')).toBeInTheDocument();

      unmount();

      // Switch language to German
      changeAppLanguage('de');
      renderWithProviders(<AdminShell />);

      expect(screen.getByText('Plattformkonfiguration')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Plattformkonfiguration'));

      expect(screen.getByText('Branchen & Sektoren')).toBeInTheDocument();
      expect(screen.getByText('Unternehmensdokumente')).toBeInTheDocument();
      expect(screen.getByText('Kandidatendokumente')).toBeInTheDocument();
      expect(screen.getByText('Rekrutierungsphasen')).toBeInTheDocument();
      expect(screen.getByText('Kandidateneinstellungen')).toBeInTheDocument();
      expect(screen.getByText('Arbeitgebersichtbarkeit')).toBeInTheDocument();
      expect(screen.getByText('Stelleneinstellungen')).toBeInTheDocument();
    });
  });
});
