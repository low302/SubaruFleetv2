"use client";
import { useMotionValue, motion, useMotionTemplate } from "motion/react";
import { cn } from "../../lib/utils";

export const CardSpotlight = ({
    children,
    radius = 350,
    color = "#0a84ff30",
    className,
    onClick,
    ...props
}) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }) {
        let { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <div
            className={cn(
                "group/spotlight p-6 rounded-xl relative glass transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30 cursor-pointer",
                className
            )}
            onMouseMove={handleMouseMove}
            onClick={onClick}
            {...props}
        >
            <motion.div
                className="pointer-events-none absolute z-0 -inset-px rounded-xl opacity-0 transition duration-300 group-hover/spotlight:opacity-100"
                style={{
                    background: useMotionTemplate`
            radial-gradient(
              ${radius}px circle at ${mouseX}px ${mouseY}px,
              ${color},
              transparent 80%
            )
          `,
                }}
            />
            <div className="relative z-10">{children}</div>
        </div>
    );
};

export default CardSpotlight;
