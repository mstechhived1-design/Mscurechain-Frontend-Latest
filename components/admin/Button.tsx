import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  icon,
  loading,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses = "px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2";
  
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50",
    danger: "bg-red-600 hover:bg-red-700 text-white disabled:opacity-50",
    ghost: "hover:bg-gray-100 dark:hover:bg-gray-800",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Loading...
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
};
