import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-[#2563EB] shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]",
        secondary:
          "bg-transparent text-text-primary border border-surface-stroke hover:bg-surface-elevated hover:border-outline-variant",
        ghost:
          "text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
        tertiary:
          "bg-surface-container text-text-primary border border-surface-stroke hover:bg-surface-container-high",
      },
      size: {
        sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
        md: "h-10 px-4 text-sm gap-2 rounded-md",
        lg: "h-12 px-6 text-base gap-2.5 rounded-lg",
        icon: "h-8 w-8 rounded-full",
        "icon-md": "h-10 w-10 rounded-full",
      },
      shape: {
        default: "",
        pill: "rounded-full",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      shape: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, shape, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  radius?: "sm" | "md" | "lg" | "xl";
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, radius = "md", ...props }, ref) => {
    const radiusMap = {
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
    } as const;
    return (
      <div
        ref={ref}
        className={cn(
          "bg-surface-elevated border border-surface-stroke p-6",
          radiusMap[radius],
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-base font-semibold text-text-primary font-[Geist] tracking-[-0.01em]",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-sm text-text-secondary leading-6", className)} {...props} />
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "mastered" | "learning" | "weak" | "not_started" | "default" | "accent";
  shape?: "micro" | "pill";
}

const badgeStyles: Record<string, string> = {
  mastered: "bg-mastery-mastered/12 text-mastery-mastered border-mastery-mastered/20",
  learning: "bg-mastery-learning/12 text-mastery-learning border-mastery-learning/20",
  weak: "bg-mastery-weak/12 text-mastery-weak border-mastery-weak/20",
  not_started: "bg-mastery-not-started/12 text-mastery-not-started border-mastery-not-started/20",
  default: "bg-surface-container text-on-surface-variant border-surface-stroke",
  accent: "bg-primary/10 text-primary border-primary/20",
};

export function Badge({
  variant = "not_started",
  shape = "micro",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold border tracking-wide",
        shape === "micro" ? "rounded-sm" : "rounded-full",
        badgeStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  thickness?: "sm" | "md";
  track?: "surface" | "container";
}

export function Progress({
  value,
  max = 100,
  className,
  thickness = "md",
  track = "surface",
}: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "w-full rounded-full overflow-hidden",
          thickness === "md" ? "h-2" : "h-1",
          track === "container" ? "bg-surface-container" : "bg-surface-stroke/60"
        )}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-elevated", className)}
      {...props}
    />
  );
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full bg-surface-base border border-surface-stroke rounded-md px-4 text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full bg-surface-base border border-surface-stroke rounded-md px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-all duration-200",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span
        className="material-symbols-outlined text-[32px] text-text-secondary mb-4"
        aria-hidden="true"
      >
        {icon}
      </span>
      <p className="text-sm font-semibold text-text-primary mb-1 font-[Geist]">{title}</p>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm leading-6">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
      <span
        className="material-symbols-outlined text-[24px] text-destructive mx-auto mb-3 block"
        aria-hidden="true"
      >
        error
      </span>
      <p className="text-sm text-destructive mb-4 font-medium">{message}</p>
      {onRetry && (
        <Button variant="destructive" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-[18px] h-[18px] items-center justify-center px-1.5 rounded-sm",
        "bg-surface-container border border-surface-stroke text-[10px] font-[JetBrains_Mono] text-text-secondary",
        "shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]",
        className
      )}
    >
      {children}
    </kbd>
  );
}
