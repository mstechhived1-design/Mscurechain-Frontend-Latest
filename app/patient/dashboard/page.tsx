import React from 'react';
import { getPatientDashboardDataAction } from '@/lib/integrations';
import PatientDashboard from '@/components/patient/PatientDashboard';
import { AlertCircle } from 'lucide-react';
import FeedbackForm from '../components/FeedbackForm';
import ReLoginButton from '../components/ReLoginButton';

export default async function PatientPage() {
    // Fetch all dashboard data in one go on the server
    const dashboardRes = await getPatientDashboardDataAction();

    // Check if error is role-related
    const isRoleError = dashboardRes.error?.toLowerCase().includes('not authorized') ||
        dashboardRes.error?.toLowerCase().includes('access denied');

    if (!dashboardRes.success || !dashboardRes.data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="text-rose-500 w-10 h-10" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic mb-2">
                    {isRoleError ? 'Role Conflict' : 'Transmission Interrupt'}
                </h1>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest max-w-md">
                    {dashboardRes.error || 'The medical data retrieval was unsuccessful. Please verify your credentials or network status.'}
                </p>

                {isRoleError && <ReLoginButton />}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Medical Dashboard - Primary Section */}
            <section>
                <PatientDashboard initialData={dashboardRes.data} />
            </section>

            {/* Feedback Button Overlay */}
            <FeedbackForm />
        </div>
    );
}
