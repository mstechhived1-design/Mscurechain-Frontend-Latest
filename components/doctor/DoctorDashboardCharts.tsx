'use client';

import React from 'react';

import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(() => import('@/components/doctor/DashboardCharts'), { ssr: false });

function DoctorDashboardCharts({ type, data }: { type: string; data?: any[] }) {
  // @ts-ignore - Dynamic import typing issue
  return <DashboardCharts type={type} data={data} />;
}

export default React.memo(DoctorDashboardCharts);
