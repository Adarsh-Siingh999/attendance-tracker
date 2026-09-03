export function Badge({ children, variant = "neutral", className = "", size = "md" }) {
  const variantClasses = {
    success: "badge-success",
    danger: "badge-danger",
    warning: "badge-warning",
    primary: "badge-primary",
    neutral: "badge-neutral",
    purple: "badge-purple",
  }[variant] || "badge-neutral";

  const sizeClass = size === "sm" ? "badge-sm" : "badge-md";

  return (
    <span className={`saas-badge ${variantClasses} ${sizeClass} ${className}`}>
      {children}
    </span>
  );
}
