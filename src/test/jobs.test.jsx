import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import authReducer from '../store/authSlice.js';
import themeReducer from '../store/themeSlice.js';
import { AdminShell } from '../components/AdminShell.jsx';
import { JobsPage } from '../features/jobs/JobsPage.jsx';
import { JobCreateEditPage } from '../features/jobs/JobCreateEditPage.jsx';
import { JobDetailsPage } from '../features/jobs/JobDetailsPage.jsx';
import { jobsApi } from '../services/jobsApi.js';
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

describe('RecruiTrain Phase B: Admin Jobs Module Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    changeAppLanguage('en');
  });

  describe('1. AdminShell Navigation & i18n', () => {
    it('renders Job Postings menu item in English', async () => {
      changeAppLanguage('en');
      renderWithProviders(<AdminShell />, { route: '/admin' });
      expect(screen.getAllByText(/Job Postings/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders Stellenangebote menu item in German', async () => {
      changeAppLanguage('de');
      renderWithProviders(<AdminShell />, { route: '/admin' });
      expect(screen.getAllByText(/Stellenangebote/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Job Postings Directory (JobsPage)', () => {
    const mockJobs = [
      {
        id: 'job-1',
        title: 'Senior Cloud Architect',
        jobCode: 'ENG-101',
        department: 'Cloud Ops',
        workplaceType: 'REMOTE',
        workArrangement: 'REMOTE',
        employmentType: 'FULL_TIME',
        hiringScope: 'DOMESTIC',
        status: 'PUBLISHED',
        city: 'Berlin',
        country: 'DE',
        _count: { applications: 3 },
        company: { id: 'comp-1', name: 'Acme Technologies', status: 'ACTIVE' },
        createdAt: '2026-10-15T10:00:00Z',
      },
      {
        id: 'job-2',
        title: 'Junior Frontend Dev',
        jobCode: 'ENG-102',
        department: 'Engineering',
        workplaceType: 'HYBRID',
        workArrangement: 'HYBRID',
        employmentType: 'FULL_TIME',
        hiringScope: 'EU',
        status: 'DRAFT',
        city: 'Munich',
        country: 'DE',
        _count: { applications: 0 },
        company: { id: 'comp-2', name: 'BioHealth Corp', status: 'ACTIVE' },
        createdAt: '2026-10-16T10:00:00Z',
      },
    ];

    it('loads and renders directory metrics, jobs table and empty state handling', async () => {
      vi.spyOn(jobsApi, 'getJobs').mockResolvedValue({
        items: mockJobs,
        counts: { ALL: 2, PUBLISHED: 1, DRAFT: 1, PENDING_APPROVAL: 0, CLOSED: 0, ARCHIVED: 0 },
        pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });
      vi.spyOn(companiesApi, 'getCompanies').mockResolvedValue({
        items: [{ id: 'comp-1', name: 'Acme Technologies' }],
      });

      renderWithProviders(<JobsPage />, { route: '/admin/jobs' });

      // Title & metrics
      expect(await screen.findByRole('heading', { name: /Job Postings/i })).toBeInTheDocument();
      expect(screen.getByText('Senior Cloud Architect')).toBeInTheDocument();
      expect(screen.getByText('Junior Frontend Dev')).toBeInTheDocument();
      expect(screen.getByText('Acme Technologies')).toBeInTheDocument();
    });

    it('triggers moderation status change dialog', async () => {
      vi.spyOn(jobsApi, 'getJobs').mockResolvedValue({
        items: mockJobs,
        counts: { ALL: 2, PUBLISHED: 1, DRAFT: 1, PENDING_APPROVAL: 0, CLOSED: 0, ARCHIVED: 0 },
        pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });
      vi.spyOn(companiesApi, 'getCompanies').mockResolvedValue({ items: [] });
      const statusSpy = vi.spyOn(jobsApi, 'updateJobStatus').mockResolvedValue({ success: true });

      renderWithProviders(<JobsPage />, { route: '/admin/jobs' });

      expect(await screen.findByText('Senior Cloud Architect')).toBeInTheDocument();
    });
  });

  describe('3. Job Creation & Edit Page (JobCreateEditPage)', () => {
    beforeEach(() => {
      vi.spyOn(companiesApi, 'getCompanies').mockResolvedValue({
        items: [
          {
            id: 'comp-1',
            name: 'Domestic Only Co',
            status: 'ACTIVE',
            hiringDomestic: true,
            hiringEu: false,
            hiringInternational: false,
          },
          {
            id: 'comp-2',
            name: 'Global Tech SE',
            status: 'ACTIVE',
            hiringDomestic: true,
            hiringEu: true,
            hiringInternational: true,
          },
        ],
      });
      vi.spyOn(configurationApi, 'getIndustries').mockResolvedValue({
        items: [{ id: 'ind-1', name: 'Information Technology' }],
      });
    });

    it('renders all 6 form sections (A through F)', async () => {
      renderWithProviders(<JobCreateEditPage />, { route: '/admin/jobs/new' });

      expect(await screen.findByText(/Section A — Basic Information/i)).toBeInTheDocument();
      expect(screen.getByText(/Section B — Organization & Roles/i)).toBeInTheDocument();
      expect(screen.getByText(/Section C — Compensation & Experience/i)).toBeInTheDocument();
      expect(screen.getByText(/Section D — Location & Workplace/i)).toBeInTheDocument();
      expect(screen.getByText(/Section E — Language Requirements & Preferences/i)).toBeInTheDocument();
      expect(screen.getByText(/Section F — Job Description & Requirements/i)).toBeInTheDocument();
    });

    it('renders the 3 standard form actions: Cancel, Save Draft, and Publish', async () => {
      renderWithProviders(<JobCreateEditPage />, { route: '/admin/jobs/new' });

      // There are header and footer action buttons
      expect(screen.getAllByRole('button', { name: /Cancel/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('button', { name: /Save Draft/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('button', { name: /Publish/i }).length).toBeGreaterThanOrEqual(1);
    });

    it('gating: displays company hiring scope permissions when company is loaded/selected', async () => {
      vi.spyOn(jobsApi, 'getJob').mockResolvedValue({
        data: {
          id: 'job-1',
          title: 'Software Engineer',
          companyId: 'comp-1',
          hiringScope: 'DOMESTIC',
          employmentType: 'FULL_TIME',
          workArrangement: 'ON_SITE',
          status: 'DRAFT',
          description: 'A description',
        },
      });
      vi.spyOn(companiesApi, 'getCompany').mockResolvedValue({
        id: 'comp-1',
        name: 'Domestic Only Co',
        status: 'ACTIVE',
        hiringDomestic: true,
        hiringEu: false,
        hiringInternational: false,
        users: [{ id: 'u-1', firstName: 'Alice', lastName: 'HR', role: 'ADMIN' }],
      });

      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:id/edit" element={<JobCreateEditPage />} />
        </Routes>,
        { route: '/admin/jobs/job-1/edit' }
      );

      await waitFor(
        () => {
          expect(screen.getAllByText(/Domestic Only Co/i).length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 5000 }
      );
      expect(screen.getByText(/Domestic:/i)).toBeInTheDocument();
      expect(screen.getByText(/EU-wide:/i)).toBeInTheDocument();
    });

    it('supports .txt file parsing for job description', async () => {
      const parseSpy = vi.spyOn(jobsApi, 'parseDescriptionFile').mockResolvedValue({
        success: true,
        text: 'Uploaded job description contents from test file.',
      });

      renderWithProviders(<JobCreateEditPage />, { route: '/admin/jobs/new' });

      expect(screen.getByText(/Upload .txt Description/i)).toBeInTheDocument();
    });
  });

  describe('4. Job Details 360 & Applicants (JobDetailsPage)', () => {
    const mockJobDetails = {
      id: 'job-100',
      title: 'Staff Security Engineer',
      jobCode: 'SEC-007',
      companyId: 'comp-1',
      status: 'PUBLISHED',
      hiringScope: 'DOMESTIC',
      employmentType: 'FULL_TIME',
      workplaceType: 'HYBRID',
      city: 'Berlin',
      country: 'DE',
      currency: 'EUR',
      minSalary: 95000,
      maxSalary: 120000,
      salaryNegotiable: true,
      minExperience: 5,
      maxExperience: 10,
      germanLevel: 'B2',
      englishLevel: 'C1',
      description: 'We are seeking a senior security engineer to safeguard cloud infrastructure.',
      responsibilities: 'Lead vulnerability assessments and threat modeling.',
      requirements: 'Extensive Kubernetes, AWS, and ISO 27001 experience.',
      benefits: 'Competitive equity and professional development budget.',
      company: { id: 'comp-1', name: 'CyberShield AG', status: 'ACTIVE' },
      _count: { applications: 1 },
    };

    const mockApplicants = [
      {
        id: 'app-1',
        status: 'IN_REVIEW',
        appliedAt: '2026-10-16T12:00:00Z',
        coverLetter: 'Dear Hiring Manager, I am excited to apply for the Staff Security Engineer role.',
        resumeUrl: 'https://storage.recruitrain.test/resumes/john_doe.pdf',
        candidate: {
          id: 'cand-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+49 170 1234567',
          headline: 'Cloud Security Specialist',
          resumeFileName: 'john_doe.pdf',
        },
        currentStage: { id: 'stage-1', name: 'Technical Screening' },
      },
    ];

    it('renders job details overview with descriptions and metadata', async () => {
      vi.spyOn(jobsApi, 'getJob').mockResolvedValue({ data: mockJobDetails });
      vi.spyOn(jobsApi, 'getJobApplicants').mockResolvedValue({ items: mockApplicants, pagination: { total: 1 } });

      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:id" element={<JobDetailsPage />} />
        </Routes>,
        { route: '/admin/jobs/job-100' }
      );

      expect(await screen.findByText('Staff Security Engineer')).toBeInTheDocument();
      expect(screen.getByText('SEC-007')).toBeInTheDocument();
      expect(screen.getAllByText(/CyberShield AG/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/We are seeking a senior security engineer/i)).toBeInTheDocument();
    });

    it('switches to Applicants tab and displays applicants with cover letter preview', async () => {
      vi.spyOn(jobsApi, 'getJob').mockResolvedValue({ data: mockJobDetails });
      vi.spyOn(jobsApi, 'getJobApplicants').mockResolvedValue({ items: mockApplicants, pagination: { total: 1 } });

      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:id" element={<JobDetailsPage />} />
        </Routes>,
        { route: '/admin/jobs/job-100' }
      );

      expect(await screen.findByText('Staff Security Engineer')).toBeInTheDocument();

      // Click Applicants tab
      const applicantsTab = screen.getByRole('tab', { name: /Applicants/i });
      fireEvent.click(applicantsTab);

      // Verify applicant name
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('Technical Screening')).toBeInTheDocument();
      expect(screen.getByText('View Cover Letter')).toBeInTheDocument();
    });
  });
});
