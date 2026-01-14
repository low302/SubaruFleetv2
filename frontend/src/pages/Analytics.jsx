import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Car, Truck, Wrench, Clock, CalendarCheck, DollarSign, ArrowLeftRight, TrendingUp } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { inventory, soldVehicles, tradeIns } from '../services/api';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

export default function Analytics() {
    const [stats, setStats] = useState({
        totalInventory: 0,
        inStock: 0,
        inTransit: 0,
        pdi: 0,
        pendingPickup: 0,
        pickupScheduled: 0,
        sold: 0,
        tradeIns: 0,
    });
    const [inventoryData, setInventoryData] = useState([]);
    const [soldData, setSoldData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [inv, sold, trades] = await Promise.all([
                inventory.getAll(),
                soldVehicles.getAll(),
                tradeIns.getAll(),
            ]);

            setInventoryData(inv);
            setSoldData(sold);

            setStats({
                totalInventory: inv.length,
                // In Stock includes: in-stock, pdi, pending-pickup, pickup-scheduled
                inStock: inv.filter(v => ['in-stock', 'pdi', 'pending-pickup', 'pickup-scheduled'].includes(v.status)).length,
                inTransit: inv.filter(v => v.status === 'in-transit').length,
                pdi: inv.filter(v => v.status === 'pdi').length,
                pendingPickup: inv.filter(v => v.status === 'pending-pickup').length,
                pickupScheduled: inv.filter(v => v.status === 'pickup-scheduled').length,
                sold: sold.length,
                tradeIns: trades.length,
            });
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { label: 'In Stock', value: stats.inStock, icon: Car, color: 'bg-blue-500/20', iconColor: 'text-blue-400' },
        { label: 'In-Transit', value: stats.inTransit, icon: Truck, color: 'bg-amber-500/20', iconColor: 'text-amber-400' },
        { label: 'PDI', value: stats.pdi, icon: Wrench, color: 'bg-purple-500/20', iconColor: 'text-purple-400' },
        { label: 'Pending Pickup', value: stats.pendingPickup, icon: Clock, color: 'bg-orange-500/20', iconColor: 'text-orange-400' },
        { label: 'Pickup Scheduled', value: stats.pickupScheduled, icon: CalendarCheck, color: 'bg-green-500/20', iconColor: 'text-green-400' },
        { label: 'Sold Vehicles', value: stats.sold, icon: DollarSign, color: 'bg-emerald-500/20', iconColor: 'text-emerald-400' },
        { label: 'Trade-Ins', value: stats.tradeIns, icon: ArrowLeftRight, color: 'bg-cyan-500/20', iconColor: 'text-cyan-400' },
    ];

    // Status distribution chart data
    const statusChartData = {
        labels: ['In Stock', 'In-Transit', 'PDI', 'Pending', 'Scheduled'],
        datasets: [{
            data: [stats.inStock, stats.inTransit, stats.pdi, stats.pendingPickup, stats.pickupScheduled],
            backgroundColor: [
                'rgba(10, 132, 255, 0.8)',
                'rgba(255, 159, 10, 0.8)',
                'rgba(175, 82, 222, 0.8)',
                'rgba(255, 149, 0, 0.8)',
                'rgba(50, 215, 75, 0.8)',
            ],
            borderWidth: 0,
        }],
    };

    // Make distribution chart data
    const makeCounts = inventoryData.reduce((acc, v) => {
        acc[v.make] = (acc[v.make] || 0) + 1;
        return acc;
    }, {});
    const sortedMakes = Object.entries(makeCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const makeChartData = {
        labels: sortedMakes.map(([make]) => make),
        datasets: [{
            label: 'Vehicles',
            data: sortedMakes.map(([, count]) => count),
            backgroundColor: 'rgba(10, 132, 255, 0.8)',
            borderRadius: 6,
        }],
    };

    // Monthly sales chart data
    const monthlySales = soldData.reduce((acc, v) => {
        if (v.soldDate) {
            const date = new Date(v.soldDate);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            acc[key] = (acc[key] || 0) + 1;
        }
        return acc;
    }, {});
    const sortedMonths = Object.entries(monthlySales).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);

    const salesChartData = {
        labels: sortedMonths.map(([month]) => {
            const [year, m] = month.split('-');
            return new Date(year, parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }),
        datasets: [{
            label: 'Vehicles Sold',
            data: sortedMonths.map(([, count]) => count),
            borderColor: 'rgba(50, 215, 75, 1)',
            backgroundColor: 'rgba(50, 215, 75, 0.2)',
            fill: true,
            tension: 0.4,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            x: {
                ticks: { color: '#94a3b8' },
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
            },
            y: {
                ticks: { color: '#94a3b8' },
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
            },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: { color: '#94a3b8', padding: 15 },
            },
        },
    };

    return (
        <div className="p-6 lg:p-8">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
            >
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
                        <p className="text-slate-400 text-sm">Fleet inventory overview and statistics</p>
                    </div>
                </div>
            </motion.div>

            {loading ? (
                <div className="text-center text-slate-400 py-12">Loading analytics...</div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        {statCards.map((card, index) => (
                            <motion.div
                                key={card.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="glass rounded-xl p-4"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-slate-400 text-xs font-medium">{card.label}</p>
                                    <div className={`h-6 w-6 rounded-lg ${card.color} flex items-center justify-center`}>
                                        <card.icon className={`h-3 w-3 ${card.iconColor}`} />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-slate-100">{card.value}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Status Distribution */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="glass rounded-xl p-5"
                        >
                            <h3 className="text-lg font-semibold text-slate-100 mb-4">Status Distribution</h3>
                            <div className="h-64">
                                <Doughnut data={statusChartData} options={doughnutOptions} />
                            </div>
                        </motion.div>

                        {/* Make Distribution */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="glass rounded-xl p-5"
                        >
                            <h3 className="text-lg font-semibold text-slate-100 mb-4">Vehicles by Make</h3>
                            <div className="h-64">
                                <Bar data={makeChartData} options={chartOptions} />
                            </div>
                        </motion.div>

                        {/* Monthly Sales Trend */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="glass rounded-xl p-5 lg:col-span-2"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="h-5 w-5 text-green-400" />
                                <h3 className="text-lg font-semibold text-slate-100">Monthly Sales Trend</h3>
                            </div>
                            <div className="h-64">
                                <Line data={salesChartData} options={chartOptions} />
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </div>
    );
}
