import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit2, Save, Trash2, Check, Truck, Printer } from 'lucide-react';
import { Button } from '../ui/button';
import { Input, FormRow } from '../ui/input';
import { Badge } from '../ui/badge';
import { tradeIns as tradeInsApi } from '../../services/api';
import LabelPrintModal from './LabelPrintModal';

export default function TradeInDetailModal({ tradeIn, isOpen, onClose, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showLabelModal, setShowLabelModal] = useState(false);

    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (tradeIn) {
            setFormData({
                vin: tradeIn.vin || '',
                year: tradeIn.year || '',
                make: tradeIn.make || '',
                model: tradeIn.model || '',
                color: tradeIn.color || '',
                mileage: tradeIn.mileage || '',
                notes: tradeIn.notes || '',
            });
            setIsEditing(false);
        }
    }, [tradeIn]);

    if (!isOpen || !tradeIn) return null;

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await tradeInsApi.update(tradeIn.id, formData);
            setIsEditing(false);
            onUpdate?.();
        } catch (error) {
            console.error('Failed to save trade-in:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await tradeInsApi.delete(tradeIn.id);
            onClose();
            onUpdate?.();
        } catch (error) {
            console.error('Failed to delete trade-in:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTogglePickup = async () => {
        setIsLoading(true);
        try {
            await tradeInsApi.togglePickup(tradeIn.id);
            onUpdate?.();
        } catch (error) {
            console.error('Failed to toggle pickup:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="glass-strong rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-100">
                                    {tradeIn.year} {tradeIn.make} {tradeIn.model}
                                </h2>
                                <p className="text-sm text-slate-400 mt-0.5">{tradeIn.vin}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={tradeIn.pickedUp ? 'sold' : 'pending-pickup'}>
                                    {tradeIn.pickedUp ? 'Picked Up' : 'Pending'}
                                </Badge>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 overflow-y-auto max-h-[60vh]">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <Input
                                        label="VIN"
                                        value={formData.vin}
                                        onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                                    />
                                    <FormRow>
                                        <Input
                                            label="Year"
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                        />
                                        <Input
                                            label="Make"
                                            value={formData.make}
                                            onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                                        />
                                    </FormRow>
                                    <FormRow>
                                        <Input
                                            label="Model"
                                            value={formData.model}
                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                        />
                                        <Input
                                            label="Color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        />
                                    </FormRow>
                                    <Input
                                        label="Mileage"
                                        type="number"
                                        value={formData.mileage}
                                        onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                                    />
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg text-sm text-slate-200 bg-slate-800/50 border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <InfoItem label="VIN" value={tradeIn.vin} />
                                        <InfoItem label="Stock #" value={tradeIn.stockNumber} />
                                        <InfoItem label="Year" value={tradeIn.year} />
                                        <InfoItem label="Make" value={tradeIn.make} />
                                        <InfoItem label="Model" value={tradeIn.model} />
                                        <InfoItem label="Color" value={tradeIn.color} />
                                        <InfoItem label="Mileage" value={tradeIn.mileage?.toLocaleString()} />
                                    </div>
                                    {tradeIn.notes && (
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Notes</p>
                                            <p className="text-sm text-slate-300">{tradeIn.notes}</p>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-slate-700/50 flex gap-3">
                                        <Button
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={() => setShowLabelModal(true)}
                                        >
                                            <Printer className="h-4 w-4" />
                                            Print Label
                                        </Button>
                                        <Button
                                            variant={tradeIn.pickedUp ? 'secondary' : 'primary'}
                                            className="flex-1"
                                            onClick={handleTogglePickup}
                                            disabled={isLoading}
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
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between p-5 border-t border-slate-700/50">
                            <Button
                                variant="secondary"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <Button variant="secondary" onClick={() => setIsEditing(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleSave} disabled={isLoading}>
                                            <Save className="h-4 w-4" />
                                            Save Changes
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="secondary" onClick={() => setIsEditing(true)}>
                                        <Edit2 className="h-4 w-4" />
                                        Edit
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Delete Confirmation */}
                        {showDeleteConfirm && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
                                <div className="glass rounded-xl p-6 max-w-sm">
                                    <h3 className="text-lg font-semibold text-slate-100 mb-2">Delete Trade-In?</h3>
                                    <p className="text-sm text-slate-400 mb-4">
                                        This will permanently delete this trade-in. This action cannot be undone.
                                    </p>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                                            Cancel
                                        </Button>
                                        <Button
                                            className="bg-red-600 hover:bg-red-700"
                                            onClick={handleDelete}
                                            disabled={isLoading}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Label Print Modal */}
                        <LabelPrintModal
                            vehicle={tradeIn}
                            isOpen={showLabelModal}
                            onClose={() => setShowLabelModal(false)}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function InfoItem({ label, value, className = '' }) {
    return (
        <div className={className}>
            <p className="text-xs text-slate-500 mb-0.5">{label}</p>
            <p className="text-sm text-slate-200">{value || '-'}</p>
        </div>
    );
}

