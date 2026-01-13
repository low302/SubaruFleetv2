"use client";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export const MovingBorder = ({
    children,
    duration = 2000,
    className,
    containerClassName,
    borderRadius = "1rem",
    as: Component = "button",
    ...otherProps
}) => {
    return (
        <Component
            className={cn(
                "relative p-[1px] overflow-hidden",
                containerClassName
            )}
            style={{ borderRadius }}
            {...otherProps}
        >
            <div
                className="absolute inset-0"
                style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
            >
                <MovingBorderGradient duration={duration} />
            </div>
            <div
                className={cn(
                    "relative flex items-center justify-center w-full h-full text-sm antialiased",
                    className
                )}
                style={{
                    borderRadius: `calc(${borderRadius} * 0.96)`,
                }}
            >
                {children}
            </div>
        </Component>
    );
};

const MovingBorderGradient = ({ duration }) => {
    return (
        <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{
                duration: duration / 1000,
                repeat: Infinity,
                ease: "linear",
            }}
            style={{
                position: "absolute",
                inset: "-100%",
                background: `conic-gradient(from 0deg, transparent 0deg, #0a84ff 60deg, transparent 120deg)`,
            }}
        />
    );
};

export const Button = ({ children, className, variant = "primary", size = "md", ...props }) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 rounded-lg relative overflow-hidden";

    const variants = {
        primary: "bg-gradient-to-r from-primary to-primary-600 text-white shadow-md shadow-primary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/40",
        secondary: "glass text-slate-200 hover:bg-slate-700/70 hover:-translate-y-0.5",
        danger: "bg-gradient-to-r from-danger to-red-700 text-white shadow-md shadow-danger/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-danger/40",
        ghost: "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2.5 text-sm",
        lg: "px-6 py-3 text-base",
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        >
            {children}
        </button>
    );
};

export const MovingBorderButton = ({ children, className, ...props }) => {
    return (
        <MovingBorder
            duration={3000}
            className="bg-slate-900 text-slate-100 px-6 py-3 font-semibold"
            containerClassName={className}
            {...props}
        >
            {children}
        </MovingBorder>
    );
};

export default Button;
