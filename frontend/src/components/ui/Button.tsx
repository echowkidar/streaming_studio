import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "glass";
  size?: "default" | "sm" | "lg" | "icon" | "iconLg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      isLoading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary:
        "bg-gradient-primary text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110",
      secondary:
        "bg-surface-raised text-white border border-white/10 hover:bg-white/10",
      ghost: "hover:bg-white/10 text-slate-300 hover:text-white",
      danger:
        "bg-danger text-white shadow-lg shadow-rose-500/25 hover:bg-rose-600",
      success:
        "bg-success text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600",
      glass: "glass hover:bg-white/10 text-white",
    };

    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-lg px-3 text-xs",
      lg: "h-12 rounded-xl px-8 text-base",
      icon: "h-10 w-10 p-0 justify-center",
      iconLg: "h-14 w-14 rounded-2xl p-0 justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
