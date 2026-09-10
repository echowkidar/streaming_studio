import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "live" | "recording" | "success" | "warning" | "danger" | "neutral" | "purple";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}) => {
  const variants = {
    default: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    live: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse font-bold tracking-wider",
    recording: "bg-rose-500/15 text-rose-400 border-rose-500/30 font-medium",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    neutral: "bg-white/5 text-slate-300 border-white/10",
    purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  };

  const sizes = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {variant === "live" && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
      {variant === "recording" && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
      {children}
    </span>
  );
};
