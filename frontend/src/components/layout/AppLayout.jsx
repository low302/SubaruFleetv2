import { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
    LayoutDashboard,
    Car,
    Truck,
    Wrench,
    Clock,
    CalendarCheck,
    DollarSign,
    ArrowLeftRight,
    CreditCard,
    BarChart3,
    Settings,
    LogOut,
    Download,
    Upload,
    ChevronUp,
} from "lucide-react";
import { Sidebar, SidebarBody, SidebarLink } from "../ui/sidebar";
import { useAuth } from "../../context/AuthContext";
import ImportModal from "../modals/ImportModal";
import SystemSettingsModal from "../modals/SystemSettingsModal";
import { dataTransfer } from "../../services/api";

// Navigation sections matching original app
const navSections = [
    {
        title: "Main",
        links: [
            {
                label: "Dashboard",
                href: "/",
                icon: <LayoutDashboard className="h-5 w-5" />,
            },
            {
                label: "Inventory",
                href: "/inventory",
                icon: <Car className="h-5 w-5" />,
            },
        ],
    },
    {
        title: "Status",
        links: [
            {
                label: "In-Transit",
                href: "/in-transit",
                icon: <Truck className="h-5 w-5" />,
            },
            {
                label: "PDI",
                href: "/pdi",
                icon: <Wrench className="h-5 w-5" />,
            },
            {
                label: "Pending Pickup",
                href: "/pending-pickup",
                icon: <Clock className="h-5 w-5" />,
            },
            {
                label: "Pickup Scheduled",
                href: "/pickup-scheduled",
                icon: <CalendarCheck className="h-5 w-5" />,
            },
            {
                label: "Sold Vehicles",
                href: "/sold",
                icon: <DollarSign className="h-5 w-5" />,
            },
        ],
    },
    {
        title: "Other",
        links: [
            {
                label: "Trade-Ins",
                href: "/tradeins",
                icon: <ArrowLeftRight className="h-5 w-5" />,
            },
            {
                label: "Payments",
                href: "/payments",
                icon: <CreditCard className="h-5 w-5" />,
            },
            {
                label: "Analytics",
                href: "/analytics",
                icon: <BarChart3 className="h-5 w-5" />,
            },
        ],
    },
];

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setUserDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const handleExport = async () => {
        try {
            const data = await dataTransfer.exportAll();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fleet-inventory-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        }
    };

    const handleImportSuccess = () => {
        // Refresh the current page data by navigating to the same route
        navigate(location.pathname, { replace: true });
        window.location.reload();
    };

    const handleOpenSettings = () => {
        setUserDropdownOpen(false);
        setSettingsModalOpen(true);
    };

    return (
        <div className="flex h-screen bg-app-gradient overflow-hidden">
            <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        {/* Brand */}
                        <motion.div
                            className="flex items-center gap-3 px-2 py-3 mb-4 border-b border-slate-700/50"
                            animate={{ opacity: sidebarOpen ? 1 : 0.8 }}
                        >
                            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                                FI
                            </div>
                            <motion.span
                                className="text-lg font-bold text-primary whitespace-pre"
                                animate={{
                                    display: sidebarOpen ? "inline-block" : "none",
                                    opacity: sidebarOpen ? 1 : 0,
                                }}
                            >
                                Fleet Inventory
                            </motion.span>
                        </motion.div>

                        {/* Navigation Sections */}
                        {navSections.map((section) => (
                            <div key={section.title} className="mb-4">
                                <motion.div
                                    className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                                    animate={{
                                        display: sidebarOpen ? "block" : "none",
                                        opacity: sidebarOpen ? 1 : 0,
                                    }}
                                >
                                    {section.title}
                                </motion.div>
                                <nav className="flex flex-col gap-0.5">
                                    {section.links.map((link) => (
                                        <SidebarLink key={link.href} link={link} />
                                    ))}
                                </nav>
                            </div>
                        ))}

                        {/* Data Section (Import/Export) */}
                        <div className="mb-4">
                            <motion.div
                                className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                                animate={{
                                    display: sidebarOpen ? "block" : "none",
                                    opacity: sidebarOpen ? 1 : 0,
                                }}
                            >
                                Data
                            </motion.div>
                            <nav className="flex flex-col gap-0.5">
                                <button
                                    onClick={() => setImportModalOpen(true)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                                >
                                    <Upload className="h-5 w-5 shrink-0" />
                                    <motion.span
                                        className="text-sm font-medium whitespace-pre"
                                        animate={{
                                            display: sidebarOpen ? "inline-block" : "none",
                                            opacity: sidebarOpen ? 1 : 0,
                                        }}
                                    >
                                        Import Data
                                    </motion.span>
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                                >
                                    <Download className="h-5 w-5 shrink-0" />
                                    <motion.span
                                        className="text-sm font-medium whitespace-pre"
                                        animate={{
                                            display: sidebarOpen ? "inline-block" : "none",
                                            opacity: sidebarOpen ? 1 : 0,
                                        }}
                                    >
                                        Export Data
                                    </motion.span>
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* User Section */}
                    <div className="border-t border-slate-700/50 pt-4 relative" ref={dropdownRef}>
                        {/* User Dropdown Menu */}
                        <AnimatePresence>
                            {userDropdownOpen && sidebarOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full left-0 right-0 mb-2 mx-2 bg-slate-800 border border-slate-600/50 rounded-lg shadow-lg overflow-hidden z-50"
                                >
                                    <button
                                        onClick={handleOpenSettings}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-colors"
                                    >
                                        <span>⚙️</span>
                                        System Settings
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* User Info - Clickable */}
                        <div
                            className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-slate-700/30 rounded-lg transition-colors"
                            onClick={() => sidebarOpen && setUserDropdownOpen(!userDropdownOpen)}
                        >
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                {user?.username?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <motion.div
                                className="flex-1 min-w-0 flex items-center justify-between"
                                animate={{
                                    display: sidebarOpen ? "flex" : "none",
                                    opacity: sidebarOpen ? 1 : 0,
                                }}
                            >
                                <div>
                                    <p className="text-sm font-medium text-slate-200 truncate">
                                        {user?.username || "User"}
                                    </p>
                                    <p className="text-xs text-slate-500">Administrator</p>
                                </div>
                                <ChevronUp
                                    className={`h-4 w-4 text-slate-400 transition-transform ${userDropdownOpen ? '' : 'rotate-180'}`}
                                />
                            </motion.div>
                        </div>

                        {/* Sign Out Button */}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                        >
                            <LogOut className="h-5 w-5 shrink-0" />
                            <motion.span
                                className="text-sm font-medium whitespace-pre"
                                animate={{
                                    display: sidebarOpen ? "inline-block" : "none",
                                    opacity: sidebarOpen ? 1 : 0,
                                }}
                            >
                                Sign Out
                            </motion.span>
                        </button>
                    </div>
                </SidebarBody>
            </Sidebar>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>

            {/* Import Modal */}
            <ImportModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImportSuccess={handleImportSuccess}
            />

            {/* System Settings Modal */}
            <SystemSettingsModal
                isOpen={settingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
            />
        </div>
    );
}

