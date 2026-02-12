type BadgeVariant =
  | "default"
  | "primary"
  | "accent"
  | "danger"
  | "warning"
  | "success";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  primary: "bg-primary-light text-primary",
  accent: "bg-accent-light text-accent",
  danger: "bg-danger-light text-danger",
  warning: "bg-warning-light text-warning",
  success: "bg-success-light text-success",
};

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
