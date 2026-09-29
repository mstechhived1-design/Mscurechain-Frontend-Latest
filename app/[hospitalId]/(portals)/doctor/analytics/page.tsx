'use client';

import React, { useState, useEffect } from 'react';
import {
   Activity,
   TrendingUp,
   Users,
   Clock,
   Target,
   ArrowUpRight,
   PieChart as PieIcon,
   FileText,
   Sparkles,
   Layers,
   BarChart,
   Download
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { getDoctorDashboardAction, getDoctorAnalyticsAction } from '@/lib/integrations/actions/doctor.actions';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAuthStore } from '@/stores/authStore';

const DashboardCharts = dynamic(() => import('@/components/doctor/DashboardCharts'), { ssr: false });

function AnalyticsPage() {
   const { user } = useAuthStore();
   const [stats, setStats] = useState<any>({
      totalPatients: "---",
      avgWaitTime: "--m",
      prescriptions: "---",
      labTokens: "---",
      satisfaction: "---",
      activePlans: "---"
   });
   const [chartData, setChartData] = useState<any[]>([]);
   const [distribution, setDistribution] = useState<any>({
      opd: 0,
      ipd: 0,
      male: 0,
      female: 0,
      other: 0,
      junior: 0,
      adult: 0,
      senior: 0
   });
   const [diagnosisStats, setDiagnosisStats] = useState<any[]>([]);
   const [topMedicines, setTopMedicines] = useState<any[]>([]);
   const [visitTendency, setVisitTendency] = useState({ new: 0, returning: 0 });
   const [fluxType, setFluxType] = useState<'OPD' | 'IPD'>('OPD');
   const [loading, setLoading] = useState(true);
   const [isExporting, setIsExporting] = useState(false);
   const [fullAnalyticsData, setFullAnalyticsData] = useState<any>(null);
   const [startDate, setStartDate] = useState('');
   const [endDate, setEndDate] = useState('');
   const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
   const [isUpdating, setIsUpdating] = useState(false);

   useEffect(() => {
      loadData();

      // Auto-refresh every 30 seconds for live updates
      const interval = setInterval(() => {
         loadData();
      }, 30000);

      return () => clearInterval(interval);
   }, []);

   const loadData = async () => {
      if (!loading) {
         // Silent refresh - don't show loading state for subsequent updates
         setIsUpdating(true);
         try {
            const [dashboardRes, analyticsRes] = await Promise.all([
               getDoctorDashboardAction(),
               getDoctorAnalyticsAction()
            ]);
            updateData(dashboardRes, analyticsRes);
            setLastUpdated(new Date());
         } catch (error) {
            console.error("Analytics silent refresh error", error);
         } finally {
            setTimeout(() => setIsUpdating(false), 1000); // Keep glow for 1 second
         }
         return;
      }

      setLoading(true);
      try {
         const [dashboardRes, analyticsRes] = await Promise.all([
            getDoctorDashboardAction(),
            getDoctorAnalyticsAction()
         ]);

         if (dashboardRes.success && dashboardRes.data) {
            setStats((prev: any) => ({
               ...prev,
               totalPatients: dashboardRes.data?.stats.totalPatients || 0
            }));
         }

         if (analyticsRes.success && analyticsRes.data) {
            const data = analyticsRes.data;

            if (data.appointmentTrend) {
               setChartData(data.appointmentTrend.map((d: any) => ({
                   name: d.date ? new Date(d.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : "---",
                   count: d.appointments || 0
               })));
            }

            // Real-time calculation for accuracy
            setStats((prev: any) => ({
               ...prev,
               prescriptions: data.performanceMetrics?.totalPrescriptions || 0,
               labTokens: data.performanceMetrics?.totalLabTokens || 0,
               avgWaitTime: data.performanceMetrics?.avgConsultationTime || "15m",
               satisfaction: data.performanceMetrics?.patientSatisfaction != null ? data.performanceMetrics.patientSatisfaction.toFixed(1) : "---",
            }));

            setDistribution({
               opd: data.patientDistribution?.opd || 0,
               ipd: data.patientDistribution?.ipd || 0,
               male: data.genderDistribution?.male || 0,
               female: data.genderDistribution?.female || 0,
               other: data.genderDistribution?.other || 0,
               junior: data.ageDistribution?.junior || 0,
               adult: data.ageDistribution?.adult || 0,
               senior: data.ageDistribution?.senior || 0
            });

            setDiagnosisStats(data.diagnosisStats || []);
            setTopMedicines(data.topMedicines || []);
            setVisitTendency(data.visitTendency || { new: 0, returning: 0 });
         }

      } catch (error) {
         console.error("Analytics load error", error);
         toast.error("Failed to load clinical analytics");
      } finally {
         setLoading(false);
      }
   };

   const updateData = (dashboardRes: any, analyticsRes: any) => {
      if (dashboardRes.success && dashboardRes.data) {
         setStats((prev: any) => ({
            ...prev,
            totalPatients: dashboardRes.data?.stats.totalPatients || 0
         }));
      }

      if (analyticsRes.success && analyticsRes.data) {
         const data = analyticsRes.data;
         setFullAnalyticsData(data);

         if (data.appointmentTrend) {
            setChartData(data.appointmentTrend.map((d: any) => ({
               name: new Date(d.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
               count: d.appointments
            })));
         }

         setStats((prev: any) => ({
            ...prev,
            prescriptions: data.performanceMetrics.totalPrescriptions || 0,
            labTokens: data.performanceMetrics.totalLabTokens || 0,
            avgWaitTime: data.performanceMetrics.avgConsultationTime || "15m",
            satisfaction: data.performanceMetrics.patientSatisfaction !== undefined ? data.performanceMetrics.patientSatisfaction.toFixed(1) : "---",
         }));

         setDistribution({
            opd: data.patientDistribution.opd || 0,
            ipd: data.patientDistribution.ipd || 0,
            male: data.genderDistribution.male || 0,
            female: data.genderDistribution.female || 0,
            other: data.genderDistribution.other || 0,
            junior: data.ageDistribution.junior || 0,
            adult: data.ageDistribution.adult || 0,
            senior: data.ageDistribution.senior || 0
         });

         setDiagnosisStats(data.diagnosisStats || []);
         setTopMedicines(data.topMedicines || []);
         setVisitTendency(data.visitTendency || { new: 0, returning: 0 });
      }
   };

   const handleExportExcel = async () => {
      setIsExporting(true);
      const loadToast = toast.loading('Generating clinical analytics report...');
      try {
         const workbook = new ExcelJS.Workbook();
         const worksheet = workbook.addWorksheet('Clinical Analytics');

         // 1. Report Heading
         worksheet.mergeCells('A1:H1');
         const titleRow = worksheet.getRow(1);
         titleRow.getCell(1).value = 'CLINICAL ANALYTICS REPORT';
         titleRow.getCell(1).font = { size: 16, bold: true, name: 'Arial', color: { argb: '1E293B' } };
         titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
         titleRow.height = 35;

         // 2. Doctor Name
         worksheet.mergeCells('A2:H2');
         const doctorRow = worksheet.getRow(2);
         doctorRow.getCell(1).value = `Dr. ${user?.name || 'Unknown'}`;
         doctorRow.getCell(1).font = { size: 12, bold: true, color: { argb: '475569' } };
         doctorRow.getCell(1).alignment = { horizontal: 'center' };

         // 3. Date Info
         worksheet.mergeCells('A3:H3');
         const dateRow = worksheet.getRow(3);
         const dateRangeText = startDate && endDate
            ? `Report Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
            : `Report Generated: ${new Date().toLocaleDateString()}`;
         dateRow.getCell(1).value = dateRangeText;
         dateRow.getCell(1).font = { size: 10, italic: true };
         dateRow.getCell(1).alignment = { horizontal: 'center' };

         worksheet.addRow([]);

         // Performance Metrics Section
         worksheet.mergeCells('A5:H5');
         worksheet.getCell('A5').value = 'PERFORMANCE METRICS';
         worksheet.getCell('A5').font = { bold: true, size: 12 };
         worksheet.getCell('A5').alignment = { horizontal: 'center' };

         const metricsData = [
            ['Metric', 'Value'],
            ['Total Prescriptions', stats.prescriptions],
            ['Lab Tokens Issued', stats.labTokens],
            ['Patient Satisfaction Score', stats.satisfaction],
            ['Average Consultation Time', stats.avgWaitTime]
         ];

         metricsData.forEach((row, index) => {
            const excelRow = worksheet.addRow(row);
            if (index === 0) {
               excelRow.font = { bold: true };
               excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
               excelRow.font = { bold: true, color: { argb: 'FFFFFF' } };
            }
            excelRow.eachCell(cell => {
               cell.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
               };
            });
         });

         worksheet.addRow([]);
         worksheet.addRow([]);

         // Patient Distribution Section
         worksheet.mergeCells('A12:H12');
         worksheet.getCell('A12').value = 'PATIENT DISTRIBUTION';
         worksheet.getCell('A12').font = { bold: true, size: 12 };
         worksheet.getCell('A12').alignment = { horizontal: 'center' };

         const distributionData = [
            ['Category', 'Count'],
            ['Outpatient (OPD)', distribution.opd],
            ['Inpatient (IPD)', distribution.ipd],
            ['Male Patients', distribution.male],
            ['Female Patients', distribution.female],
            ['Other Gender', distribution.other],
            ['Junior (0-17 years)', distribution.junior],
            ['Adult (18-45 years)', distribution.adult],
            ['Senior (45+ years)', distribution.senior]
         ];

         distributionData.forEach((row, index) => {
            const excelRow = worksheet.addRow(row);
            if (index === 0) {
               excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
               excelRow.font = { bold: true, color: { argb: 'FFFFFF' } };
            }
            excelRow.eachCell(cell => {
               cell.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
               };
            });
         });

         worksheet.addRow([]);
         worksheet.addRow([]);

         // Top Medicines Section
         if (topMedicines.length > 0) {
            worksheet.mergeCells('A23:H23');
            worksheet.getCell('A23').value = 'TOP PRESCRIBED MEDICINES';
            worksheet.getCell('A23').font = { bold: true, size: 12 };
            worksheet.getCell('A23').alignment = { horizontal: 'center' };

            const medicineData = [
               ['Medicine Name', 'Units Prescribed'],
               ...topMedicines.slice(0, 10).map(med => [med.name, med.count])
            ];

            medicineData.forEach((row, index) => {
               const excelRow = worksheet.addRow(row);
               if (index === 0) {
                  excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
                  excelRow.font = { bold: true, color: { argb: 'FFFFFF' } };
               }
               excelRow.eachCell(cell => {
                  cell.border = {
                     top: { style: 'thin' },
                     left: { style: 'thin' },
                     bottom: { style: 'thin' },
                     right: { style: 'thin' }
                  };
               });
            });
         }

         // Set column widths
         worksheet.columns = [
            { width: 30 },
            { width: 20 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 15 }
         ];

         const buffer = await workbook.xlsx.writeBuffer();
         saveAs(new Blob([buffer]), `Clinical_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
         toast.success('Analytics report exported successfully', { id: loadToast });
      } catch (error) {
         console.error('Export Error:', error);
         toast.error('Failed to generate analytics report', { id: loadToast });
      } finally {
         setIsExporting(false);
      }
   };

   const totalDemographics = (distribution.junior + distribution.adult + distribution.senior) || 1;
   const totalVisits = (distribution.opd + distribution.ipd) || 1;
   const displayPercentage = fluxType === 'OPD'
      ? Math.round((distribution.opd / totalVisits) * 100)
      : Math.round((distribution.ipd / totalVisits) * 100);

   const registrationData = [
      { name: 'New Patients', value: visitTendency.new },
      { name: 'Returning', value: visitTendency.returning }
   ].filter(d => d.value > 0);

   const ageData = [
      { name: 'Junior', count: distribution.junior },
      { name: 'Adult', count: distribution.adult },
      { name: 'Senior', count: distribution.senior }
   ].filter(d => d.count > 0);

   const diagnosisChartData = diagnosisStats.slice(0, 5).map(d => ({
      name: d.name,
      count: d.count
   }));

   if (loading) {
      return (
         <div className="flex h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
               <div className="w-10 h-10 border-2 border-primary-theme border-t-transparent rounded-full animate-spin"></div>
               <p className="text-xs font-semibold text-muted tracking-widest uppercase">Processing clinical intelligence...</p>
            </div>
         </div>
      );
   }

   return (
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6 pb-16 pt-3 lg:pt-6">

         {/* Dynamic Header */}
         <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 mx-1 sm:mx-0 relative overflow-hidden mb-4 sm:mb-6 z-20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
            
            {/* Top Row: Title, Action */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full relative z-10">
               <div className="flex items-center gap-3 shrink-0">
                  <div className="p-1.5 md:p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                     <Activity className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="flex flex-col justify-center">
                     <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                        Clinical Analytics
                     </h1>
                     <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 hidden sm:flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Professional Practice Insight & Patient Flux
                     </p>
                  </div>
               </div>

               <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-between xl:justify-end">
                  <button
                     onClick={loadData}
                     className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm shadow-emerald-500/20 w-full sm:w-auto justify-center active:scale-95"
                  >
                     <Activity size={12} className={isUpdating ? "animate-spin" : ""} /> Refresh Intelligence
                  </button>
               </div>
            </div>
         </div>

         {/* Accuracy-Focus Metrics */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {[
               { label: "Prescriptions", value: stats.prescriptions, icon: FileText, color: "emerald", sub: "Clinical Output" },
               { label: "Lab Recommendations", value: stats.labTokens, icon: Activity, color: "blue", sub: "Diagnostic Load" },
               { label: "Satisfaction", value: `${stats.satisfaction}/5.0`, icon: Target, color: "rose", sub: "Patient Feedback" },
               { label: "Consult Time", value: stats.avgWaitTime, icon: Clock, color: "indigo", sub: "Efficiency" }
            ].map((stat, i) => (
               <div key={i} className="relative group overflow-hidden bg-white dark:bg-card p-3 sm:p-6 rounded-xl sm:rounded-2xl border border-border-theme hover:border-primary-theme transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-primary-theme/5">
                  <div className="relative z-10">
                     <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <div className={`p-1.5 sm:p-2.5 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-500`}>
                           <stat.icon size={16} className="sm:w-5 sm:h-5" />
                        </div>
                        <span className="hidden sm:block text-[8px] font-black text-muted uppercase tracking-widest bg-secondary-theme px-2 py-1 rounded-full">{stat.sub}</span>
                     </div>
                     <p className="text-[8px] sm:text-[10px] font-black text-muted uppercase tracking-widest mb-1">{stat.label}</p>
                     <h3 className="text-base sm:text-2xl font-black text-foreground tracking-tighter">{stat.value}</h3>
                  </div>
               </div>
            ))}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Flux Tracking - Area Chart */}
            <div className="lg:col-span-2 bg-card rounded-2xl sm:rounded-3xl border border-border-theme p-3 sm:p-6 shadow-sm">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 border-b border-border-theme pb-4 gap-3">
                  <div>
                     <h3 className="text-base sm:text-xl font-black text-foreground uppercase tracking-tight">Patient Flux Analysis</h3>
                     <p className="text-[8px] sm:text-[9px] font-black text-muted uppercase tracking-widest mt-1">Daily clinical volume (Last 30 Days)</p>
                  </div>
                  <div className="flex items-center gap-4 bg-secondary-theme/50 p-2 rounded-xl border border-border-theme/50">
                     <div className="text-right">
                        <p className="text-[8px] font-black text-muted uppercase tracking-tight">Outpatient</p>
                        <p className="text-sm sm:text-base font-black text-blue-500">{distribution.opd}</p>
                     </div>
                     <div className="w-px h-6 bg-border-theme opacity-50" />
                     <div className="text-right">
                        <p className="text-[8px] font-black text-muted uppercase tracking-tight">Inpatient</p>
                        <p className="text-sm sm:text-base font-black text-emerald-500">{distribution.ipd}</p>
                     </div>
                  </div>
               </div>
               <div className="h-[200px] sm:h-[280px] lg:h-[350px] -ml-4">
                  <DashboardCharts type="area" data={chartData} colors={['#3b82f6']} />
               </div>
            </div>

            {/* Demographic Index */}
            <div className="bg-white dark:bg-card p-4 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[2.5rem] border border-border-theme shadow-sm flex flex-col justify-between overflow-hidden">
               <div>
                  <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight mb-2 sm:mb-4 italic">Demographic Index</h3>
                  <p className="text-[8px] sm:text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-6 sm:mb-10">Strategic Age & Practice Profiling</p>

                  <div className="space-y-6 sm:space-y-10">
                     <div className="flex flex-col items-center">
                        <div className="flex p-1 bg-secondary-theme rounded-2xl mb-6 sm:mb-8 w-full max-w-[240px]">
                           <button onClick={() => setFluxType('OPD')} className={`flex-1 py-1.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${fluxType === 'OPD' ? 'bg-white shadow-md text-primary-theme' : 'text-muted'}`}>Outpatient</button>
                           <button onClick={() => setFluxType('IPD')} className={`flex-1 py-1.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${fluxType === 'IPD' ? 'bg-white shadow-md text-rose-500' : 'text-muted'}`}>Inpatient</button>
                        </div>

                        <div className="relative group cursor-pointer active:scale-95 transition-transform" onClick={() => setFluxType(fluxType === 'OPD' ? 'IPD' : 'OPD')}>
                           <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full border-[8px] sm:border-[12px] border-primary-theme/10 flex items-center justify-center relative shadow-inner transition-all duration-700 ${fluxType === 'IPD' ? 'border-rose-500/10' : ''}`}>
                              <div className="text-center transition-all duration-500">
                                 <p className={`text-2xl sm:text-4xl font-black tracking-tighter ${fluxType === 'IPD' ? 'text-rose-500' : 'text-foreground'}`}>{displayPercentage || 0}%</p>
                                 <p className="text-[8px] sm:text-[9px] font-black text-muted uppercase">{fluxType} CAP</p>
                              </div>
                              <svg className="absolute inset-0 w-full h-full -rotate-90">
                                 <circle cx={typeof window !== 'undefined' && window.innerWidth < 640 ? "56" : "72"} cy={typeof window !== 'undefined' && window.innerWidth < 640 ? "56" : "72"} r={typeof window !== 'undefined' && window.innerWidth < 640 ? "48" : "66"} fill="none" stroke="currentColor" strokeWidth={typeof window !== 'undefined' && window.innerWidth < 640 ? "8" : "12"} className={`transition-all duration-1000 ${fluxType === 'IPD' ? 'text-rose-500' : 'text-primary-theme'}`} strokeDasharray={typeof window !== 'undefined' && window.innerWidth < 640 ? 301.5 : 415} strokeDashoffset={(typeof window !== 'undefined' && window.innerWidth < 640 ? 301.5 : 415) * (1 - (displayPercentage || 0) / 100)} strokeLinecap="round" />
                              </svg>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4 sm:space-y-6">
                        <DemographicBar label="Adult (18-45)" value={Math.round((distribution.adult / totalDemographics) * 100)} color="bg-primary-theme" />
                        <DemographicBar label="Senior (45+)" value={Math.round((distribution.senior / totalDemographics) * 100)} color="bg-rose-500" />
                        <DemographicBar label="Junior (0-17)" value={Math.round((distribution.junior / totalDemographics) * 100)} color="bg-emerald-500" />
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Distribution Models */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <CardModel title="Retention Profile" sub="New vs Returning patients" icon={<Users size={16} />} color="blue">
               <div className="h-[180px] sm:h-[220px]">
                  <DashboardCharts type="pie" data={registrationData} colors={['#3b82f6', '#10b981']} />
               </div>
            </CardModel>

            <CardModel title="Age Segments" sub="Distribution by age category" icon={<BarChart size={16} />} color="emerald">
               <div className="h-[180px] sm:h-[220px]">
                  <DashboardCharts type="bar" data={ageData} colors={['#10b981']} />
               </div>
            </CardModel>

            <CardModel title="Clinical Incidence" sub="Top recurring diagnoses" icon={<Layers size={16} />} color="blue">
               <div className="h-[180px] sm:h-[220px]">
                  <DashboardCharts type="line" data={diagnosisChartData} colors={['#3b82f6']} />
               </div>
            </CardModel>
         </div>

         {/* Detailed Clinical Distribution */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Top Diagnoses */}
            <div className="bg-white dark:bg-card p-4 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[2.5rem] border border-border-theme shadow-sm">
               <div className="flex items-center justify-between mb-6 sm:mb-8 pb-4 border-b border-border-theme">
                  <div>
                     <h3 className="text-base sm:text-xl font-black text-foreground uppercase tracking-tight italic">Disease Profile</h3>
                     <p className="text-[8px] sm:text-[10px] font-black text-muted uppercase tracking-widest mt-1">Top Recurring Clinical Conditions</p>
                  </div>
                  <BarChart className="text-muted" size={18} />
               </div>

               <div className="space-y-4 sm:space-y-8">
                  {diagnosisStats.length > 0 ? diagnosisStats.map((item, i) => (
                     <div key={i} className="flex items-center gap-3 sm:gap-6">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-secondary-theme flex items-center justify-center text-[9px] sm:text-[11px] font-black text-foreground shrink-0 border border-border-theme">
                           {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-center mb-1 sm:mb-2">
                              <span className="text-[10px] sm:text-sm font-black text-foreground uppercase tracking-tight truncate">{item.name}</span>
                              <span className="text-[8px] sm:text-[10px] font-black text-muted uppercase shrink-0">{item.count} Cases</span>
                           </div>
                           <div className="h-1.5 sm:h-2 bg-secondary-theme rounded-full overflow-hidden shadow-inner">
                              <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${(item.count / (diagnosisStats[0]?.count || 1)) * 100}%` }}></div>
                           </div>
                        </div>
                     </div>
                  )) : (
                     <div className="py-12 sm:py-20 text-center flex flex-col items-center gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-secondary-theme rounded-full flex items-center justify-center text-muted">
                           <TrendingUp size={24} className="sm:w-8 sm:h-8" />
                        </div>
                        <p className="text-[8px] sm:text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Insufficient Diagnosis Data</p>
                     </div>
                  )}
               </div>
            </div>

            {/* Pharmaco-Dynamics */}
            <div className="bg-white dark:bg-card p-4 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[2.5rem] border border-border-theme shadow-sm">
               <div className="flex items-center justify-between mb-6 sm:mb-8 pb-4 border-b border-border-theme">
                  <div>
                     <h3 className="text-base sm:text-xl font-black text-foreground uppercase tracking-tight italic">Pharmacology Insight</h3>
                     <p className="text-[8px] sm:text-[10px] font-black text-muted uppercase tracking-widest mt-1">Primary Medication Utilization</p>
                  </div>
                  <PieIcon className="text-muted" size={18} />
               </div>

               <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {topMedicines.length > 0 ? topMedicines.map((item, i) => (
                     <div key={i} className="flex items-center justify-between p-3 sm:p-6 bg-secondary-theme/20 rounded-xl sm:rounded-3xl border border-transparent hover:border-primary-theme transition-all group overflow-hidden">
                        <div className="flex items-center gap-3 sm:gap-4 truncate">
                           <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-white dark:bg-card flex items-center justify-center text-primary-theme shadow-sm group-hover:bg-primary-theme group-hover:text-white transition-all shrink-0">
                              <Activity size={16} className="sm:w-5 sm:h-5" />
                           </div>
                           <div className="truncate">
                              <p className="text-[10px] sm:text-sm font-black text-foreground uppercase tracking-tight truncate">{item.name}</p>
                              <p className="text-[8px] font-black text-muted uppercase tracking-tighter opacity-60">Clinical Standard Units</p>
                           </div>
                        </div>
                        <div className="text-right shrink-0">
                           <p className="text-sm sm:text-lg font-black text-foreground leading-none">{item.count}</p>
                           <p className="text-[7px] sm:text-[9px] font-black text-muted uppercase tracking-widest mt-1">Units Issued</p>
                        </div>
                     </div>
                  )) : (
                     <div className="py-12 sm:py-20 text-center flex flex-col items-center gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-secondary-theme rounded-full flex items-center justify-center text-muted">
                           <Sparkles size={24} className="sm:w-8 sm:h-8" />
                        </div>
                        <p className="text-[8px] sm:text-[10px] font-bold text-muted uppercase tracking-[0.2em]">No Medication Data Found</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
}

function CardModel({ title, sub, icon, color, children }: any) {
   return (
      <div className="bg-card rounded-2xl sm:rounded-3xl border border-border-theme p-4 sm:p-8 shadow-sm">
         <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className={`p-1.5 sm:p-2 rounded-lg bg-secondary-theme text-foreground`}>
               {React.cloneElement(icon as React.ReactElement<any>, { size: 18, className: 'sm:w-6 sm:h-6' })}
            </div>
            <div>
               <h4 className="text-xs sm:text-sm font-black text-foreground leading-none uppercase tracking-tight">{title}</h4>
               <p className="text-[8px] sm:text-[10px] font-black text-muted mt-1 uppercase tracking-widest opacity-60">{sub}</p>
            </div>
         </div>
         {children}
      </div>
   );
}

function DemographicBar({ label, value, color }: any) {
   return (
      <div className="space-y-1.5 sm:space-y-2">
         <div className="flex justify-between items-center text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
            <span className="text-muted italic">{label}</span>
            <span className="text-foreground">{value || 0}%</span>
         </div>
         <div className="h-1 sm:h-1.5 bg-secondary-theme rounded-full overflow-hidden shadow-inner">
            <div className={`h-full ${color} transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.1)]`} style={{ width: `${value || 0}%` }}></div>
         </div>
      </div>
   );
}

export default React.memo(AnalyticsPage);
