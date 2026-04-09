import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import MissionVision from './pages/MissionVision';
import WhoWeAre from './pages/WhoWeAre';
import Dashboard from './pages/Dashboard';

// Worker routes
import WorkerLogin from './pages/worker/WorkerLogin';
import WorkerRegister from './pages/worker/WorkerRegister';

// Admin routes
import AdminLogin from './pages/admin/AdminLogin';
import AdminRegister from './pages/admin/AdminRegister';

// Super Admin routes
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import SuperAdminRegister from './pages/superadmin/SuperAdminRegister';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/mision-vision" element={<MissionVision />} />
          <Route path="/quienes-somos" element={<WhoWeAre />} />

          {/* Worker */}
          <Route path="/login" element={<WorkerLogin />} />
          <Route path="/register" element={<WorkerRegister />} />

          {/* Company Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />

          {/* Super Admin */}
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route path="/superadmin/register" element={<SuperAdminRegister />} />

          {/* Protected dashboard (role-aware) */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
