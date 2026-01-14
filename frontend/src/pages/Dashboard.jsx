import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
    Package, Truck, DollarSign, ArrowLeftRight, Clock, Calendar,
    TrendingUp, ChevronRight, Sparkles, CalendarDays
} from "lucide-react";
import { StatusBadge } from "../components/ui/badge";
import { inventory, soldVehicles, tradeIns } from "../services/api";
import VehicleDetailModal from "../components/modals/VehicleDetailModal";
import WeeklySalesModal from "../components/modals/WeeklySalesModal";
import DashboardCalendar from "../components/DashboardCalendar";

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ inStock: 0, inTransit: 0, sold: 0, tradeIns: 0 });
    const [pendingPickups, setPendingPickups] = useState([]);
    const [scheduledPickups, setScheduledPickups] = useState([]);
    const [weeklySales, setWeeklySales] = useState([]);
    const [weeklySalesDateRange, setWeeklySalesDateRange] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [weeklySalesModalOpen, setWeeklySalesModalOpen] = useState(false);

    useEffect(() => { loadDashboardData(); }, []);

    const loadDashboardData = async () => {
        try {
            setIsLoading(true);
            const [inventoryData, soldData, tradeInsData] = await Promise.all([
                inventory.getAll(), soldVehicles.getAll(), tradeIns.getAll(),
            ]);

            const inStockStatuses = ['in-stock', 'pdi', 'pending-pickup', 'pickup-scheduled'];
            const inStock = inventoryData.filter((v) => inStockStatuses.includes(v.status)).length;
            const inTransit = inventoryData.filter((v) => v.status === "in-transit").length;
            const pending = inventoryData.filter((v) => v.status === "pending-pickup");
            const scheduled = inventoryData.filter((v) => v.status === "pickup-scheduled");

            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            const weekSales = soldData.filter((v) => {
                const saleDate = v.customer?.saleDate ? new Date(v.customer.saleDate) : new Date(v.created_at);
                return saleDate >= startOfWeek && saleDate <= endOfWeek;
            }).slice(0, 10);

            const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            setWeeklySalesDateRange(`${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`);

            setStats({ inStock, inTransit, sold: soldData.length, tradeIns: tradeInsData.length });
            setPendingPickups(pending);
            setScheduledPickups(scheduled);
            setWeeklySales(weekSales);
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const statCards = [
        { label: "In Stock", value: stats.inStock, icon: Package, gradient: "from-blue-500 to-blue-600", href: "/inventory" },
        { label: "In-Transit", value: stats.inTransit, icon: Truck, gradient: "from-amber-500 to-orange-600", href: "/in-transit" },
        { label: "Sold", value: stats.sold, icon: DollarSign, gradient: "from-emerald-500 to-green-600", href: "/sold" },
        { label: "Trade-Ins", value: stats.tradeIns, icon: ArrowLeftRight, gradient: "from-purple-500 to-violet-600", href: "/tradeins" },
    ];

    return (
        <div className="p-4 lg:p-6 min-h-screen">
            {/* Header with gradient accent */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
            >
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary" />
                        Dashboard
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">Fleet inventory overview</p>
                </div>
                <DashboardCalendar scheduledPickups={scheduledPickups} />
            </motion.div>

            {/* Stats Cards - Animated gradient cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {statCards.map((card, index) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(card.href)}
                        className="relative group cursor-pointer overflow-hidden rounded-xl"
                    >
                        {/* Gradient background */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
                        {/* Glass overlay */}
                        <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        {/* Content */}
                        <div className="relative p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/80 text-xs font-medium uppercase tracking-wide">{card.label}</p>
                                    <p className="text-3xl font-bold text-white mt-1">{card.value}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                                    <card.icon className="h-5 w-5 text-white" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Grid - 3 column on large screens */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Pending Pickups */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-1 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden"
                >
                    <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <Clock className="h-4 w-4 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Pending Pickup</h3>
                                <p className="text-[10px] text-slate-500">{pendingPickups.length} vehicles</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/pending-pickup')} className="text-slate-400 hover:text-white transition-colors">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                        {pendingPickups.length > 0 ? pendingPickups.slice(0, 5).map((v) => (
                            <VehicleRow key={v.id} vehicle={v} onClick={() => setSelectedVehicle(v)} accentColor="amber" />
                        )) : <EmptyState text="No pending pickups" />}
                    </div>
                </motion.div>

                {/* Scheduled Pickups */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-1 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden"
                >
                    <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <CalendarDays className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Scheduled</h3>
                                <p className="text-[10px] text-slate-500">{scheduledPickups.length} upcoming</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/pickup-scheduled')} className="text-slate-400 hover:text-white transition-colors">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                        {scheduledPickups.length > 0 ? scheduledPickups.slice(0, 5).map((v) => (
                            <VehicleRow key={v.id} vehicle={v} showDate onClick={() => setSelectedVehicle(v)} accentColor="emerald" />
                        )) : <EmptyState text="No scheduled pickups" />}
                    </div>
                </motion.div>

                {/* Weekly Sales */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-1 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden"
                >
                    <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Weekly Sales</h3>
                                <p className="text-[10px] text-slate-500">{weeklySalesDateRange}</p>
                            </div>
                        </div>
                        <button onClick={() => setWeeklySalesModalOpen(true)} className="text-slate-400 hover:text-white transition-colors">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                        {weeklySales.length > 0 ? weeklySales.slice(0, 5).map((v) => (
                            <SaleRow key={v.id} vehicle={v} onClick={() => setSelectedVehicle(v)} />
                        )) : <EmptyState text="No sales this week" />}
                    </div>
                </motion.div>
            </div>

            {/* Modals */}
            <VehicleDetailModal vehicle={selectedVehicle} isOpen={!!selectedVehicle} onClose={() => setSelectedVehicle(null)} onUpdate={loadDashboardData} />
            <WeeklySalesModal isOpen={weeklySalesModalOpen} onClose={() => setWeeklySalesModalOpen(false)} sales={weeklySales} dateRange={weeklySalesDateRange} />
        </div>
    );
}

// Compact vehicle row component
function VehicleRow({ vehicle, onClick, showDate = false, accentColor = "blue" }) {
    const colors = {
        amber: "border-amber-500/30 hover:bg-amber-500/10",
        emerald: "border-emerald-500/30 hover:bg-emerald-500/10",
        blue: "border-blue-500/30 hover:bg-blue-500/10"
    };

    return (
        <motion.div
            whileHover={{ x: 2 }}
            onClick={onClick}
            className={`p-2.5 rounded-xl bg-slate-900/50 border ${colors[accentColor]} cursor-pointer transition-colors`}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white truncate">
                        {vehicle.stockNumber} • {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    {showDate && vehicle.pickupDate && (
                        <p className="text-[10px] text-emerald-400 mt-0.5">
                            📅 {new Date(vehicle.pickupDate).toLocaleDateString()} @ {vehicle.pickupTime || 'TBD'}
                        </p>
                    )}
                </div>
                <StatusBadge status={vehicle.status} />
            </div>
        </motion.div>
    );
}

// Sale row component
function SaleRow({ vehicle, onClick }) {
    const customerName = vehicle.customer
        ? `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim() || 'Customer'
        : 'Unknown';

    return (
        <motion.div
            whileHover={{ x: 2 }}
            onClick={onClick}
            className="p-2.5 rounded-xl bg-slate-900/50 border border-green-500/30 hover:bg-green-500/10 cursor-pointer transition-colors"
        >
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white truncate">
                        {vehicle.stockNumber} • {vehicle.year} {vehicle.make}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{customerName}</p>
                </div>
                <StatusBadge status="sold" />
            </div>
        </motion.div>
    );
}

// Empty state component
function EmptyState({ text }) {
    return (
        <div className="py-6 text-center">
            <p className="text-xs text-slate-500">{text}</p>
        </div>
    );
}
