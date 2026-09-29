import React from "react";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const FormInput: React.FC<FormInputProps> = ({ label, error, icon, className = "", ...props }) => {
  return (
    <div>
      <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>
        {label}
      </label>
    <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50">
            {icon}
          </div>
        )}
        <input
          className={`w-full p-2.5 rounded-xl border border-gray-300 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium ${icon ? 'pl-10' : ''} ${className}`}
          style={{
            backgroundColor: 'var(--bg-color)',
            color: 'var(--text-color)',
          }}
          autoComplete="off"
          {...props}
        />
      </div>
      {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-tight mt-1 ml-1">{error}</p>}
    </div>
  );
};

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({ label, options, error, className = "", ...props }) => {
  return (
    <div>
      <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>
        {label}
      </label>
      <select
        className={`w-full p-2.5 rounded-xl border border-gray-300 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium ${className}`}
        style={{
          backgroundColor: 'var(--bg-color)',
          color: 'var(--text-color)',
        }}
        {...props}
      >
        {options.map((option, index) => (
          <option key={`${option.value}-${index}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-tight mt-1 ml-1">{error}</p>}
    </div>
  );
};

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({ label, error, className = "", ...props }) => {
  return (
    <div>
      <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>
        {label}
      </label>
      <textarea
        className={`w-full p-2.5 rounded-xl border border-gray-300 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium resize-none ${className}`}
        style={{
          backgroundColor: 'var(--bg-color)',
          color: 'var(--text-color)',
        }}
        {...props}
      />
      {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-tight mt-1 ml-1">{error}</p>}
    </div>
  );
};
