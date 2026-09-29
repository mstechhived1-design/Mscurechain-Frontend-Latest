'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';

interface DashboardChartsProps {
  type: 'area' | 'bar' | 'pie' | 'line';
  data?: any[];
  colors?: string[];
}

function DashboardCharts({ type, data = [], colors = ['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b'] }: DashboardChartsProps) {
  // Fallback if no data provided
  const chartData = data.length > 0 ? data : [
    { name: 'A', value: 0 },
    { name: 'B', value: 0 },
    { name: 'C', value: 0 },
  ];

  const commonTooltip = (
    <Tooltip
      contentStyle={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-theme)',
        borderRadius: '12px',
        padding: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      }}
      itemStyle={{
        fontSize: '12px',
        fontWeight: 700,
      }}
      labelStyle={{
        fontSize: '10px',
        fontWeight: 600,
        color: '#64748b',
        marginBottom: '4px',
        textTransform: 'uppercase',
      }}
    />
  );

  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-theme)" opacity={0.5} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--muted)' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--muted)' }}
          />
          {commonTooltip}
          <Area
            type="monotone"
            dataKey="count"
            stroke={colors[0]}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorValue)"
            activeDot={{ r: 6, fill: '#fff', stroke: colors[0], strokeWidth: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-theme)" opacity={0.5} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--muted)' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--muted)' }}
          />
          {commonTooltip}
          <Bar 
            dataKey="count" 
            fill={colors[0]} 
            radius={[4, 4, 0, 0]} 
            barSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          {commonTooltip}
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-theme)" opacity={0.5} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--muted)' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--muted)' }}
          />
          {commonTooltip}
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke={colors[0]} 
            strokeWidth={3} 
            dot={{ r: 4, fill: colors[0], strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

export default React.memo(DashboardCharts);
