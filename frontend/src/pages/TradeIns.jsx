import { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import { Plus, Check, Truck, Search } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { SimpleModal } from "../components/ui/animated-modal";
import { Input, FormRow, Select } from "../components/ui/input";
import { tradeIns as tradeInsApi } from "../services/api";
import TradeInDetailModal from "../components/modals/TradeInDetailModal";

export default function TradeIns() {
    const [tradeIns, setTradeIns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedTradeIn, setSelectedTradeIn] = useState(null);

    // Filters
    const [search, setSearch] = useState("");
    const [fleetFilter, setFleetFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [pickedUpFilter, setPickedUpFilter] = useState(""); // "", "pending", "picked-up"

    useEffect(() => {
        loadTradeIns();
    }, []);

    const loadTradeIns = async () => {
        try {
            setIsLoading(true);
            const data = await tradeInsApi.getAll();
            setTradeIns(data);
        } catch (error) {
            console.error("Failed to load trade-ins:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTogglePickup = async (id, e) => {
        e?.stopPropagation();
        try {
            await tradeInsApi.togglePickup(id);
            loadTradeIns();
        } catch (error) {
            console.error("Failed to toggle pickup:", error);
        }
    };

    // Get unique fleet companies for filter dropdown
    const fleetCompanies = useMemo(() => {
        const companies = new Set();
        tradeIns.forEach(t => {
            if (t.fleetCompany) companies.add(t.fleetCompany);
        });
        return Array.from(companies).sort();
    }, [tradeIns]);

    // Get date from trade-in for filtering
    const getTradeInDate = (tradeIn) => {
        if (tradeIn.dateAdded) {
            return new Date(tradeIn.dateAdded);
        }
        return null;
    };

    // Filter and sort trade-ins
    const filteredTradeIns = useMemo(() => {
        let result = [...tradeIns];

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(t =>
                t.stockNumber?.toLowerCase().includes(searchLower) ||
                t.vin?.toLowerCase().includes(searchLower) ||
                t.make?.toLowerCase().includes(searchLower) ||
                t.model?.toLowerCase().includes(searchLower) ||
                t.customerName?.toLowerCase().includes(searchLower) ||
                t.fleetCompany?.toLowerCase().includes(searchLower) ||
                t.operationCompany?.toLowerCase().includes(searchLower)
            );
        }

        // Fleet company filter
        if (fleetFilter) {
            result = result.filter(t => t.fleetCompany === fleetFilter);
        }

        // Month filter
        if (monthFilter) {
            const [year, month] = monthFilter.split('-').map(Number);
            result = result.filter(t => {
                const date = getTradeInDate(t);
                if (!date) return false;
                return date.getFullYear() === year && date.getMonth() + 1 === month;
            });
        }

        // Picked up filter
        if (pickedUpFilter === "pending") {
            result = result.filter(t => !t.pickedUp);
        } else if (pickedUpFilter === "picked-up") {
            result = result.filter(t => t.pickedUp);
        }

        // Sort: not picked up first, then picked up
        result.sort((a, b) => {
            if (a.pickedUp && !b.pickedUp) return 1;
            if (!a.pickedUp && b.pickedUp) return -1;
            // Within same status, sort by date (newest first)
            const dateA = getTradeInDate(a);
            const dateB = getTradeInDate(b);
            if (dateA && dateB) return dateB - dateA;
            return 0;
        });

        return result;
    }, [tradeIns, search, fleetFilter, monthFilter, pickedUpFilter]);

    // Generate month options for filter (last 12 months)
    const monthOptions = useMemo(() => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${date.getMonth() + 1}`;
            const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            options.push({ value, label });
        }
        return options;
    }, []);

    // Count stats
    const pendingCount = tradeIns.filter(t => !t.pickedUp).length;
    const pickedUpCount = tradeIns.filter(t => t.pickedUp).length;

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
            >
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">Trade-Ins</h1>
                    <p className="text-slate-400 text-sm">
                        {pendingCount} pending • {pickedUpCount} picked up • {filteredTradeIns.length} shown
                    </p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Trade-In
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
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search trade-ins..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 bg-slate-800/50 border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                    </div>

                    {/* Fleet Company Filter */}
                    <Select
                        value={fleetFilter}
                        onChange={(e) => setFleetFilter(e.target.value)}
                        className="sm:w-44"
                    >
                        <option value="">All Fleet Companies</option>
                        {fleetCompanies.map(company => (
                            <option key={company} value={company}>{company}</option>
                        ))}
                    </Select>

                    {/* Month Filter */}
                    <Select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="sm:w-44"
                    >
                        <option value="">All Months</option>
                        {monthOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </Select>

                    {/* Picked Up Filter */}
                    <Select
                        value={pickedUpFilter}
                        onChange={(e) => setPickedUpFilter(e.target.value)}
                        className="sm:w-36"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="picked-up">Picked Up</option>
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
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Stock #</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicle</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">VIN</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Fleet</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Operation Co</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Mileage</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-slate-500">Loading...</td>
                                </tr>
                            ) : filteredTradeIns.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-slate-500">No trade-ins found</td>
                                </tr>
                            ) : (
                                filteredTradeIns.map((tradeIn, index) => (
                                    <motion.tr
                                        key={tradeIn.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.02 }}
                                        className={`border-b border-slate-700/50 cursor-pointer transition-colors ${tradeIn.pickedUp
                                                ? 'bg-slate-800/30 opacity-60 hover:opacity-80'
                                                : 'hover:bg-primary/10'
                                            }`}
                                        onClick={() => setSelectedTradeIn(tradeIn)}
                                    >
                                        <td className="px-4 py-3">
                                            <Badge variant={tradeIn.pickedUp ? "sold" : "pending-pickup"} className="text-xs">
                                                {tradeIn.pickedUp ? "Picked Up" : "Pending"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-primary">
                                            {tradeIn.stockNumber || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            <div>
                                                <span className="font-medium">{tradeIn.year} {tradeIn.make} {tradeIn.model}</span>
                                                {tradeIn.color && (
                                                    <span className="text-slate-500 ml-2">({tradeIn.color})</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400 font-mono">
                                            {tradeIn.vin?.slice(-8) || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {tradeIn.customerName || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {tradeIn.fleetCompany || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {tradeIn.operationCompany || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {tradeIn.mileage?.toLocaleString() || "-"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Button
                                                variant={tradeIn.pickedUp ? "secondary" : "primary"}
                                                size="sm"
                                                onClick={(e) => handleTogglePickup(tradeIn.id, e)}
                                            >
                                                {tradeIn.pickedUp ? (
                                                    <>
                                                        <Truck className="h-3 w-3" />
                                                        Undo
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="h-3 w-3" />
                                                        Picked Up
                                                    </>
                                                )}
                                            </Button>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Add Trade-In Modal */}
            <AddTradeInModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    setIsAddModalOpen(false);
                    loadTradeIns();
                }}
            />

            {/* Trade-In Detail Modal */}
            <TradeInDetailModal
                tradeIn={selectedTradeIn}
                isOpen={!!selectedTradeIn}
                onClose={() => setSelectedTradeIn(null)}
                onUpdate={loadTradeIns}
            />
        </div>
    );
}

function AddTradeInModal({ isOpen, onClose, onSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        vin: "",
        year: "",
        make: "",
        model: "",
        color: "",
        mileage: "",
        notes: "",
    });

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            await tradeInsApi.add(formData);
            onSuccess();
            setFormData({ vin: "", year: "", make: "", model: "", color: "", mileage: "", notes: "" });
        } catch (error) {
            console.error("Failed to add trade-in:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Trade-In Vehicle"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? "Adding..." : "Add Trade-In"}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <Input
                    label="VIN"
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                    maxLength={17}
                    required
                />
                <FormRow>
                    <Input
                        label="Year"
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        required
                    />
                    <Input
                        label="Make"
                        value={formData.make}
                        onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                        required
                    />
                </FormRow>
                <FormRow>
                    <Input
                        label="Model"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        required
                    />
                    <Input
                        label="Color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        required
                    />
                </FormRow>
                <FormRow>
                    <Input
                        label="Mileage"
                        type="number"
                        value={formData.mileage}
                        onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    />
                    <Input
                        label="Notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                </FormRow>
            </div>
        </SimpleModal>
    );
}
