import { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import { Search, Truck } from "lucide-react";
import { StatusBadge } from "../components/ui/badge";
import { inventory as inventoryApi } from "../services/api";
import VehicleDetailModal from "../components/modals/VehicleDetailModal";

export default function InTransit() {
    const [vehicles, setVehicles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {
        try {
            setIsLoading(true);
            const data = await inventoryApi.getAll();
            setVehicles(data.filter((v) => v.status === "in-transit"));
        } catch (error) {
            console.error("Failed to load vehicles:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredVehicles = useMemo(() => {
        if (!search) return vehicles;
        const searchLower = search.toLowerCase();
        return vehicles.filter(
            (v) =>
                v.stockNumber?.toLowerCase().includes(searchLower) ||
                v.vin?.toLowerCase().includes(searchLower) ||
                v.make?.toLowerCase().includes(searchLower) ||
                v.model?.toLowerCase().includes(searchLower)
        );
    }, [vehicles, search]);

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center gap-3 mb-1">
                    <Truck className="h-6 w-6 text-warning" />
                    <h1 className="text-2xl font-bold text-slate-100">In-Transit Vehicles</h1>
                </div>
                <p className="text-slate-400 text-sm">{filteredVehicles.length} vehicles in transit</p>
            </motion.div>

            {/* Search */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-xl p-4 mb-6"
            >
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search in-transit vehicles..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 bg-slate-800/50 border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
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
                            <tr className="bg-warning/10">
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Stock #</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicle</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">VIN</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Color</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Fleet</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Operation</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-500">Loading...</td>
                                </tr>
                            ) : filteredVehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-500">No in-transit vehicles found</td>
                                </tr>
                            ) : (
                                filteredVehicles.map((vehicle, index) => (
                                    <motion.tr
                                        key={vehicle.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="border-b border-slate-700/50 hover:bg-warning/10 transition-colors cursor-pointer"
                                        onClick={() => setSelectedVehicle(vehicle)}
                                    >
                                        <td className="px-4 py-3 text-sm font-medium text-primary">{vehicle.stockNumber}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            <div className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                                            {vehicle.trim && <div className="text-xs text-slate-500">{vehicle.trim}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400 font-mono text-xs">{vehicle.vin}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{vehicle.color || "-"}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{vehicle.fleetCompany || "-"}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{vehicle.operationCompany || "-"}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {vehicle.customer?.name || vehicle.customer?.firstName
                                                ? `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim() || vehicle.customer.name
                                                : "-"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={vehicle.status} />
                                        </td>
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
                onUpdate={loadVehicles}
            />
        </div>
    );
}
