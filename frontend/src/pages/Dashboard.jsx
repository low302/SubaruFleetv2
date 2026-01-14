import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Package, Truck, DollarSign, ArrowLeftRight, Clock, Calendar, Car, TrendingUp } from "lucide-react";
import { CardSpotlight } from "../components/ui/card-spotlight";
import { StatusBadge } from "../components/ui/badge";
import { inventory, soldVehicles, tradeIns } from "../services/api";
import VehicleDetailModal from "../components/modals/VehicleDetailModal";
import WeeklySalesModal from "../components/modals/WeeklySalesModal";
import DashboardCalendar from "../components/DashboardCalendar";

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        inStock: 0,
        inTransit: 0,
        sold: 0,
        tradeIns: 0,
    });
    const [pendingPickups, setPendingPickups] = useState([]);
    const [scheduledPickups, setScheduledPickups] = useState([]);
    const [weeklySales, setWeeklySales] = useState([]);
    const [weeklySalesDateRange, setWeeklySalesDateRange] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [weeklySalesModalOpen, setWeeklySalesModalOpen] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setIsLoading(true);
            const [inventoryData, soldData, tradeInsData] = await Promise.all([
                inventory.getAll(),
                soldVehicles.getAll(),
                tradeIns.getAll(),
            ]);

            // Calculate stats - In Stock includes: in-stock, pdi, pending-pickup, pickup-scheduled
            const inStockStatuses = ['in-stock', 'pdi', 'pending-pickup', 'pickup-scheduled'];
            const inStock = inventoryData.filter((v) => inStockStatuses.includes(v.status)).length;
            const inTransit = inventoryData.filter((v) => v.status === "in-transit").length;
            const pending = inventoryData.filter((v) => v.status === "pending-pickup");
            const scheduled = inventoryData.filter((v) => v.status === "pickup-scheduled");

            // Calculate weekly sales
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            const weekSales = soldData.filter((v) => {
                const saleDate = v.customer?.saleDate ? new Date(v.customer.saleDate) : new Date(v.created_at);
                return saleDate >= startOfWeek && saleDate <= endOfWeek;
            }).slice(0, 10);

            // Format date range
            const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            setWeeklySalesDateRange(`${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}, ${today.getFullYear()}`);

            setStats({
                inStock,
                inTransit,
                sold: soldData.length,
                tradeIns: tradeInsData.length,
            });
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
        {
            label: "In Stock",
            value: stats.inStock,
            icon: Package,
            color: "#0a84ff",
            href: "/inventory",
        },
        {
            label: "In-Transit",
            value: stats.inTransit,
            icon: Truck,
            color: "#ff9f0a",
            href: "/in-transit",
        },
        {
            label: "Sold",
            value: stats.sold,
            icon: DollarSign,
            color: "#32d74b",
            href: "/sold",
        },
        {
            label: "Trade-Ins",
            value: stats.tradeIns,
            icon: ArrowLeftRight,
            color: "#bf5af2",
            href: "/tradeins",
        },
    ];

    return (
        <div className="p-6 lg:p-8">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl font-bold text-slate-100 mb-1">Dashboard</h1>
                <p className="text-slate-400 text-sm">Overview of your fleet inventory</p>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statCards.map((card, index) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <CardSpotlight
                            color={`${card.color}30`}
                            onClick={() => navigate(card.href)}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium mb-1">
                                        {card.label}
                                    </p>
                                    <p className="text-3xl font-bold text-slate-100">{card.value}</p>
                                </div>
                                <card.icon
                                    className="h-6 w-6 opacity-50"
                                    style={{ color: card.color }}
                                />
                            </div>
                        </CardSpotlight>
                    </motion.div>
                ))}
            </div>

            {/* Dashboard Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendar - Small Card */}
                <DashboardCalendar
                    scheduledPickups={scheduledPickups}
                />
                {/* Pending Pickups */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass rounded-xl p-5"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-5 w-5 text-warning" />
                        <h2 className="text-lg font-semibold text-slate-100">Pending Pickup</h2>
                        {pendingPickups.length > 0 && (
                            <span className="text-xs text-slate-500">({pendingPickups.length})</span>
                        )}
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {pendingPickups.length > 0 ? (
                            pendingPickups.map((vehicle) => (
                                <VehicleCard
                                    key={vehicle.id}
                                    vehicle={vehicle}
                                    onClick={() => setSelectedVehicle(vehicle)}
                                />
                            ))
                        ) : (
                            <p className="text-slate-500 text-sm py-4 text-center">
                                No pending pickups
                            </p>
                        )}
                    </div>
                </motion.div>

                {/* Scheduled Pickups */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass rounded-xl p-5"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-5 w-5 text-success" />
                        <h2 className="text-lg font-semibold text-slate-100">Scheduled Pickups</h2>
                        {scheduledPickups.length > 0 && (
                            <span className="text-xs text-slate-500">({scheduledPickups.length})</span>
                        )}
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {scheduledPickups.length > 0 ? (
                            scheduledPickups.map((vehicle) => (
                                <VehicleCard
                                    key={vehicle.id}
                                    vehicle={vehicle}
                                    showSchedule
                                    onClick={() => setSelectedVehicle(vehicle)}
                                />
                            ))
                        ) : (
                            <p className="text-slate-500 text-sm py-4 text-center">
                                No scheduled pickups
                            </p>
                        )}
                    </div>
                </motion.div>



                {/* Weekly Sales - Full Width */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="glass rounded-xl p-5 lg:col-span-2"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-success" />
                                <h2 className="text-lg font-semibold text-slate-100">
                                    Weekly Sales
                                </h2>
                                {weeklySales.length > 0 && (
                                    <span className="text-xs text-slate-500">({weeklySales.length})</span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{weeklySalesDateRange}</p>
                        </div>
                        <button
                            onClick={() => setWeeklySalesModalOpen(true)}
                            className="text-sm text-slate-400 hover:text-primary transition-colors"
                        >
                            View All →
                        </button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {weeklySales.length > 0 ? (
                            weeklySales.map((vehicle) => (
                                <SoldVehicleCard
                                    key={vehicle.id}
                                    vehicle={vehicle}
                                    onClick={() => setSelectedVehicle(vehicle)}
                                />
                            ))
                        ) : (
                            <p className="text-slate-500 text-sm py-4 text-center">
                                No sales this week
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Vehicle Detail Modal */}
            <VehicleDetailModal
                vehicle={selectedVehicle}
                isOpen={!!selectedVehicle}
                onClose={() => setSelectedVehicle(null)}
                onUpdate={loadDashboardData}
            />

            {/* Weekly Sales Modal */}
            <WeeklySalesModal
                isOpen={weeklySalesModalOpen}
                onClose={() => setWeeklySalesModalOpen(false)}
                sales={weeklySales}
                dateRange={weeklySalesDateRange}
            />
        </div>
    );
}

function VehicleCard({ vehicle, showSchedule = false, compact = false, onClick }) {
    // Get customer name if available
    const customerName = vehicle.customer
        ? `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim()
        : '';

    return (
        <div
            className={`p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-primary/30 hover:bg-slate-700/50 transition-colors cursor-pointer ${compact ? "" : ""}`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 truncate">
                        {vehicle.stockNumber} - {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    {!compact && (
                        <p className="text-xs text-slate-500">
                            {customerName || vehicle.fleetCompany || "No Customer/Fleet"}
                        </p>
                    )}
                    {showSchedule && vehicle.pickupDate && (
                        <p className="text-xs text-success">
                            📅 {new Date(vehicle.pickupDate).toLocaleDateString()} at {vehicle.pickupTime}
                        </p>
                    )}
                </div>
                <StatusBadge status={vehicle.status} />
            </div>
        </div>
    );
}


function SoldVehicleCard({ vehicle, onClick }) {
    const customerName = vehicle.customer
        ? `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim()
        : 'Unknown Customer';

    const saleDate = vehicle.customer?.saleDate
        ? new Date(vehicle.customer.saleDate).toLocaleDateString()
        : 'N/A';

    return (
        <div
            className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-success/30 hover:bg-slate-700/50 transition-colors cursor-pointer"
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 truncate">
                        {vehicle.stockNumber} - {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-xs text-slate-500">
                        {customerName} • Sold {saleDate}
                    </p>
                </div>
                <StatusBadge status="sold" />
            </div>
        </div>
    );
}
