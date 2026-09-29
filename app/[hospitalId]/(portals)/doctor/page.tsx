import React from 'react';
import {
   getDoctorDashboardAction,
   getDoctorProfileAction,
   getQuickNotesAction,
   getDoctorWeeklyStatsAction,
   getMyAnnouncementsAction
} from '@/lib/integrations';
import DoctorDashboardContainer from '@/components/doctor/DoctorDashboardContainer';

export const dynamic = 'force-dynamic';
export const revalidate = 30; // Background re-validation for instant subsequent navigations

export default async function DoctorDashboard() {
   // Parallel data fetching
   const [dashboardRes, meRes, notesRes, statsRes, annRes] = await Promise.all([
      getDoctorDashboardAction(),
      getDoctorProfileAction(),
      getQuickNotesAction(),
      getDoctorWeeklyStatsAction(),
      getMyAnnouncementsAction()
   ]);

   const dashboard = dashboardRes.success && dashboardRes.data ? dashboardRes.data : null;
   const doctorName = meRes.success && meRes.data?.user?.name ? meRes.data.user.name : 'Doctor';
   const recentPatients = dashboard?.recentPatients || [];
   const announcements = annRes.success && annRes.data ? annRes.data : [];

   // Extract basic stats for cards
   const stats = dashboard?.stats || {
      totalPatients: 0,
      appointmentsToday: 0,
      totalPendingQueue: 0,
      pendingReports: 0,
      activeInpatients: 0,
      consultationsValue: 0
   };

   // Process Chart Data
   let chartData: any[] = [];
   if (statsRes.success && statsRes.data && Array.isArray(statsRes.data.days)) {
      chartData = statsRes.data.days.map((day: any) => ({
         name: day.dayName ? day.dayName.substring(0, 3) : 'N/A',
         count: day.dailyTotal || 0
      }));
   }

   const notes = notesRes.success && notesRes.data ? notesRes.data : [];
   const consultationDuration = meRes.data?.consultationDuration || 0;

   return (
      <div className="pb-20">
         {/* Main Dashboard Layout Container (Includes Header, Stats, and Grid) */}
         <DoctorDashboardContainer
            doctorName={doctorName}
            stats={stats}
            chartData={chartData}
            initialNotes={notes}
            consultationDuration={consultationDuration}
            recentPatients={recentPatients}
         />
      </div>
   );
}