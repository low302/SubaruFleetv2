import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, Wrench } from 'lucide-react';
import { StatusBadge } from '../components/ui/badge';
import { inventory } from '../services/api';
import VehicleDetailModal from '../components/modals/VehicleDetailModal';

export default function PDI() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {
        try {
            const data = await inventory.getAll();
            setVehicles(data.filter(v => v.status === 'pdi'));
        } catch (error) {
            console.error('Error loading PDI vehicles:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredVehicles = useMemo(() => {
        if (!search) return vehicles;
        const searchLower = search.toLowerCase();
        return vehicles.filter(v =>
            v.stockNumber?.toLowerCase().includes(searchLower) ||
            v.make?.toLowerCase().includes(searchLower) ||
            v.model?.toLowerCase().includes(searchLower) ||
            v.fleetCompany?.toLowerCase().includes(searchLower)
        );
    }, [vehicles, search]);

    return (
        <div className="p-6 lg:p-8">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
            >
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Wrench className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">PDI</h1>
                        <p className="text-slate-400 text-sm">
                            {filteredVehicles.length} vehicles in Pre-Delivery Inspection
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Search Filter */}
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
                        placeholder="Search by stock #, make, model, or fleet..."
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
                            <tr className="bg-primary/10">
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
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filteredVehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-500">
                                        No vehicles in PDI
                                    </td>
                                </tr>
                            ) : (
                                filteredVehicles.map((vehicle, index) => (
                                    <motion.tr
                                        key={vehicle.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="border-b border-slate-700/50 hover:bg-primary/10 cursor-pointer transition-colors"
                                        onClick={() => setSelectedVehicle(vehicle)}
                                    >
                                        <td className="px-4 py-3 text-sm font-medium text-primary">{vehicle.stockNumber}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            <div className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                                            {vehicle.trim && <div className="text-xs text-slate-500">{vehicle.trim}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400 font-mono text-xs">{vehicle.vin}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{vehicle.color || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{vehicle.fleetCompany || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{vehicle.operationCompany || '-'}</td>
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
