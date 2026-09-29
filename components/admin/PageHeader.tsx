import React from "react";

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ icon, title, subtitle, action }) => {
  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <h1 className="text-lg md:text-xl lg:text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
          {icon}
          {title}
        </h1>
        {subtitle && (
          <p className="text-[7px] sm:text-[10px] font-medium uppercase tracking-widest mt-1" style={{ color: 'var(--secondary-color)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
