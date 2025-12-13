import { cn } from "../utils";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-4",
};

export function Loading({ size = "md", className }: LoadingProps) {
  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={cn(
          "animate-spin rounded-full border-gray-300 border-t-gray-800",
          sizeClasses[size],
          className
        )}
      />
    </div>
  );
}
