import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import authReducer from '../store/authSlice.js';
import themeReducer from '../store/themeSlice.js';
import { AdminShell } from '../components/AdminShell.jsx';
import { CandidatesPage } from '../features/candidates/CandidatesPage.jsx';
import { CandidateDetailsPage } from '../features/candidates/CandidateDetailsPage.jsx';
import { candidateApi } from '../services/candidateApi.js';
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

describe('RecruiTrain Candidate Module Frontend Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    changeAppLanguage('en');
    vi.spyOn(companiesApi, 'getCompanies').mockResolvedValue({
      success: true,
      data: [{ id: 'comp-1', name: 'Leipzig Orchestra GmbH' }],
      pagination: { total: 1, page: 1, limit: 100 },
    });
  });

  describe('1. Navigation & Directory View', () => {
    it('renders Candidates menu item in AdminShell', () => {
      renderWithProviders(<AdminShell />, { route: '/admin' });
      expect(screen.getAllByText(/Candidates/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders candidate directory and metric statistics', async () => {
      vi.spyOn(candidateApi, 'getCandidates').mockResolvedValue({
        success: true,
        items: [
          {
            id: 'cand-uuid-1',
            email: 'johann.bach@leipzig.de',
            firstName: 'Johann',
            middleName: 'Sebastian',
            lastName: 'Bach',
            fullName: 'Johann Sebastian Bach',
            phone: '+49 151 12345678',
            currentJobTitle: 'Cantor & Director Musices',
            currentCompany: 'Thomaskirche Leipzig',
            yearsOfExperience: 30,
            city: 'Leipzig',
            country: 'DE',
            profileCompletion: 85,
            status: 'ACTIVE',
            _count: { applications: 3, savedJobs: 1 },
          },
        ],
        counts: {
          all: 1,
          active: 1,
          pending: 0,
          inactive: 0,
          suspended: 0,
          trash: 0,
        },
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      renderWithProviders(<CandidatesPage />);

      await waitFor(() => {
        expect(screen.getByText('Johann Sebastian Bach')).toBeInTheDocument();
        expect(screen.getByText('johann.bach@leipzig.de')).toBeInTheDocument();
        expect(screen.getByText('Cantor & Director Musices')).toBeInTheDocument();
        expect(screen.getByText('30 yrs')).toBeInTheDocument();
      });
    });
  });

  describe('2. Candidate 360° Profile Details View', () => {
    it('renders all 360 profile sections (A through G) for selected candidate', async () => {
      vi.spyOn(candidateApi, 'getCandidate').mockResolvedValue({
        success: true,
        data: {
          id: 'cand-uuid-1',
          email: 'johann.bach@leipzig.de',
          firstName: 'Johann',
          middleName: 'Sebastian',
          lastName: 'Bach',
          fullName: 'Johann Sebastian Bach',
          phone: '+49 151 12345678',
          alternateMobile: '+49 151 87654321',
          dateOfBirth: '1685-03-31T00:00:00.000Z',
          gender: 'MALE',
          nationality: 'German',
          addressLine1: 'Thomaskirchhof 18',
          city: 'Leipzig',
          state: 'Saxony',
          postalCode: '04109',
          country: 'DE',
          profession: 'Composer & Kapellmeister',
          employmentType: 'FULL_TIME',
          currentJobTitle: 'Director Musices',
          currentCompany: 'Thomaskirche',
          yearsOfExperience: 35,
          noticePeriodDays: 90,
          expectedSalary: 150000,
          willingToRelocate: true,
          preferredLocation: 'Germany',
          headline: 'Baroque Master of Counterpoint and Polyphony',
          summary: 'Lifelong dedication to sacred and secular keyboard and orchestral masterworks.',
          workPermitAuthorized: true,
          visaStatus: 'EU Citizen / Permanent',
          passportNumber: 'DE-8839201',
          passportExpiryDate: '2030-12-31T00:00:00.000Z',
          linkedinUrl: 'https://linkedin.com/in/bach-polyphony',
          githubUrl: 'https://github.com/bach-scores',
          portfolioUrl: 'https://bach-cantatas.org',
          profileCompletion: 95,
          status: 'ACTIVE',
          resumeUrl: 'https://storage.recruitrain.test/resumes/bach_cv.pdf',
          resumeFileName: 'Johann_Sebastian_Bach_CV.pdf',
          resumeMimeType: 'application/pdf',
          createdAt: '2026-01-01T00:00:00.000Z',
          applications: [
            {
              id: 'app-uuid-1',
              jobId: 'job-uuid-1',
              job: {
                id: 'job-uuid-1',
                title: 'Principal Court Musician',
                company: { name: 'Dresden Court Chapel' },
              },
              currentStage: { name: 'Final Interview' },
              status: 'INTERVIEW',
              appliedAt: '2026-02-15T10:00:00.000Z',
            },
          ],
        },
      });

      renderWithProviders(
        <Routes>
          <Route path="/admin/candidates/:id" element={<CandidateDetailsPage />} />
        </Routes>,
        { route: '/admin/candidates/cand-uuid-1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Johann Sebastian Bach')).toBeInTheDocument();
        expect(screen.getByText(/Section A — Personal & Contact Information/i)).toBeInTheDocument();
        expect(screen.getByText(/Section B — Residential Address/i)).toBeInTheDocument();
        expect(screen.getByText(/Section C — Professional Details & Preferences/i)).toBeInTheDocument();
        expect(screen.getByText(/Section D — Work Authorization/i)).toBeInTheDocument();
        expect(screen.getByText(/Section E — Online Profiles & Links/i)).toBeInTheDocument();
        expect(screen.getByText(/Section F — Curriculum Vitae \/ Resume/i)).toBeInTheDocument();
        expect(screen.getByText(/Section G — Applications & Recruitment History/i)).toBeInTheDocument();
        expect(screen.getByText('Principal Court Musician')).toBeInTheDocument();
        expect(screen.getByText('Dresden Court Chapel')).toBeInTheDocument();
        expect(screen.getByText('Johann_Sebastian_Bach_CV.pdf')).toBeInTheDocument();
      });
    });
  });

  describe('3. Add Candidate Modal & Exact Ordered Fieldset', () => {
    it('opens modal, renders exact fields in order, removes extra section dividers, and synchronizes Candidate Name', async () => {
      vi.spyOn(candidateApi, 'getCandidates').mockResolvedValue({
        success: true,
        items: [],
        counts: { all: 0, active: 0, pending: 0, inactive: 0, suspended: 0, trash: 0 },
        pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
      });

      renderWithProviders(<CandidatesPage />);

      const addBtn = screen.getByRole('button', { name: /Add Candidate/i });
      fireEvent.click(addBtn);

      await waitFor(() => {
        // Modal title
        expect(screen.getAllByText('Add Candidate').length).toBeGreaterThanOrEqual(1);

        // Required Resume Document
        expect(screen.getByText('Resume Document')).toBeInTheDocument();
        expect(screen.getByText('Select Resume Document')).toBeInTheDocument();

        // Company selector populated from backend
        expect(screen.getByText('Company')).toBeInTheDocument();

        // Read-only candidate name & profile completion
        expect(screen.getByText('Candidate Name')).toBeInTheDocument();
        expect(screen.getAllByText('Profile Completion (%)').length).toBeGreaterThanOrEqual(1);

        // First Name, Middle Name, Last Name
        expect(screen.getByPlaceholderText('Johann')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Sebastian (optional)')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Bach')).toBeInTheDocument();

        // Informational text: Candidate Name is automatically generated from the name fields
        expect(
          screen.getByText(/Candidate Name is automatically generated from the name fields/i)
        ).toBeInTheDocument();

        // Contact & Personal Fields
        expect(screen.getByPlaceholderText('johann.bach@leipzig.de')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('+49 151 12345678')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('+49 151 87654321')).toBeInTheDocument();

        // Verify extra section headings are REMOVED from the modal
        expect(screen.queryByText(/Section A — Personal & Contact Information/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Section B — Resume & Company Association/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Section C — Personal Information/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Section D — Professional Details & Preferences/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Section E — Residential Address/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Section F — Passport & Work Authorization/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Section G — Online Profiles & Links/i)).not.toBeInTheDocument();
      });

      // Type First Name, Middle Name, Last Name to verify auto Candidate Name generation
      const firstNameInput = screen.getByPlaceholderText('Johann');
      const middleNameInput = screen.getByPlaceholderText('Sebastian (optional)');
      const lastNameInput = screen.getByPlaceholderText('Bach');

      fireEvent.change(firstNameInput, { target: { value: 'Ludwig' } });
      fireEvent.change(middleNameInput, { target: { value: 'van' } });
      fireEvent.change(lastNameInput, { target: { value: 'Beethoven' } });

      await waitFor(() => {
        const candidateNameInput = screen.getByDisplayValue('Ludwig van Beethoven');
        expect(candidateNameInput).toBeInTheDocument();
        expect(candidateNameInput).toBeDisabled();
      });
    });

    it('rejects form submission when resume is missing', async () => {
      vi.spyOn(candidateApi, 'getCandidates').mockResolvedValue({
        success: true,
        items: [],
        counts: { all: 0, active: 0, pending: 0, inactive: 0, suspended: 0, trash: 0 },
        pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
      });

      const createSpy = vi.spyOn(candidateApi, 'createCandidate');

      renderWithProviders(<CandidatesPage />);
      fireEvent.click(screen.getByRole('button', { name: /Add Candidate/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Johann')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('Johann'), { target: { value: 'Ludwig' } });
      fireEvent.change(screen.getByPlaceholderText('Bach'), { target: { value: 'Beethoven' } });
      fireEvent.change(screen.getByPlaceholderText('johann.bach@leipzig.de'), { target: { value: 'ludwig@beethoven.de' } });

      const submitBtn = screen.getByRole('button', { name: /Save Candidate/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getAllByText(/Resume document is required/i).length).toBeGreaterThanOrEqual(1);
        expect(createSpy).not.toHaveBeenCalled();
      });
    });

    it('auto-fills fields from parsed resume and does not overwrite existing user inputs', async () => {
      vi.spyOn(candidateApi, 'getCandidates').mockResolvedValue({
        success: true,
        items: [],
        counts: { all: 0, active: 0, pending: 0, inactive: 0, suspended: 0, trash: 0 },
        pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
      });

      vi.spyOn(candidateApi, 'parseResume').mockResolvedValue({
        success: true,
        parseSuccess: true,
        extracted: {
          firstName: 'Clara',
          middleName: 'Josephine',
          lastName: 'Schumann',
          email: 'clara.schumann@leipzig.de',
          phone: '+49 151 99999999',
          currentJobTitle: 'Pianist & Composer',
          currentCompany: 'Gewandhaus Leipzig',
          yearsOfExperience: 20,
          city: 'Leipzig',
          country: 'DE',
          linkedinUrl: 'https://linkedin.com/in/clara-schumann',
        },
        message: 'Resume parsed successfully!',
      });

      renderWithProviders(<CandidatesPage />);
      fireEvent.click(screen.getByRole('button', { name: /Add Candidate/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Johann')).toBeInTheDocument();
      });

      // Pre-enter a custom first name to verify user-entered values are not overwritten
      fireEvent.change(screen.getByPlaceholderText('Johann'), { target: { value: 'Clara-UserEdited' } });

      // Simulate resume upload
      const dummyFile = new File(['%PDF-1.4 dummy'], 'clara_schumann_cv.pdf', { type: 'application/pdf' });
      const uploadInput = document.querySelector('input[type="file"]');
      if (uploadInput) {
        fireEvent.change(uploadInput, { target: { files: [dummyFile] } });
      }

      await waitFor(() => {
        // User entered value should remain intact (not overwritten)
        expect(screen.getByDisplayValue('Clara-UserEdited')).toBeInTheDocument();
        // Empty fields should be auto-filled
        expect(screen.getByDisplayValue('Schumann')).toBeInTheDocument();
        expect(screen.getByDisplayValue('clara.schumann@leipzig.de')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Pianist & Composer')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Gewandhaus Leipzig')).toBeInTheDocument();
      });
    });

    it('submits new candidate with resume and calls createCandidate API', async () => {
      vi.spyOn(candidateApi, 'getCandidates').mockResolvedValue({
        success: true,
        items: [],
        counts: { all: 0, active: 0, pending: 0, inactive: 0, suspended: 0, trash: 0 },
        pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
      });

      vi.spyOn(candidateApi, 'parseResume').mockResolvedValue({
        success: true,
        parseSuccess: false,
        extracted: {},
        message: 'Manual entry supported',
      });

      const createSpy = vi.spyOn(candidateApi, 'createCandidate').mockResolvedValue({
        success: true,
        candidate: { id: 'new-cand-1', fullName: 'Ludwig van Beethoven', email: 'ludwig@beethoven.de' },
        alreadyExists: false,
        alreadyActivated: false,
        invitationSent: true,
        invitationStatus: 'PENDING',
      });

      renderWithProviders(<CandidatesPage />);

      fireEvent.click(screen.getByRole('button', { name: /Add Candidate/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Johann')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('Johann'), { target: { value: 'Ludwig' } });
      fireEvent.change(screen.getByPlaceholderText('Bach'), { target: { value: 'Beethoven' } });
      fireEvent.change(screen.getByPlaceholderText('johann.bach@leipzig.de'), { target: { value: 'ludwig@beethoven.de' } });

      // Upload resume file
      const dummyFile = new File(['%PDF-1.4 test'], 'beethoven_cv.pdf', { type: 'application/pdf' });
      const uploadInput = document.querySelector('input[type="file"]');
      if (uploadInput) {
        fireEvent.change(uploadInput, { target: { files: [dummyFile] } });
      }

      await waitFor(() => {
        expect(screen.getByText('beethoven_cv.pdf')).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole('button', { name: /Save Candidate/i });
      fireEvent.click(submitBtn);
      const form = document.querySelector('form');
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalled();
        const [formDataArg, isFormData] = createSpy.mock.calls[0];
        expect(isFormData).toBe(true);
        expect(formDataArg).toBeInstanceOf(FormData);
        expect(formDataArg.get('firstName')).toBe('Ludwig');
        expect(formDataArg.get('lastName')).toBe('Beethoven');
        expect(formDataArg.get('email')).toBe('ludwig@beethoven.de');
        expect(formDataArg.get('resume')).toBeDefined();
      });
    });
  });
});
