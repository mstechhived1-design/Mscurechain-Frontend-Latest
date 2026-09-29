import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "default";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "default", className = "" }) => {
  const variantClasses = {
    success: "bg-green-500/10 text-green-500 border-green-500/30",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
    danger: "bg-red-500/10 text-red-500 border-red-500/30",
    info: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    default: "bg-gray-500/10 text-gray-500 border-gray-500/30"
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const getStatusVariant = (status: string | undefined | null): "success" | "warning" | "danger" | "info" | "default" => {
  if (!status) return "default";
  const lowerStatus = status.toLowerCase();
  
  if (lowerStatus.includes("open") || lowerStatus.includes("pending")) return "warning";
  if (lowerStatus.includes("progress")) return "info";
  if (lowerStatus.includes("resolved") || lowerStatus.includes("completed") || lowerStatus.includes("success") || lowerStatus.includes("active")) return "success";
  if (lowerStatus.includes("failed") || lowerStatus.includes("error") || lowerStatus.includes("inactive") || lowerStatus.includes("blocked")) return "danger";
  
  return "default";
};
