import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../store/authSlice.js';
import themeReducer from '../store/themeSlice.js';
import { PlansPage } from '../features/billing/PlansPage.jsx';
import { SubscriptionsPage } from '../features/billing/SubscriptionsPage.jsx';
import { InvoicesPage } from '../features/billing/InvoicesPage.jsx';
import { BillingAnalyticsPage } from '../features/billing/BillingAnalyticsPage.jsx';
import { AdminShell } from '../components/AdminShell.jsx';
import { billingApi } from '../services/billingApi.js';
import '../i18n/index.js';
import { changeAppLanguage } from '../i18n/index.js';

function renderWithProviders(ui, { initialState = {}, route = '/admin/billing/plans' } = {}) {
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
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[route]}>
          {ui}
        </MemoryRouter>
      </Provider>
    ),
  };
}

describe('RecruiTrain Phase 3: Billing & Subscriptions Frontend Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    changeAppLanguage('en');
  });

  // ==========================================
  // 1. PLANS MANAGEMENT UI
  // ==========================================
  describe('1. Plans Management Component', () => {
    it('renders plans table with columns, pricing, intervals and quotas', async () => {
      vi.spyOn(billingApi, 'getPlans').mockResolvedValue({
        success: true,
        data: [
          {
            id: 'plan-1',
            name: 'Growth Tier',
            description: 'Mid-market recruiting plan',
            price: 99.00,
            offerPrice: 79.00,
            currency: 'EUR',
            billingInterval: 'MONTHLY',
            candidateAccessLimit: 100,
            jobPostingLimit: 10,
            teamMemberLimit: 3,
            status: 'ACTIVE',
            _count: { subscriptions: 4 },
          },
        ],
      });

      renderWithProviders(<PlansPage />);

      expect(await screen.findByText('Growth Tier')).toBeInTheDocument();
      expect(screen.getByText(/99.00 EUR/)).toBeInTheDocument();
      expect(screen.getByText(/Offer Price: 79.00 EUR/)).toBeInTheDocument();
      expect(screen.getByText('Monthly')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('opens create plan modal on clicking Create Plan button', async () => {
      vi.spyOn(billingApi, 'getPlans').mockResolvedValue({ success: true, data: [] });

      renderWithProviders(<PlansPage />);

      const createBtn = await screen.findByRole('button', { name: /Create Plan/i });
      fireEvent.click(createBtn);

      expect(await screen.findByLabelText(/Plan Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Regular Price/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Billing Interval/i)).toBeInTheDocument();
    });

    it('displays empty state when no plans exist', async () => {
      vi.spyOn(billingApi, 'getPlans').mockResolvedValue({ success: true, data: [] });

      renderWithProviders(<PlansPage />);

      await waitFor(() => {
        expect(screen.getAllByText(/no data/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('switches between Active Plans, Inactive Plans, and Trash & Retention views', async () => {
      const getPlansSpy = vi.spyOn(billingApi, 'getPlans').mockImplementation((params) => {
        if (params?.trashed === 'true') {
          return Promise.resolve({
            success: true,
            data: [
              {
                id: 'plan-trashed',
                name: 'Legacy Tier',
                description: 'Archived legacy plan',
                price: 49.00,
                currency: 'EUR',
                billingInterval: 'MONTHLY',
                candidateAccessLimit: 10,
                jobPostingLimit: 1,
                teamMemberLimit: 1,
                status: 'ARCHIVED',
                deletedAt: new Date().toISOString(),
                _count: { subscriptions: 0 },
              },
            ],
          });
        }
        return Promise.resolve({
          success: true,
          data: [
            {
              id: 'plan-active',
              name: 'Active Pro',
              price: 199.00,
              currency: 'EUR',
              billingInterval: 'MONTHLY',
              candidateAccessLimit: 100,
              jobPostingLimit: 10,
              teamMemberLimit: 5,
              status: 'ACTIVE',
              _count: { subscriptions: 2 },
            },
          ],
        });
      });

      renderWithProviders(<PlansPage />);

      expect(await screen.findByText('Active Pro')).toBeInTheDocument();
      expect(screen.getByText('Active Plans')).toBeInTheDocument();
      expect(screen.getByText('Inactive / Archived Plans')).toBeInTheDocument();
      expect(screen.getByText('Trash & Retention')).toBeInTheDocument();

      // Click Trash tab
      fireEvent.click(screen.getByText('Trash & Retention'));

      expect(await screen.findByText('Legacy Tier')).toBeInTheDocument();
      expect(screen.getByText(/days remaining/i)).toBeInTheDocument();
      expect(screen.getByTitle('Restore Plan')).toBeInTheDocument();
    });
  });

  // ==========================================
  // 2. SUBSCRIPTION MANAGEMENT UI
  // ==========================================
  describe('2. Subscriptions Management Component', () => {
    it('renders subscriptions table with employer, plan, and usage badges', async () => {
      vi.spyOn(billingApi, 'getSubscriptions').mockResolvedValue({
        success: true,
        data: [
          {
            id: 'sub-1',
            companyId: 'comp-1',
            company: { id: 'comp-1', name: 'Global Tech AG', taxId: 'DE111222333' },
            planId: 'plan-1',
            plan: { id: 'plan-1', name: 'Enterprise' },
            status: 'ACTIVE',
            price: 299.00,
            currency: 'EUR',
            billingInterval: 'MONTHLY',
            candidateAccessLimit: 500,
            candidateAccessUsage: 120,
            jobPostingLimit: 20,
            teamMemberLimit: 10,
            startDate: '2026-06-01T00:00:00Z',
            endDate: '2026-07-01T00:00:00Z',
          },
        ],
      });
      vi.spyOn(billingApi, 'getCompanies').mockResolvedValue({ success: true, data: [] });
      vi.spyOn(billingApi, 'getPlans').mockResolvedValue({ success: true, data: [] });

      renderWithProviders(<SubscriptionsPage />);

      expect(await screen.findByText('Global Tech AG')).toBeInTheDocument();
      expect(screen.getByText('120 / 500')).toBeInTheDocument();
      expect(screen.getByText('380 remaining')).toBeInTheDocument();
      // Verifies module pending tags for Jobs and Team Members
      expect(screen.getAllByText('Module Pending').length).toBeGreaterThanOrEqual(2);
    });

    it('renders integrated job and team member quotas when usage is provided', async () => {
      vi.spyOn(billingApi, 'getSubscriptions').mockResolvedValue({
        success: true,
        data: [
          {
            id: 'sub-2',
            company: { name: 'Acme Logistics GmbH', taxId: 'DE999888777' },
            plan: { name: 'Enterprise Plan' },
            status: 'ACTIVE',
            price: 499.00,
            currency: 'EUR',
            billingInterval: 'MONTHLY',
            candidateAccessLimit: 1000,
            candidateAccessUsage: 250,
            jobPostingLimit: 10,
            jobPostingUsage: 3,
            teamMemberLimit: 8,
            teamMemberUsage: 4,
            startDate: '2026-06-01T00:00:00Z',
            endDate: '2026-07-01T00:00:00Z',
          },
        ],
      });
      vi.spyOn(billingApi, 'getCompanies').mockResolvedValue({ success: true, data: [] });
      vi.spyOn(billingApi, 'getPlans').mockResolvedValue({ success: true, data: [] });

      renderWithProviders(<SubscriptionsPage />);

      expect(await screen.findByText('Acme Logistics GmbH')).toBeInTheDocument();
      expect(screen.getByText('3 / 10 jobs used')).toBeInTheDocument();
      expect(screen.getByText('7 remaining')).toBeInTheDocument();
      expect(screen.getByText('4 / 8 seats used')).toBeInTheDocument();
      expect(screen.getByText('4 remaining')).toBeInTheDocument();
      expect(screen.queryByText('Module Pending')).not.toBeInTheDocument();
    });

    it('renders Entitlement Editing modal with confirmation checkbox', async () => {
      vi.spyOn(billingApi, 'getSubscriptions').mockResolvedValue({
        success: true,
        data: [
          {
            id: 'sub-1',
            company: { name: 'Acme Corp' },
            plan: { name: 'Tier 1' },
            status: 'ACTIVE',
            price: 50,
            currency: 'EUR',
            billingInterval: 'MONTHLY',
            candidateAccessLimit: 100,
            candidateAccessUsage: 45,
            jobPostingLimit: 5,
            teamMemberLimit: 2,
          },
        ],
      });
      vi.spyOn(billingApi, 'getCompanies').mockResolvedValue({ success: true, data: [] });
      vi.spyOn(billingApi, 'getPlans').mockResolvedValue({ success: true, data: [] });

      renderWithProviders(<SubscriptionsPage />);

      const editBtn = await screen.findByTitle('Adjust Entitlements');
      fireEvent.click(editBtn);

      expect(await screen.findByText(/Current Candidate Usage: 45 \/ 100/i)).toBeInTheDocument();
      expect(screen.getByText(/The proposed limit is lower than current usage/i)).toBeInTheDocument();
    });
  });

  // ==========================================
  // 3. INVOICE & PAYMENT MANAGEMENT UI
  // ==========================================
  describe('3. Invoices & Payments Component', () => {
    it('renders invoices table with reconciled totals and MwSt breakdown', async () => {
      vi.spyOn(billingApi, 'getInvoices').mockResolvedValue({
        success: true,
        data: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-2026-00042',
            company: { name: 'Bavaria Motors' },
            issueDate: '2026-05-01T00:00:00Z',
            dueDate: '2026-05-15T00:00:00Z',
            currency: 'EUR',
            netAmount: 100.00,
            taxRate: 0.19,
            taxAmount: 19.00,
            grossTotal: 119.00,
            status: 'OPEN',
            payments: [],
          },
        ],
      });
      vi.spyOn(billingApi, 'getCompanies').mockResolvedValue({ success: true, data: [] });

      renderWithProviders(<InvoicesPage />);

      expect(await screen.findByText('INV-2026-00042')).toBeInTheDocument();
      expect(screen.getByText('Bavaria Motors')).toBeInTheDocument();
      expect(screen.getByText('100.00 EUR')).toBeInTheDocument();
      expect(screen.getByText(/19% Tax/i)).toBeInTheDocument();
      expect(screen.getByText('119.00 EUR')).toBeInTheDocument();
      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('opens view invoice modal with itemized reconciled layout', async () => {
      vi.spyOn(billingApi, 'getInvoices').mockResolvedValue({
        success: true,
        data: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-2026-00042',
            company: { name: 'Bavaria Motors' },
            legalNameSnapshot: 'Bavaria Motors AG',
            taxIdSnapshot: 'DE999888777',
            issueDate: '2026-05-01T00:00:00Z',
            dueDate: '2026-05-15T00:00:00Z',
            currency: 'EUR',
            netAmount: 100.00,
            taxRate: 0.19,
            taxAmount: 19.00,
            grossTotal: 119.00,
            status: 'OPEN',
            payments: [],
          },
        ],
      });
      vi.spyOn(billingApi, 'getCompanies').mockResolvedValue({ success: true, data: [] });

      renderWithProviders(<InvoicesPage />);

      const viewBtn = await screen.findByTitle('View Invoice');
      fireEvent.click(viewBtn);

      expect(await screen.findByText('Bavaria Motors AG')).toBeInTheDocument();
      expect(screen.getByText('Print / Download')).toBeInTheDocument();
    });
  });

  // ==========================================
  // 4. BILLING ANALYTICS & STRIPE STATE UI
  // ==========================================
  describe('4. Billing Analytics Component', () => {
    it('renders revenue by currency and unconfigured provider notice when credentials missing', async () => {
      vi.spyOn(billingApi, 'getBillingAnalytics').mockResolvedValue({
        success: true,
        data: {
          paymentProvider: {
            name: 'Stripe',
            status: 'unconfigured',
            configured: false,
          },
          kpis: {
            activeSubscriptions: 12,
            newSubscriptions: 3,
            overdueInvoices: 1,
            failedPayments: 0,
          },
          revenueByCurrency: [
            {
              currency: 'EUR',
              invoicedGross: 2380.00,
              collectedGross: 1190.00,
              outstandingGross: 1190.00,
              invoiceCount: 20,
            },
          ],
          planDistribution: [
            { planId: 'p1', planName: 'Professional', interval: 'MONTHLY', count: 8 },
          ],
        },
      });

      renderWithProviders(<BillingAnalyticsPage />);

      expect(await screen.findByText(/Stripe is currently unconfigured/i)).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument(); // Active subs
      expect(screen.getByText('2380.00 EUR')).toBeInTheDocument(); // Invoiced
      expect(screen.getAllByText('1190.00 EUR').length).toBe(2); // Collected & Outstanding
      expect(screen.getByText('Professional')).toBeInTheDocument();
    });
  });

  // ==========================================
  // 5. NAVIGATION & LOCALIZATION (EN & DE)
  // ==========================================
  describe('5. Navigation & Localization', () => {
    it('renders Billing navigation items in English', async () => {
      renderWithProviders(<AdminShell />);

      expect(screen.getByText('Billing & Subscriptions')).toBeInTheDocument();
    });

    it('renders Billing navigation items in German when language switched', async () => {
      changeAppLanguage('de');
      renderWithProviders(<AdminShell />);

      expect(screen.getByText('Abrechnung & Abonnements')).toBeInTheDocument();
    });
  });
});
