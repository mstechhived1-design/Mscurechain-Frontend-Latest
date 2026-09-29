// ✅ OPTIMIZATION: Separate chart components for code splitting
// These can be dynamically imported to reduce initial bundle size

import React from 'react';
import { 
  PieChart as RechartsPie, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface AttendancePieChartProps {
  data: Array<{ name: string; value: number }>;
  colors: string[];
  centerValue?: number;
  centerLabel?: string;
}

export const AttendancePieChart = React.memo<AttendancePieChartProps>(({ 
  data, 
  colors, 
  centerValue, 
  centerLabel 
}) => {
  return (
    <div className="h-[200px] w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPie>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={75}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              borderRadius: '8px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
            }}
          />
        </RechartsPie>
      </ResponsiveContainer>
      {centerValue !== undefined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{centerValue}</span>
          {centerLabel && (
            <span className="text-xs text-gray-500 font-medium">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
});

AttendancePieChart.displayName = 'AttendancePieChart';

export default AttendancePieChart;
