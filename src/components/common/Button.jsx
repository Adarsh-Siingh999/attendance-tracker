export function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  className = "",
  icon = null,
}) {
  const variantClass = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
    ghost: "btn-ghost",
    outline: "btn-outline",
    success: "btn-success",
  }[variant] || "btn-primary";

  const sizeClass = {
    sm: "btn-sm",
    md: "btn-md",
    lg: "btn-lg",
  }[size] || "btn-md";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`saas-btn ${variantClass} ${sizeClass} ${className}`}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
