import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Plus, Check, Truck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { SimpleModal } from "../components/ui/animated-modal";
import { Input, FormRow } from "../components/ui/input";
import { tradeIns as tradeInsApi } from "../services/api";
import TradeInDetailModal from "../components/modals/TradeInDetailModal";

export default function TradeIns() {
    const [tradeIns, setTradeIns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedTradeIn, setSelectedTradeIn] = useState(null);

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

    const handleTogglePickup = async (id) => {
        try {
            await tradeInsApi.togglePickup(id);
            loadTradeIns();
        } catch (error) {
            console.error("Failed to toggle pickup:", error);
        }
    };

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
                    <p className="text-slate-400 text-sm">{tradeIns.length} trade-in vehicles</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Trade-In
                </Button>
            </motion.div>

            {/* Trade-ins Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <p className="text-slate-500 col-span-full text-center py-12">Loading...</p>
                ) : tradeIns.length === 0 ? (
                    <p className="text-slate-500 col-span-full text-center py-12">No trade-ins found</p>
                ) : (
                    tradeIns.map((tradeIn, index) => (
                        <motion.div
                            key={tradeIn.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="glass rounded-xl p-5 cursor-pointer hover:border-primary/30 transition-all"
                            onClick={() => setSelectedTradeIn(tradeIn)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="text-xs text-slate-500 mb-0.5">{tradeIn.stockNumber || 'No Stock #'}</p>
                                    <h3 className="font-semibold text-slate-100">
                                        {tradeIn.year} {tradeIn.make} {tradeIn.model}
                                    </h3>
                                    <p className="text-sm text-slate-400">{tradeIn.vin}</p>
                                </div>
                                <Badge variant={tradeIn.pickedUp ? "sold" : "pending-pickup"}>
                                    {tradeIn.pickedUp ? "Picked Up" : "Pending"}
                                </Badge>
                            </div>

                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Customer</span>
                                    <span className="text-slate-300 truncate max-w-[150px]" title={tradeIn.customerName}>{tradeIn.customerName || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Fleet Co</span>
                                    <span className="text-slate-300 truncate max-w-[150px]" title={tradeIn.fleetCompany}>{tradeIn.fleetCompany || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Op Co</span>
                                    <span className="text-slate-300 truncate max-w-[150px]" title={tradeIn.operationCompany}>{tradeIn.operationCompany || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Color</span>
                                    <span className="text-slate-300">{tradeIn.color || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Mileage</span>
                                    <span className="text-slate-300">{tradeIn.mileage?.toLocaleString() || "-"}</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-700/50">
                                <Button
                                    variant={tradeIn.pickedUp ? "secondary" : "primary"}
                                    size="sm"
                                    className="w-full"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleTogglePickup(tradeIn.id);
                                    }}
                                >
                                    {tradeIn.pickedUp ? (
                                        <>
                                            <Truck className="h-4 w-4" />
                                            Mark Not Picked Up
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Mark as Picked Up
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

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
        </div >
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

