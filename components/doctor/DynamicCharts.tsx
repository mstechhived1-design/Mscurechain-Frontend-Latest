import React from 'react';
'use client';

import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(() => import('./DashboardCharts'), { ssr: false });

interface DynamicChartsProps {
    type: 'area' | 'pie';
    data?: any[];
}

function DynamicCharts({ type, data }: DynamicChartsProps) {
    return <DashboardCharts type={type} data={data} />;
}

export default React.memo(DynamicCharts);
