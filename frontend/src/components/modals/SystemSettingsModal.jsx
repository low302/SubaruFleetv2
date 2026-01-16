import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wrench, Search, Loader2, CheckCircle, AlertTriangle, Tag, Printer, Download, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { inventory as inventoryApi, dataTransfer } from '../../services/api';
import LabelPrintModal from './LabelPrintModal';

export default function SystemSettingsModal({ isOpen, onClose }) {
    const [isFixingDates, setIsFixingDates] = useState(false);
    const [fixDatesResult, setFixDatesResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);

    // Label Tool state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [allVehicles, setAllVehicles] = useState([]);

    // Import/Export state
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useState(null);

    // Load vehicles on mount
    useEffect(() => {
        if (isOpen) {
            loadVehicles();
        }
    }, [isOpen]);

    const loadVehicles = async () => {
        try {
            const data = await inventoryApi.getAll();
            setAllVehicles(data);
        } catch (error) {
            console.error('Failed to load vehicles:', error);
        }
    };

    // Search vehicles
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const query = searchQuery.toLowerCase();
        const filtered = allVehicles.filter(v =>
            v.stockNumber?.toLowerCase().includes(query) ||
            v.vin?.toLowerCase().includes(query) ||
            `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(query)
        ).slice(0, 10);

        setSearchResults(filtered);
        setIsSearching(false);
    }, [searchQuery, allVehicles]);

    if (!isOpen) return null;

    const handleFixInTransitDates = async () => {
        if (!confirm('This will clear the in-stock date for ALL vehicles currently in "In-Transit" status. Continue?')) {
            return;
        }

        setIsFixingDates(true);
        setFixDatesResult(null);

        try {
            const result = await inventoryApi.clearInStockDates();
            setFixDatesResult({
                success: true,
                message: result.message || 'Successfully fixed in-transit dates!'
            });
        } catch (error) {
            setFixDatesResult({
                success: false,
                message: error.message || 'Failed to fix in-transit dates'
            });
        } finally {
            setIsFixingDates(false);
        }
    };

    const handleScanDuplicates = async () => {
        setIsScanning(true);
        setScanResult(null);

        try {
            // Get all inventory data
            const data = await inventoryApi.getAll();

            // Find duplicates by VIN
            const vinCounts = {};
            data.forEach(v => {
                if (v.vin) {
                    if (!vinCounts[v.vin]) {
                        vinCounts[v.vin] = [];
                    }
                    vinCounts[v.vin].push(v);
                }
            });

            const duplicates = Object.entries(vinCounts)
                .filter(([vin, vehicles]) => vehicles.length > 1)
                .map(([vin, vehicles]) => ({
                    vin,
                    count: vehicles.length,
                    vehicles: vehicles.map(v => ({
                        id: v.id,
                        stockNumber: v.stockNumber,
                        year: v.year,
                        make: v.make,
                        model: v.model,
                        dateAdded: v.dateAdded
                    }))
                }));

            if (duplicates.length === 0) {
                setScanResult({
                    success: true,
                    message: 'No duplicate vehicles found!',
                    duplicates: []
                });
            } else {
                setScanResult({
                    success: true,
                    message: `Found ${duplicates.length} VINs with duplicates`,
                    duplicates
                });
            }
        } catch (error) {
            setScanResult({
                success: false,
                message: error.message || 'Failed to scan for duplicates'
            });
        } finally {
            setIsScanning(false);
        }
    };

    const handleRemoveDuplicate = async (vehicleId) => {
        if (!confirm('Are you sure you want to delete this duplicate vehicle?')) {
            return;
        }

        try {
            await inventoryApi.delete(vehicleId);
            // Re-scan after deletion
            handleScanDuplicates();
        } catch (error) {
            alert('Failed to delete vehicle: ' + error.message);
        }
    };

    const handleSelectVehicle = (vehicle) => {
        setSelectedVehicle(vehicle);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleOpenLabelModal = () => {
        if (selectedVehicle) {
            setShowLabelModal(true);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const data = await dataTransfer.exportAll();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fleet-inventory-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setImportResult({ success: true, message: 'Export completed successfully!' });
        } catch (error) {
            console.error('Export failed:', error);
            setImportResult({ success: false, message: 'Export failed: ' + error.message });
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportResult(null);

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const result = await dataTransfer.importAll(data);
            setImportResult({
                success: true,
                message: `Import successful! ${result.imported || 'Data'} imported.`
            });
            // Reload page to refresh data
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error('Import failed:', error);
            setImportResult({ success: false, message: 'Import failed: ' + error.message });
        } finally {
            setIsImporting(false);
            event.target.value = '';
        }
    };

    const handleClose = () => {
        setFixDatesResult(null);
        setScanResult(null);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedVehicle(null);
        setImportResult(null);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={(e) => e.target === e.currentTarget && handleClose()}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-strong rounded-2xl w-full max-w-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
                            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                <span>⚙️</span>
                                System Settings
                            </h2>
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Label Tool Section */}
                            <div>
                                <h3 className="text-base font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-600/50">
                                    Label Tool
                                </h3>

                                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-600/50">
                                    <div className="flex items-start gap-4">
                                        <div className="text-2xl">🏷️</div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-slate-200 mb-1">
                                                Generate Vehicle Labels
                                            </h4>
                                            <p className="text-xs text-slate-400 mb-3">
                                                Search for a vehicle by stock number, VIN, or description to generate folder labels or key tags.
                                            </p>

                                            {/* Search Input */}
                                            <div className="relative mb-3">
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search by stock #, VIN, or vehicle..."
                                                    className="w-full px-3 py-2 pl-9 rounded-lg text-sm text-slate-200 bg-slate-700/50 border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                {isSearching && (
                                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 animate-spin" />
                                                )}
                                            </div>

                                            {/* Search Results */}
                                            {searchResults.length > 0 && (
                                                <div className="max-h-40 overflow-y-auto rounded-lg bg-slate-700/50 border border-slate-600/50 mb-3">
                                                    {searchResults.map((v) => (
                                                        <button
                                                            key={v.id}
                                                            onClick={() => handleSelectVehicle(v)}
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-600/50 transition-colors flex items-center justify-between"
                                                        >
                                                            <span className="text-slate-200">
                                                                {v.stockNumber} - {v.year} {v.make} {v.model}
                                                            </span>
                                                            <span className="text-xs text-slate-500 font-mono">
                                                                {v.vin?.slice(-8)}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Selected Vehicle */}
                                            {selectedVehicle && (
                                                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 mb-3">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-200">
                                                                {selectedVehicle.stockNumber} - {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                                                            </p>
                                                            <p className="text-xs text-slate-400 font-mono">
                                                                VIN: {selectedVehicle.vin}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => setSelectedVehicle(null)}
                                                            className="p-1 rounded text-slate-400 hover:text-slate-200"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <Button
                                                variant="secondary"
                                                className="w-full"
                                                onClick={handleOpenLabelModal}
                                                disabled={!selectedVehicle}
                                            >
                                                <Tag className="h-4 w-4 mr-2" />
                                                Generate Label
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Data Management Section */}
                            <div>
                                <h3 className="text-base font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-600/50">
                                    Data Management
                                </h3>

                                {/* Fix In-Transit Dates */}
                                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-600/50 mb-4">
                                    <div className="flex items-start gap-4">
                                        <div className="text-2xl">🔧</div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-slate-200 mb-1">
                                                Fix In-Transit Dates
                                            </h4>
                                            <p className="text-xs text-slate-400 mb-3">
                                                Remove in-stock dates from all vehicles currently marked as "In-Transit".
                                                This ensures accurate inventory tracking.
                                            </p>

                                            {fixDatesResult && (
                                                <div className={`p-2 rounded-lg mb-3 text-sm flex items-center gap-2 ${fixDatesResult.success
                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                                    }`}>
                                                    {fixDatesResult.success ? (
                                                        <CheckCircle className="h-4 w-4" />
                                                    ) : (
                                                        <AlertTriangle className="h-4 w-4" />
                                                    )}
                                                    {fixDatesResult.message}
                                                </div>
                                            )}

                                            <Button
                                                variant="secondary"
                                                className="w-full"
                                                onClick={handleFixInTransitDates}
                                                disabled={isFixingDates}
                                            >
                                                {isFixingDates ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Running Fix...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wrench className="h-4 w-4 mr-2" />
                                                        Run Fix
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Remove Duplicates */}
                                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-600/50">
                                    <div className="flex items-start gap-4">
                                        <div className="text-2xl">🔍</div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-slate-200 mb-1">
                                                Remove Duplicate Vehicles
                                            </h4>
                                            <p className="text-xs text-slate-400 mb-3">
                                                Scan for and remove duplicate vehicles based on VIN numbers.
                                                Review duplicates before removing.
                                            </p>

                                            {scanResult && (
                                                <div className={`p-2 rounded-lg mb-3 text-sm ${scanResult.success
                                                    ? scanResult.duplicates?.length > 0
                                                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                                                        : 'bg-green-500/10 text-green-400 border border-green-500/30'
                                                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                                    }`}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {scanResult.success && scanResult.duplicates?.length === 0 ? (
                                                            <CheckCircle className="h-4 w-4" />
                                                        ) : (
                                                            <AlertTriangle className="h-4 w-4" />
                                                        )}
                                                        {scanResult.message}
                                                    </div>

                                                    {/* Duplicate list */}
                                                    {scanResult.duplicates?.length > 0 && (
                                                        <div className="space-y-2 mt-3">
                                                            {scanResult.duplicates.map((dup) => (
                                                                <div key={dup.vin} className="p-2 bg-slate-700/50 rounded-lg">
                                                                    <div className="text-xs text-slate-300 font-mono mb-1">
                                                                        VIN: {dup.vin} ({dup.count} vehicles)
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        {dup.vehicles.map((v, idx) => (
                                                                            <div key={v.id} className="flex items-center justify-between text-xs">
                                                                                <span className="text-slate-400">
                                                                                    {v.stockNumber} - {v.year} {v.make} {v.model}
                                                                                    {idx === 0 && <span className="text-green-400 ml-1">(oldest)</span>}
                                                                                </span>
                                                                                {idx > 0 && (
                                                                                    <button
                                                                                        onClick={() => handleRemoveDuplicate(v.id)}
                                                                                        className="text-red-400 hover:text-red-300 underline"
                                                                                    >
                                                                                        Remove
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <Button
                                                variant="secondary"
                                                className="w-full"
                                                onClick={handleScanDuplicates}
                                                disabled={isScanning}
                                            >
                                                {isScanning ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Scanning...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Search className="h-4 w-4 mr-2" />
                                                        Scan & Remove Duplicates
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Import/Export Section */}
                            <div>
                                <h3 className="text-base font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-600/50">
                                    Import / Export Data
                                </h3>

                                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-600/50">
                                    <div className="flex items-start gap-4">
                                        <div className="text-2xl">📦</div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-slate-200 mb-1">
                                                Backup & Restore Data
                                            </h4>
                                            <p className="text-xs text-slate-400 mb-3">
                                                Export all inventory data as a JSON file for backup, or import data from a previous export.
                                            </p>

                                            {importResult && (
                                                <div className={`p-2 rounded-lg mb-3 text-sm flex items-center gap-2 ${importResult.success
                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                                    }`}>
                                                    {importResult.success ? (
                                                        <CheckCircle className="h-4 w-4" />
                                                    ) : (
                                                        <AlertTriangle className="h-4 w-4" />
                                                    )}
                                                    {importResult.message}
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="secondary"
                                                    className="flex-1"
                                                    onClick={handleExport}
                                                    disabled={isExporting}
                                                >
                                                    {isExporting ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Exporting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Export Data
                                                        </>
                                                    )}
                                                </Button>

                                                <label className="flex-1">
                                                    <input
                                                        type="file"
                                                        accept=".json"
                                                        onChange={handleImportFile}
                                                        className="hidden"
                                                        disabled={isImporting}
                                                    />
                                                    <Button
                                                        variant="secondary"
                                                        className="w-full"
                                                        as="span"
                                                        disabled={isImporting}
                                                        onClick={(e) => e.target.closest('label').querySelector('input').click()}
                                                    >
                                                        {isImporting ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                Importing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="h-4 w-4 mr-2" />
                                                                Import Data
                                                            </>
                                                        )}
                                                    </Button>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end p-5 border-t border-slate-700/50">
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Label Print Modal */}
            <LabelPrintModal
                vehicle={selectedVehicle}
                isOpen={showLabelModal}
                onClose={() => setShowLabelModal(false)}
            />
        </AnimatePresence>
    );
}

