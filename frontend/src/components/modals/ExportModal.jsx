import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { downloadCSV, downloadExcel } from '../../utils/exportUtils';

export default function ExportModal({
    isOpen,
    onClose,
    data,
    columns,
    title = 'Export Data',
    filename = 'export'
}) {
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [selectAll, setSelectAll] = useState(true);

    if (!isOpen) return null;

    const handleSelectAll = (checked) => {
        setSelectAll(checked);
        if (checked) {
            setSelectedItems(new Set(data.map((_, i) => i)));
        } else {
            setSelectedItems(new Set());
        }
    };

    const handleToggleItem = (index) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedItems(newSelected);
        setSelectAll(newSelected.size === data.length);
    };

    const getExportData = () => {
        if (selectAll || selectedItems.size === 0) {
            return data;
        }
        return data.filter((_, i) => selectedItems.has(i));
    };

    const handleExportCSV = () => {
        const exportData = getExportData();
        downloadCSV(exportData, columns, filename);
        onClose();
    };

    const handleExportExcel = () => {
        const exportData = getExportData();
        downloadExcel(exportData, columns, filename);
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
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-strong rounded-2xl w-full max-w-md overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
                            <h2 className="text-xl font-bold text-slate-100">{title}</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4">
                            <div className="text-sm text-slate-400">
                                {selectAll || selectedItems.size === 0
                                    ? `Exporting all ${data.length} items`
                                    : `Exporting ${selectedItems.size} of ${data.length} items`
                                }
                            </div>

                            {/* Selection */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="selectAll"
                                    checked={selectAll}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary/50"
                                />
                                <label htmlFor="selectAll" className="text-sm text-slate-300">
                                    Export all items
                                </label>
                            </div>

                            {/* Export Options */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleExportCSV}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800/50 border border-slate-600/50 hover:border-primary/50 hover:bg-primary/10 transition-all"
                                >
                                    <FileText className="h-8 w-8 text-green-400" />
                                    <span className="text-sm font-medium text-slate-200">CSV</span>
                                    <span className="text-xs text-slate-500">Comma separated</span>
                                </button>
                                <button
                                    onClick={handleExportExcel}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800/50 border border-slate-600/50 hover:border-primary/50 hover:bg-primary/10 transition-all"
                                >
                                    <FileSpreadsheet className="h-8 w-8 text-blue-400" />
                                    <span className="text-sm font-medium text-slate-200">Excel</span>
                                    <span className="text-xs text-slate-500">Microsoft Excel</span>
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 p-5 border-t border-slate-700/50">
                            <Button variant="secondary" onClick={onClose}>
                                Cancel
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
