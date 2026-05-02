import React from 'react';
import { useAuth } from '../context/AuthContext';
import WorkerDashboard from './WorkerDashboard';
import AdminDashboard from './AdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import { Navigate } from 'react-router-dom';

const Spinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#f3b012] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Cargando panel...</p>
        </div>
    </div>
);

const Dashboard = () => {
    const { profile, profileLoading } = useAuth();

    // Only show spinner if we are loading AND we don't have a profile yet.
    // If we already have a profile, we don't want to unmount everything just to refresh it.
    if (profileLoading && !profile) return <Spinner />;

    switch (profile?.role) {
        case 'super_admin':
            return <SuperAdminDashboard />;
        case 'admin':
            return <AdminDashboard />;
        case 'worker':
            return <WorkerDashboard />;
        default:
            return <Navigate to="/login" replace />;
    }
};

export default Dashboard;
