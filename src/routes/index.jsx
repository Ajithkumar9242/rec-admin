import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { ProtectedRoute } from '../components/ProtectedRoute.jsx';
import { AdminShell } from '../components/AdminShell.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { SecuritySettingsPage } from '../features/settings/SecuritySettingsPage.jsx';
import { PlansPage } from '../features/billing/PlansPage.jsx';
import { SubscriptionsPage } from '../features/billing/SubscriptionsPage.jsx';
import { InvoicesPage } from '../features/billing/InvoicesPage.jsx';
import { BillingAnalyticsPage } from '../features/billing/BillingAnalyticsPage.jsx';
import { IndustriesPage } from '../features/configuration/IndustriesPage.jsx';
import { CompanyDocumentsPage } from '../features/configuration/CompanyDocumentsPage.jsx';
import { CandidateDocumentsPage } from '../features/configuration/CandidateDocumentsPage.jsx';
import { RecruitmentStagesPage } from '../features/configuration/RecruitmentStagesPage.jsx';
import { CandidateSettingsPage } from '../features/configuration/CandidateSettingsPage.jsx';
import { EmployerVisibilityPage } from '../features/configuration/EmployerVisibilityPage.jsx';
import { JobSettingsPage } from '../features/configuration/JobSettingsPage.jsx';
import { CompaniesPage } from '../features/companies/CompaniesPage.jsx';
import { CompanyOnboardingWizard } from '../features/companies/CompanyOnboardingWizard.jsx';
import { CompanyDetailsPage } from '../features/companies/CompanyDetailsPage.jsx';

function RootRedirect() {
  const { isAuthenticated, isInitialized } = useSelector((state) => state.auth);

  if (!isInitialized) {
    return null; // App will render loader
  }

  return isAuthenticated ? <Navigate to="/admin" replace /> : <Navigate to="/login" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Root redirection */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <AuthLayout>
            <ForgotPasswordPage />
          </AuthLayout>
        }
      />
      <Route
        path="/reset-password"
        element={
          <AuthLayout>
            <ResetPasswordPage />
          </AuthLayout>
        }
      />

      {/* Protected Admin Shell Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="security" element={<SecuritySettingsPage />} />
        
        {/* Phase 3: Billing & Subscriptions Routes */}
        <Route path="billing" element={<Navigate to="/admin/billing/plans" replace />} />
        <Route path="billing/plans" element={<PlansPage />} />
        <Route path="billing/subscriptions" element={<SubscriptionsPage />} />
        <Route path="billing/invoices" element={<InvoicesPage />} />
        <Route path="billing/analytics" element={<BillingAnalyticsPage />} />

        {/* Phase 2: Employer & Company Management Routes */}
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="companies/new" element={<CompanyOnboardingWizard />} />
        <Route path="companies/:id" element={<CompanyDetailsPage />} />

        {/* Phase 1: Platform Configuration Routes */}
        <Route path="configuration" element={<Navigate to="/admin/configuration/industries" replace />} />
        <Route path="configuration/industries" element={<IndustriesPage />} />
        <Route path="configuration/company-documents" element={<CompanyDocumentsPage />} />
        <Route path="configuration/candidate-documents" element={<CandidateDocumentsPage />} />
        <Route path="configuration/recruitment-stages" element={<RecruitmentStagesPage />} />
        <Route path="configuration/candidate-settings" element={<CandidateSettingsPage />} />
        <Route path="configuration/employer-visibility" element={<EmployerVisibilityPage />} />
        <Route path="configuration/job-settings" element={<JobSettingsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
