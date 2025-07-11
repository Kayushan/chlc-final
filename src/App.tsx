import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { AnnouncementProvider } from './contexts/AnnouncementContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CreatorLogin } from './pages/CreatorLogin'
import { StaffLogin } from './pages/StaffLogin'
import { CreatorDashboard } from './pages/CreatorDashboard'
import { AdminDashboard } from './pages/AdminDashboard'
import { HeadDashboard } from './pages/HeadDashboard'
import { TeacherDashboard } from './pages/TeacherDashboard'
import { AllBehaviorReportsPage } from './pages/AllBehaviorReportsPage'
import Maintenance from './pages/Maintenance'
import ReportViewer from './pages/ReportViewer'
import UpcomingFeatures from './pages/UpcomingFeatures'
import { IntroSplash } from './components/IntroSplash'
import { MaintenanceProvider, useMaintenanceStatus } from './contexts/MaintenanceContext'
// ThemeProvider and ThemeApplicator imports are removed
import { getCurrentStaffUser } from './lib/auth'


// Reverted MaintenanceGuardContent
function MaintenanceGuardContent({ children }: { children: React.ReactNode }) {
  const { isMaintenanceModeActive, isLoadingMaintenanceStatus } = useMaintenanceStatus();
  const location = window.location.pathname; // Consider useLocation() from react-router-dom if deeper nesting
  const user = getCurrentStaffUser();

  if (isLoadingMaintenanceStatus) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div>
        <p className="ml-4 text-lg text-gray-700">Checking system status...</p>
      </div>
    );
  }

  if (isMaintenanceModeActive) {
    if (user?.role === 'creator') {
      // Creator sees the site with a banner.
      // The standard Layout will be used by pages rendered via {children}.
      return (
        <>
          <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-[9998] shadow-lg">
            <p className="text-sm font-semibold">
              ⚠️ MAINTENANCE MODE IS ACTIVE. Regular users are seeing the maintenance page. You have full access.
            </p>
          </div>
          {/*
            The individual pages are expected to use the Layout component themselves.
            If Layout was globally applied before, this structure assumes pages handle their own Layout.
            The pt-12 is to avoid content being hidden by the fixed banner.
            Alternatively, a global Layout wrapper could be added here if all pages need it.
            For now, this provides the space for the banner.
          */}
          <div className="pt-12">
            {children} {/* children are the Routes, which render pages that use Layout */}
          </div>
        </>
      );
    } else if (location !== '/creator-login') {
      return <Maintenance />;
    }
  }

  // If not in maintenance mode, render children directly.
  // Pages are expected to use their own Layout component.
  return <>{children}</>;
}

function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  const handleSplashFinish = React.useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <ToastProvider>
      {showSplash && <IntroSplash onFinish={handleSplashFinish} />}
      <AnnouncementProvider>
        <Router>
          <MaintenanceProvider>
          {/* ThemeProvider is removed */}
          <MaintenanceGuardContent>
            <Routes>
              {/* Public Routes */}
                <Route path="/creator-login" element={<CreatorLogin />} />
            <Route path="/login" element={<StaffLogin />} />
            
            {/* Protected Routes */}
            <Route 
              path="/creator" 
              element={
                <ProtectedRoute requiredRole="creator" isCreatorRoute>
                  <CreatorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/head" 
              element={
                <ProtectedRoute requiredRole="head">
                  <HeadDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/teacher" 
              element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/behavior-reports" 
              element={
                <ProtectedRoute requiredRole="head">
                  <AllBehaviorReportsPage />
                </ProtectedRoute>
              } 
            />
            <Route path="/school-report-viewer" element={<ReportViewer />} />
            {/* Maintenance Standalone Route (for direct access) */}
            <Route path="/maintenance" element={<Maintenance />} />

            {/* Public Upcoming Features Page */}
            <Route path="/upcoming-features" element={<UpcomingFeatures />} />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </MaintenanceGuardContent>
        {/* ThemeProvider was here, now removed */}
      </MaintenanceProvider>
    </Router>
    </AnnouncementProvider>
  </ToastProvider>
  );
}

export default App;