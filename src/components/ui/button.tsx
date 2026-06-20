import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-[10px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--theme-border)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      default:
        "border border-[color:var(--theme-border)] bg-[linear-gradient(135deg,var(--theme-default)_0%,var(--theme-dark)_100%)] text-white shadow-sm shadow-slate-950/10 hover:opacity-95",
      outline:
        "border border-[color:var(--ember-surface-border)] bg-transparent hover:bg-[color:var(--ember-surface-hover)]",
      ghost: "hover:bg-[color:var(--ember-surface-hover)]",
      destructive: "bg-red-600 text-white hover:bg-red-700",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 px-3",
      lg: "h-11 px-8",
      icon: "h-10 w-10",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
