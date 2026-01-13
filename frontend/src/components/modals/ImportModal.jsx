import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, FileJson, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { dataTransfer } from '../../services/api';

export default function ImportModal({ isOpen, onClose, onImportSuccess }) {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [duplicateAction, setDuplicateAction] = useState('skip');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.json')) {
            setError('Please select a JSON file');
            return;
        }

        setFile(selectedFile);
        setError(null);
        setResult(null);

        try {
            const text = await selectedFile.text();
            const data = JSON.parse(text);

            // Validate the file structure
            if (!data.exportInfo || data.exportInfo.source !== 'SubaruFleetInventory') {
                setError('Invalid export file. Please select a valid SubaruFleetInventory export.');
                setPreviewData(null);
                return;
            }

            setPreviewData({
                exportDate: data.exportInfo?.exportDate,
                version: data.exportInfo?.version,
                inventory: data.inventory?.length || 0,
                soldVehicles: data.soldVehicles?.length || 0,
                tradeIns: data.tradeIns?.length || 0,
                documents: data.documents?.length || 0,
                rawData: data
            });
        } catch (err) {
            setError('Failed to parse JSON file: ' + err.message);
            setPreviewData(null);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            const fakeEvent = { target: { files: [droppedFile] } };
            handleFileSelect(fakeEvent);
        }
    };

    const handleImport = async () => {
        if (!previewData?.rawData) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await dataTransfer.importData(previewData.rawData, duplicateAction);
            setResult(response);
            if (onImportSuccess) {
                onImportSuccess(response);
            }
        } catch (err) {
            setError(err.message || 'Import failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreviewData(null);
        setResult(null);
        setError(null);
        setDuplicateAction('skip');
        onClose();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
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
                    onClick={(e) => e.target === e.currentTarget && !isLoading && handleClose()}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-strong rounded-2xl w-full max-w-lg overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
                            <h2 className="text-xl font-bold text-slate-100">Import Data</h2>
                            <button
                                onClick={handleClose}
                                disabled={isLoading}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Result Display */}
                            {result && (
                                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                                    <div className="flex items-center gap-2 text-green-400 font-medium mb-3">
                                        <CheckCircle className="h-5 w-5" />
                                        Import Completed
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                        <div className="text-center p-2 bg-slate-800/50 rounded-lg">
                                            <div className="text-lg font-bold text-green-400">{result.summary?.totalImported || 0}</div>
                                            <div className="text-slate-400">Imported</div>
                                        </div>
                                        <div className="text-center p-2 bg-slate-800/50 rounded-lg">
                                            <div className="text-lg font-bold text-yellow-400">{result.summary?.totalSkipped || 0}</div>
                                            <div className="text-slate-400">Skipped</div>
                                        </div>
                                        <div className="text-center p-2 bg-slate-800/50 rounded-lg">
                                            <div className="text-lg font-bold text-red-400">{result.summary?.totalErrors || 0}</div>
                                            <div className="text-slate-400">Errors</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs text-slate-400 space-y-1">
                                        <div>Inventory: {result.results?.inventory?.imported || 0} imported, {result.results?.inventory?.skipped || 0} skipped</div>
                                        <div>Sold Vehicles: {result.results?.soldVehicles?.imported || 0} imported, {result.results?.soldVehicles?.skipped || 0} skipped</div>
                                        <div>Trade-Ins: {result.results?.tradeIns?.imported || 0} imported, {result.results?.tradeIns?.skipped || 0} skipped</div>
                                    </div>
                                </div>
                            )}

                            {/* Error Display */}
                            {error && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                                    <div className="flex items-center gap-2 text-red-400">
                                        <XCircle className="h-5 w-5 shrink-0" />
                                        <span className="text-sm">{error}</span>
                                    </div>
                                </div>
                            )}

                            {/* File Upload Area */}
                            {!result && (
                                <>
                                    <div
                                        className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".json"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        {file ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <FileJson className="h-8 w-8 text-primary" />
                                                <div className="text-left">
                                                    <div className="text-sm font-medium text-slate-200">{file.name}</div>
                                                    <div className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                                                <p className="text-sm text-slate-300">Drop a JSON export file here or click to browse</p>
                                                <p className="text-xs text-slate-500 mt-1">Only .json files are accepted</p>
                                            </>
                                        )}
                                    </div>

                                    {/* Preview Data */}
                                    {previewData && (
                                        <>
                                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-600/50">
                                                <h3 className="text-sm font-medium text-slate-300 mb-3">Export File Summary</h3>
                                                <div className="text-xs text-slate-400 space-y-1 mb-3">
                                                    <div>Exported: {formatDate(previewData.exportDate)}</div>
                                                    <div>Version: {previewData.version || 'Unknown'}</div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div className="p-2 bg-slate-700/50 rounded-lg">
                                                        <span className="text-slate-400">Inventory:</span>
                                                        <span className="text-slate-200 ml-2 font-medium">{previewData.inventory}</span>
                                                    </div>
                                                    <div className="p-2 bg-slate-700/50 rounded-lg">
                                                        <span className="text-slate-400">Sold:</span>
                                                        <span className="text-slate-200 ml-2 font-medium">{previewData.soldVehicles}</span>
                                                    </div>
                                                    <div className="p-2 bg-slate-700/50 rounded-lg">
                                                        <span className="text-slate-400">Trade-Ins:</span>
                                                        <span className="text-slate-200 ml-2 font-medium">{previewData.tradeIns}</span>
                                                    </div>
                                                    <div className="p-2 bg-slate-700/50 rounded-lg">
                                                        <span className="text-slate-400">Documents:</span>
                                                        <span className="text-slate-200 ml-2 font-medium">{previewData.documents}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Document Warning */}
                                            {previewData.documents > 0 && (
                                                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                                                    <div className="flex items-start gap-2 text-yellow-400 text-sm">
                                                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                                        <span>Document metadata will be imported, but actual PDF files are not included in exports. Uploaded PDFs will need to be re-uploaded.</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Duplicate Handling */}
                                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-600/50">
                                                <h3 className="text-sm font-medium text-slate-300 mb-3">Duplicate Handling</h3>
                                                <p className="text-xs text-slate-400 mb-3">
                                                    What should happen if a vehicle with the same VIN already exists?
                                                </p>
                                                <div className="flex gap-3">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="duplicateAction"
                                                            value="skip"
                                                            checked={duplicateAction === 'skip'}
                                                            onChange={(e) => setDuplicateAction(e.target.value)}
                                                            className="w-4 h-4 text-primary"
                                                        />
                                                        <span className="text-sm text-slate-300">Skip duplicates</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="duplicateAction"
                                                            value="overwrite"
                                                            checked={duplicateAction === 'overwrite'}
                                                            onChange={(e) => setDuplicateAction(e.target.value)}
                                                            className="w-4 h-4 text-primary"
                                                        />
                                                        <span className="text-sm text-slate-300">Overwrite existing</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 p-5 border-t border-slate-700/50">
                            <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
                                {result ? 'Close' : 'Cancel'}
                            </Button>
                            {!result && previewData && (
                                <Button onClick={handleImport} disabled={isLoading}>
                                    {isLoading ? (
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
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
