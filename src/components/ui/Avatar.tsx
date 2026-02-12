import { User } from "lucide-react";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Avatar({
  src,
  name,
  size = "md",
  className = "",
}: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={`rounded-full object-cover ${sizeStyles[size]} ${className}`}
      />
    );
  }

  if (name) {
    return (
      <div
        className={`rounded-full bg-primary-light text-primary font-medium flex items-center justify-center ${sizeStyles[size]} ${className}`}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div
      className={`rounded-full bg-gray-100 text-gray-400 flex items-center justify-center ${sizeStyles[size]} ${className}`}
    >
      <User className="h-1/2 w-1/2" />
    </div>
  );
}
