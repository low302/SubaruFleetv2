import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { inventory as inventoryApi } from '../../services/api';

export default function CSVImportModal({ isOpen, onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [errors, setErrors] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const [results, setResults] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setErrors([]);
        setResults(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            parseCSV(text);
        };
        reader.readAsText(selectedFile);
    };

    const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const parseCSV = (text) => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            setErrors(['CSV file is empty or invalid']);
            return;
        }

        const headers = parseCSVLine(lines[0]);
        const requiredHeaders = ['Stock Number', 'VIN', 'Year', 'Make', 'Model'];
        const missingHeaders = requiredHeaders.filter(h =>
            !headers.some(header => header.toLowerCase().includes(h.toLowerCase()))
        );

        if (missingHeaders.length > 0) {
            setErrors([`Missing required columns: ${missingHeaders.join(', ')}`]);
            return;
        }

        const vehicles = [];
        const parseErrors = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < 5) continue;

            const vehicle = {
                stockNumber: values[0],
                vin: values[1]?.toUpperCase() || '',
                year: parseInt(values[2]) || 0,
                make: values[3],
                model: values[4],
                trim: values[5] || '',
                color: values[6] || '',
                fleetCompany: values[7] || '',
                operationCompany: values[8] || '',
                status: values[9] ? values[9].trim().toLowerCase().replace(/\s+/g, '-') : 'in-stock',
                inStockDate: values[10] ? new Date(values[10]).toISOString() : null,
            };

            // VIN validation
            const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
            if (!vinPattern.test(vehicle.vin)) {
                parseErrors.push(`Row ${i + 1}: Invalid VIN format - ${vehicle.vin}`);
                continue;
            }

            if (vehicle.year < 2000 || vehicle.year > 2030) {
                parseErrors.push(`Row ${i + 1}: Invalid year - ${vehicle.year}`);
                continue;
            }

            vehicles.push(vehicle);
        }

        setPreview({ vehicles, count: vehicles.length });
        setErrors(parseErrors);
    };

    const handleImport = async () => {
        if (!preview || preview.count === 0) return;

        setIsImporting(true);
        let successCount = 0;
        let failCount = 0;
        let duplicateCount = 0;
        const importErrors = [];

        // Get existing vehicles to check for duplicates
        try {
            const existingVehicles = await inventoryApi.getAll();
            const existingVINs = new Set(existingVehicles.map(v => v.vin?.toUpperCase()));

            for (const vehicle of preview.vehicles) {
                if (existingVINs.has(vehicle.vin)) {
                    duplicateCount++;
                    importErrors.push(`${vehicle.stockNumber}: Duplicate VIN`);
                    continue;
                }

                try {
                    await inventoryApi.add(vehicle);
                    successCount++;
                    existingVINs.add(vehicle.vin);
                } catch (error) {
                    failCount++;
                    importErrors.push(`${vehicle.stockNumber}: ${error.message}`);
                }
            }

            setResults({
                success: successCount,
                failed: failCount,
                duplicates: duplicateCount,
            });

            if (successCount > 0) {
                setTimeout(() => {
                    onSuccess?.();
                    handleClose();
                }, 2000);
            }
        } catch (error) {
            setErrors([`Import failed: ${error.message}`]);
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreview(null);
        setErrors([]);
        setResults(null);
        onClose();
    };

    const downloadTemplate = () => {
        const headers = ['Stock Number', 'VIN', 'Year', 'Make', 'Model', 'Trim', 'Color', 'Fleet Company', 'Operation Company', 'Status', 'In Stock Date'];
        const example = ['SUB001', '1HGBH41JXMN109186', '2024', 'Subaru', 'Outback', 'Premium', 'Crystal White', 'Acme Fleet', 'Northeast Ops', 'In Stock', '2024-01-05'];

        const csv = [headers.join(','), example.join(',')].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vehicle-import-template.csv';
        a.click();
        URL.revokeObjectURL(url);
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
                        className="glass-strong rounded-2xl w-full max-w-lg overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
                            <h2 className="text-xl font-bold text-slate-100">Import Vehicles from CSV</h2>
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4">
                            {/* Upload Area */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                            >
                                <Upload className="h-10 w-10 mx-auto text-slate-500 mb-3" />
                                <p className="text-sm text-slate-300 mb-1">
                                    {file ? file.name : 'Click to select CSV file'}
                                </p>
                                <p className="text-xs text-slate-500">or drag and drop</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>

                            {/* Template Download */}
                            <button
                                onClick={downloadTemplate}
                                className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                                <Download className="h-4 w-4" />
                                Download CSV Template
                            </button>

                            {/* Preview */}
                            {preview && (
                                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <div className="flex items-center gap-2 text-green-400">
                                        <FileSpreadsheet className="h-5 w-5" />
                                        <span className="font-medium">{preview.count} vehicles ready to import</span>
                                    </div>
                                </div>
                            )}

                            {/* Errors */}
                            {errors.length > 0 && (
                                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 max-h-32 overflow-y-auto">
                                    <div className="flex items-center gap-2 text-red-400 mb-2">
                                        <AlertCircle className="h-5 w-5" />
                                        <span className="font-medium">{errors.length} errors found</span>
                                    </div>
                                    {errors.slice(0, 5).map((err, i) => (
                                        <p key={i} className="text-xs text-red-300">{err}</p>
                                    ))}
                                    {errors.length > 5 && (
                                        <p className="text-xs text-red-400 mt-1">...and {errors.length - 5} more</p>
                                    )}
                                </div>
                            )}

                            {/* Results */}
                            {results && (
                                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <div className="flex items-center gap-2 text-green-400 mb-2">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-medium">Import Complete</span>
                                    </div>
                                    <p className="text-sm text-slate-300">
                                        ✅ {results.success} imported
                                        {results.duplicates > 0 && ` • ⚠️ ${results.duplicates} duplicates skipped`}
                                        {results.failed > 0 && ` • ❌ ${results.failed} failed`}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 p-5 border-t border-slate-700/50">
                            <Button variant="secondary" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={!preview || preview.count === 0 || isImporting}
                            >
                                {isImporting ? 'Importing...' : 'Import Vehicles'}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
