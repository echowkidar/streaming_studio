import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  hoverEffect = false,
  glass = true,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/5 p-5 transition-all duration-300",
        glass ? "bg-surface-raised/70 backdrop-blur-md" : "bg-[#12121a]",
        hoverEffect && "hover:border-white/15 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn("flex items-center justify-between pb-4 border-b border-white/5", className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={cn("text-base font-semibold text-white tracking-tight", className)} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn("pt-4", className)} {...props}>
    {children}
  </div>
);
