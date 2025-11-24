import { cn } from "@/lib/utils";

interface OnboardingProgressIndicatorProps {
  percentage: number;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
}

export const OnboardingProgressIndicator = ({
  percentage,
  size = "medium",
  showLabel = true,
}: OnboardingProgressIndicatorProps) => {
  const sizeClasses = {
    small: "w-12 h-12",
    medium: "w-20 h-20",
    large: "w-32 h-32",
  };

  const textSizeClasses = {
    small: "text-xs",
    medium: "text-base",
    large: "text-2xl",
  };

  // Color based on completion percentage
  const getColor = () => {
    if (percentage === 100) return "text-success";
    if (percentage >= 67) return "text-primary";
    if (percentage >= 34) return "text-warning";
    return "text-accent";
  };

  const getStrokeColor = () => {
    if (percentage === 100) return "hsl(var(--success))";
    if (percentage >= 67) return "hsl(var(--primary))";
    if (percentage >= 34) return "hsl(var(--warning))";
    return "hsl(var(--accent))";
  };

  const radius = size === "small" ? 20 : size === "medium" ? 32 : 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("relative", sizeClasses[size])}>
        <svg
          className="transform -rotate-90"
          width="100%"
          height="100%"
          viewBox={`0 0 ${radius * 2 + 8} ${radius * 2 + 8}`}
        >
          {/* Background circle */}
          <circle
            cx={radius + 4}
            cy={radius + 4}
            r={radius}
            stroke="hsl(var(--border))"
            strokeWidth="4"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={radius + 4}
            cy={radius + 4}
            r={radius}
            stroke={getStrokeColor()}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", getColor(), textSizeClasses[size])}>
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      {showLabel && (
        <p className="text-xs text-muted-foreground text-center">
          {percentage === 100 ? "Complete!" : "Setup Progress"}
        </p>
      )}
    </div>
  );
};
