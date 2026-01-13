import { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import { Search, Plus, ChevronDown, ChevronUp, Upload, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/input";
import { StatusBadge } from "../components/ui/badge";
import { inventory as inventoryApi } from "../services/api";
import AddVehicleModal from "../components/modals/AddVehicleModal";
import VehicleDetailModal from "../components/modals/VehicleDetailModal";
import CSVImportModal from "../components/modals/CSVImportModal";
import ExportModal from "../components/modals/ExportModal";
import { INVENTORY_COLUMNS } from "../utils/exportUtils";

export default function Inventory() {
    const [vehicles, setVehicles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [sortField, setSortField] = useState("dateAdded");
    const [sortDirection, setSortDirection] = useState("desc");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {
        try {
            setIsLoading(true);
            const data = await inventoryApi.getAll();
            setVehicles(data);
        } catch (error) {
            console.error("Failed to load inventory:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredVehicles = useMemo(() => {
        let result = vehicles.filter((v) => v.status !== "sold" && v.status !== "in-transit");

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(
                (v) =>
                    v.stockNumber?.toLowerCase().includes(searchLower) ||
                    v.vin?.toLowerCase().includes(searchLower) ||
                    v.make?.toLowerCase().includes(searchLower) ||
                    v.model?.toLowerCase().includes(searchLower) ||
                    v.fleetCompany?.toLowerCase().includes(searchLower)
            );
        }

        // Status filter
        if (statusFilter) {
            result = result.filter((v) => v.status === statusFilter);
        }

        // Sort
        result.sort((a, b) => {
            let aVal = a[sortField] || "";
            let bVal = b[sortField] || "";
            if (sortField === "year") {
                aVal = parseInt(aVal) || 0;
                bVal = parseInt(bVal) || 0;
            }
            if (sortDirection === "asc") {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

        return result;
    }, [vehicles, search, statusFilter, sortField, sortDirection]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const handleVehicleAdded = () => {
        setIsAddModalOpen(false);
        loadVehicles();
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return sortDirection === "asc" ? (
            <ChevronUp className="h-4 w-4" />
        ) : (
            <ChevronDown className="h-4 w-4" />
        );
    };

    return (
        <div className="p-6 lg:p-8">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
            >
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">Inventory</h1>
                    <p className="text-slate-400 text-sm">
                        {filteredVehicles.length} vehicles in inventory
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>
                        <Upload className="h-4 w-4" />
                        Import
                    </Button>
                    <Button variant="secondary" onClick={() => setIsExportModalOpen(true)}>
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Add Vehicle
                    </Button>
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-xl p-4 mb-6"
            >
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by stock #, VIN, make, model, or fleet..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 bg-slate-800/50 border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                        </div>
                    </div>
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="sm:w-48"
                    >
                        <option value="">All Statuses</option>
                        <option value="in-stock">In Stock</option>
                        <option value="pdi">PDI</option>
                        <option value="pending-pickup">Pending Pickup</option>
                        <option value="pickup-scheduled">Pickup Scheduled</option>
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
                                <HeaderCell onClick={() => handleSort("stockNumber")}>
                                    Stock # <SortIcon field="stockNumber" />
                                </HeaderCell>
                                <HeaderCell onClick={() => handleSort("make")}>
                                    Vehicle <SortIcon field="make" />
                                </HeaderCell>
                                <HeaderCell>VIN</HeaderCell>
                                <HeaderCell>Color</HeaderCell>
                                <HeaderCell onClick={() => handleSort("fleetCompany")}>
                                    Fleet <SortIcon field="fleetCompany" />
                                </HeaderCell>
                                <HeaderCell onClick={() => handleSort("operationCompany")}>
                                    Operation <SortIcon field="operationCompany" />
                                </HeaderCell>
                                <HeaderCell>Customer</HeaderCell>
                                <HeaderCell onClick={() => handleSort("status")}>
                                    Status <SortIcon field="status" />
                                </HeaderCell>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-500">
                                        Loading inventory...
                                    </td>
                                </tr>
                            ) : filteredVehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-500">
                                        No vehicles found
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
                                        <td className="px-4 py-3 text-sm font-medium text-primary">
                                            {vehicle.stockNumber}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            <div className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                                            {vehicle.trim && <div className="text-xs text-slate-500">{vehicle.trim}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400 font-mono text-xs">
                                            {vehicle.vin}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {vehicle.color || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {vehicle.fleetCompany || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {vehicle.operationCompany || "-"}
                                        </td>
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

            {/* Add Vehicle Modal */}
            <AddVehicleModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={handleVehicleAdded}
            />

            {/* Vehicle Detail Modal */}
            <VehicleDetailModal
                vehicle={selectedVehicle}
                isOpen={!!selectedVehicle}
                onClose={() => setSelectedVehicle(null)}
                onUpdate={loadVehicles}
            />

            {/* CSV Import Modal */}
            <CSVImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    setIsImportModalOpen(false);
                    loadVehicles();
                }}
            />

            {/* Export Modal */}
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                data={filteredVehicles}
                columns={INVENTORY_COLUMNS}
                title="Export Inventory"
                filename="inventory"
            />
        </div>
    );
}

function HeaderCell({ children, onClick }) {
    return (
        <th
            className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 ${onClick ? "cursor-pointer hover:text-slate-200 transition-colors" : ""
                }`}
            onClick={onClick}
        >
            <div className="flex items-center gap-1">{children}</div>
        </th>
    );
}

