"use client";
import { cn } from "../../lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useRef, useState } from "react";
import { X } from "lucide-react";

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
    const [open, setOpen] = useState(false);

    return (
        <ModalContext.Provider value={{ open, setOpen }}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error("useModal must be used within a ModalProvider");
    }
    return context;
};

export function Modal({ children }) {
    return <ModalProvider>{children}</ModalProvider>;
}

export const ModalTrigger = ({ children, className }) => {
    const { setOpen } = useModal();
    return (
        <button
            className={cn(
                "relative overflow-hidden rounded-md text-center",
                className
            )}
            onClick={() => setOpen(true)}
        >
            {children}
        </button>
    );
};

export const ModalBody = ({ children, className }) => {
    const { open, setOpen } = useModal();
    const modalRef = useRef(null);

    // Close on escape key
    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 h-full w-full flex items-center justify-center z-50"
                    onKeyDown={handleKeyDown}
                >
                    <Overlay />
                    <motion.div
                        ref={modalRef}
                        className={cn(
                            "min-h-[50%] max-h-[90%] md:max-w-[40%] glass-strong md:rounded-2xl relative z-50 flex flex-col flex-1 overflow-hidden",
                            className
                        )}
                        initial={{ opacity: 0, scale: 0.5, rotateX: 40, y: 40 }}
                        animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, rotateX: 10 }}
                        transition={{ type: "spring", stiffness: 260, damping: 15 }}
                    >
                        <CloseIcon />
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export const ModalContent = ({ children, className }) => {
    return (
        <div className={cn("flex flex-col flex-1 p-8 md:p-10", className)}>
            {children}
        </div>
    );
};

export const ModalFooter = ({ children, className }) => {
    return (
        <div
            className={cn(
                "flex justify-end p-4 bg-slate-800/50 border-t border-slate-700",
                className
            )}
        >
            {children}
        </div>
    );
};

const Overlay = ({ className }) => {
    const { setOpen } = useModal();
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
                "fixed inset-0 h-full w-full bg-black/60 backdrop-blur-sm z-40",
                className
            )}
            onClick={() => setOpen(false)}
        />
    );
};

const CloseIcon = () => {
    const { setOpen } = useModal();
    return (
        <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
        >
            <X className="h-5 w-5" />
        </button>
    );
};

// Utility component for simple modal usage
export function SimpleModal({ isOpen, onClose, title, children, footer }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 h-full w-full flex items-center justify-center z-50"
                >
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 h-full w-full bg-black/60 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="w-full max-w-2xl max-h-[90vh] glass-strong rounded-2xl relative z-50 flex flex-col overflow-hidden mx-4"
                        initial={{ opacity: 0, scale: 0.5, rotateX: 40, y: 40 }}
                        animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, rotateX: 10 }}
                        transition={{ type: "spring", stiffness: 260, damping: 15 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6">{children}</div>

                        {/* Footer */}
                        {footer && (
                            <div className="flex justify-end gap-3 p-4 bg-slate-800/50 border-t border-slate-700">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
