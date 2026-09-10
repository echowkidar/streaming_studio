import React, { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, icon, isPassword, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const actualType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            type={actualType}
            className={cn(
              "w-full h-10 px-3.5 text-sm rounded-xl bg-surface-raised/80 border border-white/10 text-white placeholder:text-slate-500",
              "focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200",
              icon && "pl-10",
              isPassword && "pr-10",
              error && "border-rose-500/70 focus:ring-rose-500/20",
              className
            )}
            ref={ref}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-slate-400 hover:text-slate-200 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
