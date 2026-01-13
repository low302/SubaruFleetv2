import { cn } from "../../lib/utils";

const badgeVariants = {
    "in-stock": "bg-primary/15 text-primary border-primary/20",
    "in-transit": "bg-warning/15 text-warning border-warning/20",
    "pdi": "bg-purple-500/15 text-purple-500 border-purple-500/20",
    "pending-pickup": "bg-warning/15 text-amber-600 border-warning/20",
    "pickup-scheduled": "bg-success/15 text-success border-success/20",
    "sold": "bg-success/15 text-success border-success/20",
    default: "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

// Maps status value to display label
const statusLabels = {
    "in-stock": "In Stock",
    "in-transit": "In-Transit",
    "pdi": "PDI",
    "pending-pickup": "Pending Pickup",
    "pickup-scheduled": "Pickup Scheduled",
    "sold": "Sold",
};

export function Badge({ children, variant = "default", className }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm transition-transform hover:scale-105",
                badgeVariants[variant] || badgeVariants.default,
                className
            )}
        >
            {children}
        </span>
    );
}

export function StatusBadge({ status }) {
    // Normalize status to lowercase kebab-case for matching
    const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '-') || '';
    const label = statusLabels[normalizedStatus] || status || 'Unknown';
    const variant = badgeVariants[normalizedStatus] ? normalizedStatus : 'default';

    return <Badge variant={variant}>{label}</Badge>;
}

export default Badge;
