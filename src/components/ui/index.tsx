import * as React from "react";
import { cn } from "@/lib/utils";

// ==================== BUTTON ====================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";
    const variants = {
      primary: "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0",
      secondary: "bg-white/[0.05] text-[var(--text-primary)] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15] hover:-translate-y-0.5",
      ghost: "text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.06]",
      danger: "bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-500/20 hover:shadow-red-500/35 hover:-translate-y-0.5",
      success: "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:-translate-y-0.5",
    };
    const sizes = {
      sm: "px-4 py-2 text-sm gap-1.5",
      md: "px-6 py-2.5 text-sm gap-2",
      lg: "px-8 py-3.5 text-base gap-2.5",
    };
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
    );
  }
);
Button.displayName = "Button";

// ==================== CARD ====================
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  glow?: "brand" | "success" | "warning" | "danger";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, glow, ...props }, ref) => {
    const glowMap = {
      brand: "hover:shadow-[var(--shadow-glow)]",
      success: "hover:shadow-[var(--shadow-glow-success)]",
      warning: "hover:shadow-[var(--shadow-glow-warning)]",
      danger: "hover:shadow-[var(--shadow-glow-danger)]",
    };
    return (
      <div
        ref={ref}
        className={cn(
          "card",
          interactive && "card-interactive",
          glow && glowMap[glow],
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

// ==================== BADGE ====================
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "mastered" | "learning" | "weak" | "not_started" | "default";
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  const variantMap: Record<string, string> = {
    mastered: "badge-mastered",
    learning: "badge-learning",
    weak: "badge-weak",
    not_started: "badge-not-started",
    default: "bg-white/[0.06] text-[var(--text-secondary)] border border-white/[0.08]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide",
        variantMap[variant],
        className
      )}
      {...props}
    />
  );
}

// ==================== PROGRESS BAR ====================
interface ProgressProps {
  value: number;
  max?: number;
  variant?: "brand" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function Progress({ value, max = 100, variant = "brand", size = "md", showLabel, className }: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const gradients = {
    brand: "bg-gradient-to-r from-indigo-500 to-indigo-400",
    success: "bg-gradient-to-r from-emerald-500 to-emerald-400",
    warning: "bg-gradient-to-r from-amber-500 to-amber-400",
    danger: "bg-gradient-to-r from-red-500 to-red-400",
  };
  const heights = { sm: "h-1", md: "h-2", lg: "h-3" };

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full bg-white/[0.06] rounded-full overflow-hidden", heights[size])} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", gradients[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-[var(--text-tertiary)] mt-1.5 font-mono">{Math.round(pct)}%</p>
      )}
    </div>
  );
}

// ==================== SKELETON ====================
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-white/[0.06]", className)} {...props} />
  );
}
