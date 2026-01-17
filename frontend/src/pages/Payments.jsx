import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { CreditCard, Search, Download, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { soldVehicles } from '../services/api';
import { Select } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { downloadCSV } from '../utils/exportUtils';
import VehicleDetailModal from '../components/modals/VehicleDetailModal';

export default function Payments() {
    const [vehicles, setVehicles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [methodFilter, setMethodFilter] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {
        try {
            setIsLoading(true);
            const data = await soldVehicles.getAll();
            setVehicles(data);
        } catch (error) {
            console.error('Failed to load payments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to parse sale date as local time (not UTC)
    const parseSaleDate = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    };

    // Filter vehicles that have payment data
    const paymentsData = useMemo(() => {
        return vehicles.filter(v =>
            v.customer &&
            v.customer.saleDate &&
            (v.customer.paymentMethod || v.customer.paymentReference || v.customer.saleAmount)
        );
    }, [vehicles]);

    // Get unique years from sale dates
    const years = useMemo(() => {
        const uniqueYears = [...new Set(paymentsData.map(v => {
            if (v.customer?.saleDate) return parseSaleDate(v.customer.saleDate).getFullYear();
            return null;
        }).filter(Boolean))].sort((a, b) => b - a);
        return uniqueYears;
    }, [paymentsData]);

    // Filter payments
    const filteredPayments = useMemo(() => {
        let result = paymentsData;

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(v =>
                v.stockNumber?.toLowerCase().includes(searchLower) ||
                v.vin?.toLowerCase().includes(searchLower) ||
                `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(searchLower) ||
                (v.customer?.firstName || '').toLowerCase().includes(searchLower) ||
                (v.customer?.lastName || '').toLowerCase().includes(searchLower) ||
                (v.customer?.paymentReference || '').toLowerCase().includes(searchLower)
            );
        }

        // Month/Year filter
        if (monthFilter || yearFilter) {
            result = result.filter(v => {
                if (!v.customer?.saleDate) return false;
                const saleDate = parseSaleDate(v.customer.saleDate);
                if (yearFilter && saleDate.getFullYear().toString() !== yearFilter) return false;
                if (monthFilter && (saleDate.getMonth() + 1).toString() !== monthFilter) return false;
                return true;
            });
        }

        // Payment method filter
        if (methodFilter) {
            result = result.filter(v => v.customer?.paymentMethod === methodFilter);
        }

        // Sort by sale date - newest first
        result = result.sort((a, b) => {
            const dateA = a.customer?.saleDate ? parseSaleDate(a.customer.saleDate) : new Date(0);
            const dateB = b.customer?.saleDate ? parseSaleDate(b.customer.saleDate) : new Date(0);
            return dateB - dateA;
        });

        return result;
    }, [paymentsData, search, monthFilter, yearFilter, methodFilter]);

    // Calculate analytics stats
    const analytics = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Current month payments
        const currentMonthPayments = paymentsData.filter(v => {
            if (!v.customer?.saleDate) return false;
            const saleDate = parseSaleDate(v.customer.saleDate);
            return saleDate.getFullYear() === currentYear && saleDate.getMonth() === currentMonth;
        });
        const currentMonthTotal = currentMonthPayments.reduce((sum, v) => sum + (parseFloat(v.customer?.saleAmount) || 0), 0);
        const currentMonthCount = currentMonthPayments.length;

        // Previous month payments
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const prevMonthPayments = paymentsData.filter(v => {
            if (!v.customer?.saleDate) return false;
            const saleDate = parseSaleDate(v.customer.saleDate);
            return saleDate.getFullYear() === prevMonthYear && saleDate.getMonth() === prevMonth;
        });
        const prevMonthTotal = prevMonthPayments.reduce((sum, v) => sum + (parseFloat(v.customer?.saleAmount) || 0), 0);
        const prevMonthCount = prevMonthPayments.length;

        // MoM changes
        const momRevenue = prevMonthTotal > 0 ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal * 100) : 0;
        const momCount = prevMonthCount > 0 ? ((currentMonthCount - prevMonthCount) / prevMonthCount * 100) : 0;

        // Current year YTD
        const currentYearPayments = paymentsData.filter(v => {
            if (!v.customer?.saleDate) return false;
            return parseSaleDate(v.customer.saleDate).getFullYear() === currentYear;
        });
        const currentYearTotal = currentYearPayments.reduce((sum, v) => sum + (parseFloat(v.customer?.saleAmount) || 0), 0);
        const currentYearCount = currentYearPayments.length;

        // Previous year
        const prevYearPayments = paymentsData.filter(v => {
            if (!v.customer?.saleDate) return false;
            return parseSaleDate(v.customer.saleDate).getFullYear() === currentYear - 1;
        });
        const prevYearTotal = prevYearPayments.reduce((sum, v) => sum + (parseFloat(v.customer?.saleAmount) || 0), 0);
        const prevYearCount = prevYearPayments.length;

        // YoY changes
        const yoyRevenue = prevYearTotal > 0 ? ((currentYearTotal - prevYearTotal) / prevYearTotal * 100) : 0;
        const yoyCount = prevYearCount > 0 ? ((currentYearCount - prevYearCount) / prevYearCount * 100) : 0;

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        return {
            currentMonth: {
                name: `${monthNames[currentMonth]} ${currentYear}`,
                total: currentMonthTotal,
                count: currentMonthCount,
                momRevenue,
                momCount
            },
            prevMonth: {
                name: `${monthNames[prevMonth]} ${prevMonthYear}`,
                total: prevMonthTotal,
                count: prevMonthCount
            },
            currentYear: {
                name: `${currentYear} YTD`,
                total: currentYearTotal,
                count: currentYearCount,
                yoyRevenue,
                yoyCount
            },
            prevYear: {
                name: `${currentYear - 1} Total`,
                total: prevYearTotal,
                count: prevYearCount
            }
        };
    }, [paymentsData]);

    // Calculate filtered total
    const filteredTotal = useMemo(() => {
        return filteredPayments.reduce((sum, v) => sum + (parseFloat(v.customer?.saleAmount) || 0), 0);
    }, [filteredPayments]);

    const handleExport = () => {
        const columns = [
            { key: 'stockNumber', label: 'Stock #' },
            { key: 'vehicle', label: 'Vehicle', getValue: v => `${v.year} ${v.make} ${v.model}` },
            { key: 'customer', label: 'Customer', getValue: v => `${v.customer?.firstName || ''} ${v.customer?.lastName || ''}`.trim() },
            { key: 'saleDate', label: 'Sale Date', getValue: v => v.customer?.saleDate ? parseSaleDate(v.customer.saleDate).toLocaleDateString() : '' },
            { key: 'amount', label: 'Amount', getValue: v => v.customer?.saleAmount || '' },
            { key: 'method', label: 'Payment Method', getValue: v => v.customer?.paymentMethod || '' },
            { key: 'reference', label: 'Reference', getValue: v => v.customer?.paymentReference || '' },
        ];
        downloadCSV(filteredPayments, columns, 'payments');
    };

    const paymentMethods = ['ACH', 'Check', 'Credit Card', 'Wire Transfer', 'Cash'];
    const months = [
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];

    const getPaymentMethodVariant = (method) => {
        switch (method) {
            case 'ACH': return 'success';
            case 'Check': return 'warning';
            case 'Credit Card': return 'info';
            case 'Wire Transfer': return 'default';
            case 'Cash': return 'success';
            default: return 'default';
        }
    };

    return (
        <div className="p-6 lg:p-8">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <h1 className="text-2xl font-bold text-slate-100 mb-1">Payment Tracking</h1>
                <p className="text-slate-400 text-sm">Track all vehicle sale payments</p>
            </motion.div>

            {/* Analytics Cards - Like Original */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Current Month */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{analytics.currentMonth.name}</p>
                        <Calendar className="h-5 w-5 text-slate-500" />
                    </div>
                    <p className="text-2xl font-bold text-slate-100 font-mono mb-1">
                        ${analytics.currentMonth.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-400 mb-3">{analytics.currentMonth.count} payment{analytics.currentMonth.count !== 1 ? 's' : ''}</p>
                    <div className="flex gap-4 pt-3 border-t border-slate-700/50">
                        <div>
                            <p className="text-xs text-slate-500 mb-0.5">MoM Revenue</p>
                            <p className={`text-sm font-bold flex items-center gap-1 ${analytics.currentMonth.momRevenue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {analytics.currentMonth.momRevenue >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {Math.abs(analytics.currentMonth.momRevenue).toFixed(1)}%
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-0.5">MoM Count</p>
                            <p className={`text-sm font-bold flex items-center gap-1 ${analytics.currentMonth.momCount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {analytics.currentMonth.momCount >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {Math.abs(analytics.currentMonth.momCount).toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Previous Month */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{analytics.prevMonth.name}</p>
                        <Calendar className="h-5 w-5 text-slate-500" />
                    </div>
                    <p className="text-2xl font-bold text-slate-100 font-mono mb-1">
                        ${analytics.prevMonth.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-400">{analytics.prevMonth.count} payment{analytics.prevMonth.count !== 1 ? 's' : ''}</p>
                </motion.div>

                {/* Current Year YTD */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{analytics.currentYear.name}</p>
                        <CreditCard className="h-5 w-5 text-slate-500" />
                    </div>
                    <p className="text-2xl font-bold text-slate-100 font-mono mb-1">
                        ${analytics.currentYear.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-400 mb-3">{analytics.currentYear.count} payment{analytics.currentYear.count !== 1 ? 's' : ''}</p>
                    <div className="flex gap-4 pt-3 border-t border-slate-700/50">
                        <div>
                            <p className="text-xs text-slate-500 mb-0.5">YoY Revenue</p>
                            <p className={`text-sm font-bold flex items-center gap-1 ${analytics.currentYear.yoyRevenue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {analytics.currentYear.yoyRevenue >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {Math.abs(analytics.currentYear.yoyRevenue).toFixed(1)}%
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-0.5">YoY Count</p>
                            <p className={`text-sm font-bold flex items-center gap-1 ${analytics.currentYear.yoyCount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {analytics.currentYear.yoyCount >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {Math.abs(analytics.currentYear.yoyCount).toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Previous Year */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{analytics.prevYear.name}</p>
                        <CreditCard className="h-5 w-5 text-slate-500" />
                    </div>
                    <p className="text-2xl font-bold text-slate-100 font-mono mb-1">
                        ${analytics.prevYear.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-400">{analytics.prevYear.count} payment{analytics.prevYear.count !== 1 ? 's' : ''}</p>
                </motion.div>
            </div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-xl p-4 mb-6"
            >
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search payments..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm text-slate-200 bg-slate-800/50 border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <Select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="w-full sm:w-36"
                    >
                        <option value="">All Months</option>
                        {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </Select>
                    <Select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="w-full sm:w-28"
                    >
                        <option value="">All Years</option>
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </Select>
                    <Select
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className="w-full sm:w-36"
                    >
                        <option value="">All Methods</option>
                        {paymentMethods.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </Select>
                    <Button variant="secondary" onClick={handleExport}>
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </div>
            </motion.div>

            {/* Table */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-xl overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Stock #</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicle</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Sale Date</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Method</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Reference #</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500">Loading...</td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500">No payment records found</td>
                                </tr>
                            ) : (
                                filteredPayments.map((vehicle) => {
                                    const customerName = `${vehicle.customer?.firstName || ''} ${vehicle.customer?.lastName || ''}`.trim() || 'N/A';
                                    const saleDate = vehicle.customer?.saleDate ? parseSaleDate(vehicle.customer.saleDate).toLocaleDateString() : 'N/A';
                                    const saleAmount = parseFloat(vehicle.customer?.saleAmount) || 0;
                                    const paymentMethod = vehicle.customer?.paymentMethod || 'N/A';
                                    const paymentRef = vehicle.customer?.paymentReference || 'N/A';

                                    return (
                                        <tr
                                            key={vehicle.id}
                                            className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                                            onClick={() => setSelectedVehicle(vehicle)}
                                        >
                                            <td className="px-4 py-3 text-sm font-medium text-primary">{vehicle.stockNumber}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">
                                                {vehicle.year} {vehicle.make} {vehicle.model}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{customerName}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{saleDate}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-right font-mono text-emerald-400">
                                                ${saleAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <Badge variant={getPaymentMethodVariant(paymentMethod)}>
                                                    {paymentMethod}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-400 font-mono">{paymentRef}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {filteredPayments.length > 0 && (
                            <tfoot className="bg-slate-800/30 border-t border-slate-700/50">
                                <tr>
                                    <td colSpan="4" className="px-4 py-3 text-right text-sm font-bold text-slate-200">
                                        Total ({filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}):
                                    </td>
                                    <td className="px-4 py-3 text-right text-lg font-bold font-mono text-primary">
                                        ${filteredTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td colSpan="2"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </motion.div>

            {/* Vehicle Detail Modal */}
            <VehicleDetailModal
                vehicle={selectedVehicle}
                isOpen={!!selectedVehicle}
                onClose={() => setSelectedVehicle(null)}
                onUpdate={loadPayments}
            />
        </div>
    );
}
