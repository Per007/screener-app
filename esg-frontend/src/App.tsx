import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import PortfoliosPage from './pages/PortfoliosPage';
import PortfolioDetailPage from './pages/PortfolioDetailPage';
import NewPortfolioPage from './pages/NewPortfolioPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import CriteriaSetsPage from './pages/CriteriaSetsPage';
import CriteriaSetDetailPage from './pages/CriteriaSetDetailPage';
import AddCriteriaSetPage from './pages/AddCriteriaSetPage';
import ScreeningToolsPage from './pages/ScreeningToolsPage';
import RunScreeningPage from './pages/RunScreeningPage';
import ReportsPage from './pages/ReportsPage';
import IndividualCompanyScreening from './pages/screening/IndividualCompanyScreening';
import MultipleCompaniesScreening from './pages/screening/MultipleCompaniesScreening';
import SectorScreening from './pages/screening/SectorScreening';
import RegionScreening from './pages/screening/RegionScreening';
import CustomScreening from './pages/screening/CustomScreening';

const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {!isAuthenticated ? (
        <Route path="/login" element={<LoginPage />} />
      ) : (
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/portfolios" replace />} />
          <Route path="/portfolios" element={<PortfoliosPage />} />
          <Route path="/portfolios/new" element={<NewPortfolioPage />} />
          <Route path="/portfolios/:id" element={<PortfolioDetailPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/:id" element={<CompanyDetailPage />} />
          <Route path="/criteria-sets" element={<CriteriaSetsPage />} />
          <Route path="/criteria-sets/new" element={<AddCriteriaSetPage />} />
          <Route path="/criteria-sets/:id" element={<CriteriaSetDetailPage />} />
          <Route path="/screening-tools" element={<ScreeningToolsPage />} />
          <Route path="/run-screening" element={<RunScreeningPage />} />
          <Route path="/screening-tools/individual-company" element={<IndividualCompanyScreening />} />
          <Route path="/screening-tools/multiple-companies" element={<MultipleCompaniesScreening />} />
          <Route path="/screening-tools/sector" element={<SectorScreening />} />
          <Route path="/screening-tools/region" element={<RegionScreening />} />
          <Route path="/screening-tools/custom" element={<CustomScreening />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      )}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/portfolios" : "/login"} replace />} />
    </Routes>
  );
};

export default App;
