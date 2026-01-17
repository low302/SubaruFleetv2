import { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import { Search, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/input";
import { soldVehicles } from "../services/api";
import VehicleDetailModal from "../components/modals/VehicleDetailModal";

export default function SoldVehicles() {
    const [vehicles, setVehicles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedYear, setSelectedYear] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    useEffect(() => {
        loadSoldVehicles();
    }, []);

    const loadSoldVehicles = async () => {
        try {
            setIsLoading(true);
            const data = await soldVehicles.getAll();
            setVehicles(data);
        } catch (error) {
            console.error("Failed to load sold vehicles:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Get customer name from the customer object
    const getCustomerName = (vehicle) => {
        if (!vehicle.customer) return "-";
        // Check for 'name' field first (used by mark-sold)
        if (vehicle.customer.name) return vehicle.customer.name;
        // Fall back to firstName/lastName combination
        const firstName = vehicle.customer.firstName || '';
        const lastName = vehicle.customer.lastName || '';
        const name = `${firstName} ${lastName}`.trim();
        return name || "-";
    };

    // Get sale date from customer object
    const getSaleDate = (vehicle) => {
        if (vehicle.customer?.saleDate) {
            // Parse as local time by appending T00:00:00
            const dateStr = vehicle.customer.saleDate;
            const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString();
            }
        }
        // Fallback to dateAdded or created_at
        if (vehicle.dateAdded) {
            const date = new Date(vehicle.dateAdded);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString();
            }
        }
        return "-";
    };

    // Get raw sale date for sorting/filtering
    const getRawSaleDate = (vehicle) => {
        if (vehicle.customer?.saleDate) {
            const dateStr = vehicle.customer.saleDate;
            return new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
        }
        if (vehicle.dateAdded) {
            return new Date(vehicle.dateAdded);
        }
        return new Date(0);
    };

    const filteredVehicles = useMemo(() => {
        let result = [...vehicles];

        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(
                (v) =>
                    v.stockNumber?.toLowerCase().includes(searchLower) ||
                    v.vin?.toLowerCase().includes(searchLower) ||
                    (v.customer?.name || '').toLowerCase().includes(searchLower) ||
                    (v.customer?.firstName || '').toLowerCase().includes(searchLower) ||
                    (v.customer?.lastName || '').toLowerCase().includes(searchLower) ||
                    v.fleetCompany?.toLowerCase().includes(searchLower) ||
                    v.operationCompany?.toLowerCase().includes(searchLower)
            );
        }

        if (selectedMonth || selectedYear) {
            result = result.filter((v) => {
                const date = getRawSaleDate(v);
                if (isNaN(date.getTime())) return false;
                const matchMonth = !selectedMonth || date.getMonth() + 1 === parseInt(selectedMonth);
                const matchYear = !selectedYear || date.getFullYear() === parseInt(selectedYear);
                return matchMonth && matchYear;
            });
        }

        // Sort by sale date, newest first
        return result.sort((a, b) => getRawSaleDate(b) - getRawSaleDate(a));
    }, [vehicles, search, selectedMonth, selectedYear]);

    const exportToCSV = () => {
        const headers = ["Stock #", "VIN", "Year", "Make", "Model", "Customer", "Fleet", "Operation Company", "Sold Date"];
        const rows = filteredVehicles.map((v) => [
            v.stockNumber,
            v.vin,
            v.year,
            v.make,
            v.model,
            getCustomerName(v),
            v.fleetCompany || '',
            v.operationCompany || '',
            getSaleDate(v),
        ]);

        const csv = [headers, ...rows].map((row) => row.map(cell => `"${cell}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sold-vehicles-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
    };

    const months = [
        { value: "1", label: "January" },
        { value: "2", label: "February" },
        { value: "3", label: "March" },
        { value: "4", label: "April" },
        { value: "5", label: "May" },
        { value: "6", label: "June" },
        { value: "7", label: "July" },
        { value: "8", label: "August" },
        { value: "9", label: "September" },
        { value: "10", label: "October" },
        { value: "11", label: "November" },
        { value: "12", label: "December" },
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
            >
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">Sold Vehicles</h1>
                    <p className="text-slate-400 text-sm">{filteredVehicles.length} sold vehicles</p>
                </div>
                <Button variant="secondary" onClick={exportToCSV}>
                    <Download className="h-4 w-4" />
                    Export CSV
                </Button>
            </motion.div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-xl p-4 mb-6"
            >
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search sold vehicles..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 bg-slate-800/50 border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                    </div>
                    <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="sm:w-40">
                        <option value="">All Months</option>
                        {months.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </Select>
                    <Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="sm:w-32">
                        <option value="">All Years</option>
                        {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </Select>
                </div>
            </motion.div>

            {/* Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-xl overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-primary/10">
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Sold Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Stock #</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicle</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Fleet</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Operation Company</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-500">Loading...</td>
                                </tr>
                            ) : filteredVehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-500">No sold vehicles found</td>
                                </tr>
                            ) : (
                                filteredVehicles.map((vehicle, index) => (
                                    <motion.tr
                                        key={vehicle.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="border-b border-slate-700/50 hover:bg-primary/10 transition-colors cursor-pointer"
                                        onClick={() => setSelectedVehicle(vehicle)}
                                    >
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {getSaleDate(vehicle)}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-primary">{vehicle.stockNumber}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {vehicle.year} {vehicle.make} {vehicle.model}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{getCustomerName(vehicle)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{vehicle.fleetCompany || "-"}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{vehicle.operationCompany || "-"}</td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Vehicle Detail Modal */}
            <VehicleDetailModal
                vehicle={selectedVehicle}
                isOpen={!!selectedVehicle}
                onClose={() => setSelectedVehicle(null)}
                onUpdate={loadSoldVehicles}
            />
        </div>
    );
}
