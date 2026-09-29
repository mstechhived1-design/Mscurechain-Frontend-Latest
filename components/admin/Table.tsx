import React from "react";

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  responsive?: boolean;
}

export const Table: React.FC<TableProps> = ({ headers, children, responsive = true }) => {
  return (
    <div
      className="rounded-xl border overflow-hidden w-full"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--border-color)'
      }}
    >
      {responsive ? (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left" style={{ color: 'var(--text-color)' }}>
            <thead
              className="uppercase text-xs"
              style={{
                backgroundColor: 'var(--bg-color)',
                color: 'var(--secondary-color)'
              }}
            >
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="px-4 md:px-6 py-3">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {children}
            </tbody>
          </table>
        </div>
      ) : (
        <table className="w-full text-left" style={{ color: 'var(--text-color)' }}>
          <thead
            className="uppercase text-xs"
            style={{
              backgroundColor: 'var(--bg-color)',
              color: 'var(--secondary-color)'
            }}
          >
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="px-6 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className="divide-y"
            style={{ borderColor: 'var(--border-color)' }}
          >
            {children}
          </tbody>
        </table>
      )}
    </div>
  );
};

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, icon, action }) => {
  return (
    <div className="p-12 text-center" style={{ color: 'var(--secondary-color)' }}>
      {icon && <div className="mb-4 flex justify-center opacity-50">{icon}</div>}
      <p>{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
