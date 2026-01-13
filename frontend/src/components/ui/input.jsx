import { cn } from "../../lib/utils";
import { forwardRef } from "react";

export const Input = forwardRef(({ className, type, label, error, ...props }, ref) => {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-semibold text-slate-200">
                    {label}
                </label>
            )}
            <input
                type={type}
                className={cn(
                    "w-full px-3.5 py-2.5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500",
                    "bg-slate-800/50 backdrop-blur-sm border border-slate-600/50",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                    "hover:border-primary/40 hover:bg-slate-700/50",
                    "transition-all duration-200",
                    error && "border-danger focus:ring-danger/50",
                    className
                )}
                ref={ref}
                {...props}
            />
            {error && (
                <p className="text-xs text-danger">{error}</p>
            )}
        </div>
    );
});
Input.displayName = "Input";

export const Select = forwardRef(({ className, label, error, children, options, ...props }, ref) => {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-semibold text-slate-200">
                    {label}
                </label>
            )}
            <select
                className={cn(
                    "w-full px-3.5 py-2.5 rounded-lg text-sm text-slate-200",
                    "bg-slate-800/50 backdrop-blur-sm border border-slate-600/50",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                    "hover:border-primary/40 hover:bg-slate-700/50",
                    "transition-all duration-200",
                    error && "border-danger focus:ring-danger/50",
                    className
                )}
                ref={ref}
                {...props}
            >
                {options ? options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                )) : children}
            </select>
            {error && (
                <p className="text-xs text-danger">{error}</p>
            )}
        </div>
    );
});
Select.displayName = "Select";

export const Textarea = forwardRef(({ className, label, error, ...props }, ref) => {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-semibold text-slate-200">
                    {label}
                </label>
            )}
            <textarea
                className={cn(
                    "w-full px-3.5 py-2.5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500",
                    "bg-slate-800/50 backdrop-blur-sm border border-slate-600/50",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                    "hover:border-primary/40 hover:bg-slate-700/50",
                    "transition-all duration-200 resize-none",
                    error && "border-danger focus:ring-danger/50",
                    className
                )}
                ref={ref}
                {...props}
            />
            {error && (
                <p className="text-xs text-danger">{error}</p>
            )}
        </div>
    );
});
Textarea.displayName = "Textarea";

export const FormRow = ({ children, className }) => {
    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
            {children}
        </div>
    );
};

export default Input;
