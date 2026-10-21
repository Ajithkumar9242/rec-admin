import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import authReducer from '../store/authSlice.js';
import themeReducer from '../store/themeSlice.js';
import { AdminShell } from '../components/AdminShell.jsx';
import { PipelinePage } from '../features/pipeline/PipelinePage.jsx';
import { jobsApi } from '../services/jobsApi.js';
import { configurationApi } from '../services/configurationApi.js';
import { App as AntdApp } from 'antd';
import '../i18n/index.js';
import { changeAppLanguage } from '../i18n/index.js';

function renderWithProviders(ui, { initialState = {}, route = '/admin/pipeline' } = {}) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      theme: themeReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: { name: 'Admin Tester', email: 'admin@recruitrain.test', role: 'SUPER_ADMIN' },
        permissions: {
          APPLICATIONS: { READ: true, EDIT: true, CREATE: true, DELETE: true },
          JOBS: { READ: true, EDIT: true, CREATE: true },
          COMPANIES: { READ: true },
        },
        permissionsLoaded: true,
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

describe('RecruTrain Phase 2: Hiring Pipeline Frontend Test Suite', () => {
  const mockJob1 = {
    id: 'job-pipeline-1',
    title: 'Senior Frontend Engineer',
    jobCode: 'FE-201',
    status: 'PUBLISHED',
    companyId: 'comp-1',
    company: { id: 'comp-1', name: 'TechCorp Global' },
  };

  const mockJob2 = {
    id: 'job-pipeline-2',
    title: 'Lead DevOps Specialist',
    jobCode: 'OPS-302',
    status: 'PUBLISHED',
    companyId: 'comp-2',
    company: { id: 'comp-2', name: 'CloudScale Inc' },
  };

  const mockStagesJob1 = [
    {
      id: 'stage-1',
      name: 'Applied',
      category: 'APPLIED',
      order: 1,
      totalApplicants: 1,
      applications: [
        {
          id: 'app-1',
          jobId: 'job-pipeline-1',
          candidateId: 'cand-1',
          currentStageId: 'stage-1',
          status: 'SUBMITTED',
          appliedAt: '2026-10-18T10:00:00.000Z',
          resumeUrl: 'https://example.com/resumes/alice.pdf',
          candidate: {
            id: 'cand-1',
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'alice@example.com',
            headline: 'Senior React Developer',
            currentTitle: 'Lead UI Engineer',
            currentCompany: 'InnovateX',
            yearsOfExperience: 6,
            location: 'Berlin, Germany',
            resumeUrl: 'https://example.com/resumes/alice.pdf',
          },
          currentStage: { id: 'stage-1', name: 'Applied', category: 'APPLIED', order: 1 },
          stageHistories: [
            {
              id: 'hist-1',
              previousStageId: null,
              destinationStageId: 'stage-1',
              notes: 'Initial application submitted',
              rejectionReason: null,
              createdAt: '2026-10-18T10:00:00.000Z',
              actor: { id: 'admin-1', name: 'System', email: 'system@recruitrain.test' },
            },
          ],
        },
      ],
    },
    {
      id: 'stage-2',
      name: 'Technical Interview',
      category: 'INTERVIEW',
      order: 2,
      totalApplicants: 1,
      applications: [
        {
          id: 'app-2',
          jobId: 'job-pipeline-1',
          candidateId: 'cand-2',
          currentStageId: 'stage-2',
          status: 'INTERVIEW',
          appliedAt: '2026-10-15T10:00:00.000Z',
          candidate: {
            id: 'cand-2',
            firstName: 'Bob',
            lastName: 'Jones',
            email: 'bob@example.com',
            headline: 'Fullstack TypeScript Specialist',
            currentTitle: 'Senior Software Engineer',
            yearsOfExperience: 8,
            location: 'Munich, Germany',
          },
          currentStage: { id: 'stage-2', name: 'Technical Interview', category: 'INTERVIEW', order: 2 },
          stageHistories: [],
        },
      ],
    },
    {
      id: 'stage-3',
      name: 'Hired',
      category: 'HIRED',
      order: 3,
      totalApplicants: 1,
      applications: [
        {
          id: 'app-3',
          jobId: 'job-pipeline-1',
          candidateId: 'cand-3',
          currentStageId: 'stage-3',
          status: 'HIRED',
          appliedAt: '2026-10-10T10:00:00.000Z',
          candidate: {
            id: 'cand-3',
            firstName: 'Charlie',
            lastName: 'Brown',
            email: 'charlie@example.com',
            headline: 'Cloud Engineer',
            yearsOfExperience: 5,
          },
          currentStage: { id: 'stage-3', name: 'Hired', category: 'HIRED', order: 3 },
          stageHistories: [],
        },
      ],
    },
    {
      id: 'stage-4',
      name: 'Rejected',
      category: 'REJECTED',
      order: 4,
      totalApplicants: 0,
      applications: [],
    },
  ];

  const mockStagesJob2 = [
    {
      id: 'stage-1',
      name: 'Applied',
      category: 'APPLIED',
      order: 1,
      totalApplicants: 1,
      applications: [
        {
          id: 'app-99',
          jobId: 'job-pipeline-2',
          candidateId: 'cand-99',
          currentStageId: 'stage-1',
          status: 'SUBMITTED',
          appliedAt: '2026-10-19T10:00:00.000Z',
          candidate: {
            id: 'cand-99',
            firstName: 'Diana',
            lastName: 'Prince',
            email: 'diana@example.com',
            headline: 'Kubernetes Architect',
            yearsOfExperience: 9,
          },
          currentStage: { id: 'stage-1', name: 'Applied', category: 'APPLIED', order: 1 },
          stageHistories: [],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    changeAppLanguage('en');

    // Default mock uses the real backend response structure: { success: true, items: [...] }
    vi.spyOn(jobsApi, 'getJobs').mockResolvedValue({
      success: true,
      items: [mockJob1, mockJob2],
      pagination: { total: 2, page: 1, limit: 100 },
    });

    vi.spyOn(jobsApi, 'getJobPipeline').mockImplementation((jobId) => {
      if (jobId === 'job-pipeline-2') {
        return Promise.resolve({
          success: true,
          job: mockJob2,
          stages: mockStagesJob2,
          totalApplications: 1,
        });
      }
      return Promise.resolve({
        success: true,
        job: mockJob1,
        stages: mockStagesJob1,
        totalApplications: 3,
      });
    });

    vi.spyOn(configurationApi, 'getRecruitmentStages').mockResolvedValue({
      success: true,
      data: [
        { id: 'stage-1', name: 'Applied', category: 'APPLIED', order: 0, status: 'ACTIVE' },
        { id: 'stage-2', name: 'Technical Interview', category: 'INTERVIEW', order: 1, status: 'ACTIVE' },
      ],
    });
  });

  describe('1. Job Loading & Selector Parsing', () => {
    it('correctly parses real backend response { items: [...] } and populates dropdown', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/admin/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
      });

      // Verify jobsApi was called with limit 100
      expect(jobsApi.getJobs).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100, page: 1, trashed: false })
      );
    });

    it('renders empty job openings state with link to create job when no jobs exist', async () => {
      vi.spyOn(jobsApi, 'getJobs').mockResolvedValue({
        success: true,
        items: [],
        pagination: { total: 0 },
      });

      renderWithProviders(
        <Routes>
          <Route path="/admin/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText(/No Job Openings Found/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Create Job Opening/i })).toBeInTheDocument();
    });

    it('displays error and retry action when jobsApi.getJobs fails', async () => {
      vi.spyOn(jobsApi, 'getJobs').mockRejectedValue(new Error('Network error loading jobs'));

      renderWithProviders(
        <Routes>
          <Route path="/admin/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load job openings/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Retry Loading Jobs/i })).toBeInTheDocument();
    });
  });

  describe('2. Navigation, i18n & Shell integration', () => {
    it('renders Hiring Pipeline in AdminShell navigation in English', async () => {
      changeAppLanguage('en');
      renderWithProviders(<AdminShell />, { route: '/admin' });
      expect(screen.getAllByText(/Hiring Pipeline/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders Bewerbungspipeline in German', async () => {
      changeAppLanguage('de');
      renderWithProviders(<AdminShell />, { route: '/admin' });
      expect(screen.getAllByText(/Bewerbungspipeline/i).length).toBeGreaterThanOrEqual(1);
    });

    it('supports direct route navigation to /admin/jobs/:jobId/pipeline', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:jobId/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/jobs/job-pipeline-2/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText('Lead DevOps Specialist')).toBeInTheDocument();
      });

      expect(screen.getByText('Diana Prince')).toBeInTheDocument();
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    });
  });

  describe('3. Kanban View & Candidate Cards', () => {
    it('renders stage columns in order with applicant counts', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:jobId/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/jobs/job-pipeline-1/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
      });

      expect(screen.getByText('Applied')).toBeInTheDocument();
      expect(screen.getByText('Technical Interview')).toBeInTheDocument();
      expect(screen.getByText('Hired')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();

      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    });

    it('renders candidate details including experience and title', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:jobId/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/jobs/job-pipeline-1/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });

      expect(screen.getByText(/Lead UI Engineer/i)).toBeInTheDocument();
      expect(screen.getByText(/6 yrs exp/i)).toBeInTheDocument();
      expect(screen.getByText(/Berlin, Germany/i)).toBeInTheDocument();
    });
  });

  describe('4. Switching Views: Kanban, List & Stages', () => {
    it('switches to List View and renders applicant table with filters', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:jobId/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/jobs/job-pipeline-1/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
      });

      // Switch to List View tab
      const listTab = screen.getByRole('tab', { name: /List View/i });
      fireEvent.click(listTab);

      await waitFor(() => {
        expect(screen.getByTestId('pipeline-list-table')).toBeInTheDocument();
      });

      // Check table column headers
      expect(screen.getByText(/Candidate Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Current Stage/i)).toBeInTheDocument();
      expect(screen.getByText(/Application Status/i)).toBeInTheDocument();
      expect(screen.getByText(/Applied Date/i)).toBeInTheDocument();
    });

    it('switches to Stages & Pipelines tab and renders RecruitmentStagesPage with banner', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:jobId/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/jobs/job-pipeline-1/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
      });

      // Switch to Stages & Pipelines tab
      const stagesTab = screen.getByRole('tab', { name: /Stages & Pipelines/i });
      fireEvent.click(stagesTab);

      await waitFor(() => {
        expect(screen.getByText(/Recruitment Stages Configuration/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Open in Platform Configuration/i })).toBeInTheDocument();
    });
  });

  describe('5. Switching Jobs Refreshes Pipeline Without Stale State', () => {
    it('fetches new pipeline data when job is switched', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/admin/pipeline" element={<PipelinePage />} />
          <Route path="/admin/jobs/:jobId/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });

      // Change job from selector
      const selectBox = screen.getByRole('combobox');
      fireEvent.mouseDown(selectBox);

      await waitFor(() => {
        expect(screen.getByText(/Lead DevOps Specialist/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Lead DevOps Specialist/i));

      await waitFor(() => {
        expect(jobsApi.getJobPipeline).toHaveBeenCalledWith('job-pipeline-2', expect.any(Object));
      });
    });
  });

  describe('6. Permission Boundaries & Terminal Protection', () => {
    it('displays Access Restricted when user lacks APPLICATIONS: READ', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:jobId/pipeline" element={<PipelinePage />} />
        </Routes>,
        {
          initialState: {
            auth: {
              isSuperAdmin: false,
              user: { role: 'RESTRICTED_VIEWER' },
              permissions: { APPLICATIONS: { READ: false } },
            },
          },
          route: '/admin/jobs/job-pipeline-1/pipeline',
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Access Restricted')).toBeInTheDocument();
      });
      expect(screen.queryByText('Technical Interview')).not.toBeInTheDocument();
    });

    it('hides stage move actions when user lacks APPLICATIONS: EDIT', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:jobId/pipeline" element={<PipelinePage />} />
        </Routes>,
        {
          initialState: {
            auth: {
              isSuperAdmin: false,
              user: { role: 'RECRUITER' },
              permissions: { APPLICATIONS: { READ: true, EDIT: false } },
            },
          },
          route: '/admin/jobs/job-pipeline-1/pipeline',
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('move-btn-app-1')).not.toBeInTheDocument();
    });

    it('prevents moving candidates in terminal states (Hired or Rejected)', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:jobId/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/jobs/job-pipeline-1/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
      });

      expect(screen.getByText('Terminal')).toBeInTheDocument();
    });
  });

  describe('7. Stage Transitions, Rejection Reason & Concurrency', () => {
    it('opens transition modal and handles successful stage advancement', async () => {
      const updateSpy = vi.spyOn(jobsApi, 'updateApplicationStage').mockResolvedValue({
        success: true,
        message: 'Application successfully moved to stage "Technical Interview".',
      });

      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:jobId/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/jobs/job-pipeline-1/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });

      const moveBtn = screen.getByTestId('move-btn-app-1');
      fireEvent.click(moveBtn);

      await waitFor(() => {
        expect(screen.getByTestId('move-to-stage-stage-2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('move-to-stage-stage-2'));

      await waitFor(() => {
        expect(screen.getByText('Move Application Stage')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm transition/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          'job-pipeline-1',
          'app-1',
          expect.objectContaining({
            destinationStageId: 'stage-2',
            expectedPreviousStageId: 'stage-1',
          })
        );
      });
    });

    it('requires rejection reason when moving to Rejected stage', async () => {
      const updateSpy = vi.spyOn(jobsApi, 'updateApplicationStage');

      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:jobId/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/jobs/job-pipeline-1/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });

      const moveBtn = screen.getByTestId('move-btn-app-1');
      fireEvent.click(moveBtn);

      await waitFor(() => {
        expect(screen.getByTestId('move-to-stage-stage-4')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('move-to-stage-stage-4'));

      await waitFor(() => {
        expect(screen.getByText(/Application Rejection/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm transition/i });
      fireEvent.click(confirmButton);

      await waitFor(
        () => {
          expect(screen.getByText(/Please specify the rejection reason/i)).toBeInTheDocument();
        },
        { timeout: 4000 }
      );

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('handles 409 conflict gracefully and refetches pipeline', async () => {
      const conflictError = {
        response: {
          status: 409,
          data: { message: 'Stage conflict detected: application is currently in stage "Technical Interview".' },
        },
      };
      vi.spyOn(jobsApi, 'updateApplicationStage').mockRejectedValue(conflictError);

      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:jobId/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/jobs/job-pipeline-1/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });

      const moveBtn = screen.getByTestId('move-btn-app-1');
      fireEvent.click(moveBtn);

      await waitFor(() => {
        expect(screen.getByTestId('move-to-stage-stage-2')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('move-to-stage-stage-2'));

      await waitFor(() => {
        expect(screen.getByText('Move Application Stage')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm transition/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(jobsApi.getJobPipeline).toHaveBeenCalledTimes(2);
      });
    });

    it('opens stage history dialog showing past transitions', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/admin/jobs/:jobId/pipeline" element={<PipelinePage />} />
        </Routes>,
        { route: '/admin/jobs/job-pipeline-1/pipeline' }
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });

      const historyBtn = screen.getByTestId('history-btn-app-1');
      fireEvent.click(historyBtn);

      await waitFor(() => {
        expect(screen.getByText(/Candidate Stage History — Alice Smith/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/"Initial application submitted"/i)).toBeInTheDocument();
      expect(screen.getByText(/Transitioned by System/i)).toBeInTheDocument();
    });
  });
});
