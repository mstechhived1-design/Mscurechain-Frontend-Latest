import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  title?: string;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = "", padding = "p-6 md:p-8", title, icon, extra }) => {
  return (
    <div
      className={`rounded-xl border ${padding} ${className}`}
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--border-color)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
    >
      {title && (
        <div
          className="flex items-center justify-between mb-4 pb-2 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h3
            className="text-lg font-bold flex items-center gap-2"
            style={{ color: 'var(--text-color)' }}
          >
            {icon && <span className="inline-flex">{icon}</span>}
            {title}
          </h3>
          {extra && <div className="flex items-center">{extra}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

interface CardSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const CardSection: React.FC<CardSectionProps> = ({ title, children, className = "" }) => {
  return (
    <div className={className}>
      <h3
        className="text-lg font-semibold border-b pb-2 mb-4"
        style={{
          color: 'var(--text-color)',
          borderColor: 'var(--border-color)'
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
};
