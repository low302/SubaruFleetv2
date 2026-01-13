import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * Required by Aceternity UI components
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
