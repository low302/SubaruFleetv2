import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Tag, Key } from 'lucide-react';
import { Button } from '../ui/button';

// OL125 label positions (2 columns × 5 rows) - exact from original
const OL125_POSITIONS = [
    { row: 1, col: 1, top: '0.5in', left: '0.1875in' },
    { row: 1, col: 2, top: '0.5in', left: '4.3125in' },
    { row: 2, col: 1, top: '2.5in', left: '0.1875in' },
    { row: 2, col: 2, top: '2.5in', left: '4.3125in' },
    { row: 3, col: 1, top: '4.5in', left: '0.1875in' },
    { row: 3, col: 2, top: '4.5in', left: '4.3125in' },
    { row: 4, col: 1, top: '6.5in', left: '0.1875in' },
    { row: 4, col: 2, top: '6.5in', left: '4.3125in' },
    { row: 5, col: 1, top: '8.5in', left: '0.1875in' },
    { row: 5, col: 2, top: '8.5in', left: '4.3125in' }
];

// OL875 label positions (3 columns × 10 rows) - for key tags
const OL875_POSITIONS = Array.from({ length: 30 }, (_, index) => {
    const row = Math.floor(index / 3) + 1;
    const col = (index % 3) + 1;
    const top = `${0.5 + (row - 1) * 1}in`;
    const leftVal = 0.21975 + (col - 1) * 2.7335;
    return { row, col, top, left: `${leftVal.toFixed(5)}in` };
});

export default function LabelPrintModal({ vehicle, isOpen, onClose }) {
    const [labelType, setLabelType] = useState(null);
    const [selectedPosition, setSelectedPosition] = useState(0);
    const [selectedKeyPositions, setSelectedKeyPositions] = useState([]);

    if (!isOpen || !vehicle) return null;

    const handleReset = () => {
        setLabelType(null);
        setSelectedPosition(0);
        setSelectedKeyPositions([]);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const toggleKeyPosition = (index) => {
        if (selectedKeyPositions.includes(index)) {
            setSelectedKeyPositions(prev => prev.filter(i => i !== index));
        } else if (selectedKeyPositions.length < 2) {
            setSelectedKeyPositions(prev => [...prev, index]);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const labelHtml = labelType === 'window'
            ? generateWindowLabel(vehicle, OL125_POSITIONS[selectedPosition])
            : generateKeyLabels(vehicle, selectedKeyPositions.map(i => OL875_POSITIONS[i]));

        printWindow.document.write(labelHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    const generateWindowLabel = (v, position) => {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Window Label - ${v.stockNumber}</title>
    <style>
        @page { size: 8.5in 11in; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; }
        .label {
            position: absolute;
            top: ${position.top};
            left: ${position.left};
            width: 4in;
            height: 2in;
            padding: 0.1in;
            display: flex;
            border: 1px solid #333;
        }
        .label-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .stock-number {
            font-size: 24pt;
            font-weight: bold;
            color: #000;
            margin-bottom: 4px;
        }
        .vehicle {
            font-size: 14pt;
            font-weight: bold;
            color: #333;
            margin-bottom: 4px;
        }
        .info-line {
            font-size: 9pt;
            color: #333;
            margin: 2px 0;
        }
        .info-line strong {
            color: #000;
        }
        .qr-placeholder {
            width: 1.4in;
            height: 1.4in;
            background: #f0f0f0;
            border: 2px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 7pt;
            text-align: center;
            font-family: monospace;
            word-break: break-all;
            padding: 4px;
        }
    </style>
</head>
<body>
    <div class="label">
        <div class="label-content">
            <div>
                <div class="stock-number">Stock #${v.stockNumber || ''}</div>
                <div class="vehicle">${v.year} ${v.make} ${v.model}</div>
            </div>
            <div>
                <div class="info-line"><strong>VIN:</strong> ${v.vin || ''}</div>
                <div class="info-line"><strong>Trim:</strong> ${v.trim || 'N/A'} • <strong>Color:</strong> ${v.color || 'N/A'}</div>
                <div class="info-line"><strong>Op Co:</strong> ${v.operationCompany || 'N/A'} • <strong>Fleet:</strong> ${v.fleetCompany || 'N/A'}</div>
            </div>
        </div>
        <div class="qr-placeholder">${v.vin || ''}</div>
    </div>
</body>
</html>`;
    };

    const generateKeyLabels = (v, positions) => {
        const vinLast8 = v.vin ? v.vin.slice(-8) : '';

        const labels = positions.map(position => `
            <div class="key-label" style="top: ${position.top}; left: ${position.left};">
                <div class="stock-box">
                    <div class="stock-label">Stock #</div>
                    <div class="stock-number">${v.stockNumber || ''}</div>
                </div>
                <div class="info-column">
                    <div class="vehicle">${v.year} ${v.make} ${v.model}</div>
                    <div class="info-line">VIN: ${vinLast8}</div>
                    <div class="info-line">Color: ${v.color || 'N/A'}</div>
                    <div class="info-line">Fleet: ${v.fleetCompany || 'N/A'}</div>
                    <div class="info-line">Op Co: ${v.operationCompany || 'N/A'}</div>
                </div>
            </div>
        `).join('');

        return `
<!DOCTYPE html>
<html>
<head>
    <title>Key Labels - ${v.stockNumber}</title>
    <style>
        @page { size: 8.5in 11in; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: 'Ubuntu', Arial, Helvetica, sans-serif; }
        .key-label {
            position: absolute;
            width: 2.625in;
            height: 1in;
            padding: 6px 9px;
            background: #334155;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 6px;
            display: flex;
            gap: 8px;
            align-items: center;
            overflow: hidden;
        }
        .stock-box {
            background: rgba(255, 255, 255, 0.9);
            color: #0f172a;
            padding: 6px 9px;
            border-radius: 4px;
            min-width: 72px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            text-align: center;
            line-height: 1.05;
        }
        .stock-label {
            font-size: 9px;
            font-weight: 600;
            color: #334155;
            letter-spacing: 0.02em;
        }
        .stock-number {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .info-column {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
            justify-content: center;
            line-height: 1.1;
        }
        .vehicle {
            font-size: 11px;
            font-weight: 700;
            color: #e2e8f0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .info-line {
            font-size: 9px;
            color: #cbd5e1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    </style>
</head>
<body>
    ${labels}
</body>
</html>`;
    };

    const currentPositions = labelType === 'window' ? OL125_POSITIONS : OL875_POSITIONS;
    const gridCols = labelType === 'window' ? 2 : 3;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={(e) => e.target === e.currentTarget && handleClose()}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-strong rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
                            <div className="flex items-center gap-2">
                                <Printer className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-bold text-slate-100">Print Label</h2>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4 overflow-y-auto max-h-[65vh]">
                            {/* Vehicle Info */}
                            <div className="glass rounded-lg p-3">
                                <p className="text-sm text-slate-400 mb-1">Vehicle</p>
                                <p className="font-medium text-slate-200">
                                    {vehicle.stockNumber} - {vehicle.year} {vehicle.make} {vehicle.model}
                                </p>
                            </div>

                            {/* Label Type Selection */}
                            {!labelType ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setLabelType('window')}
                                        className="flex flex-col items-center gap-2 p-6 rounded-xl bg-slate-800/50 border border-slate-600/50 hover:border-primary/50 hover:bg-primary/10 transition-all"
                                    >
                                        <Tag className="h-8 w-8 text-blue-400" />
                                        <span className="text-sm font-medium text-slate-200">Folder Label</span>
                                        <span className="text-xs text-slate-500">OL125 (4" × 2")</span>
                                    </button>
                                    <button
                                        onClick={() => setLabelType('key')}
                                        className="flex flex-col items-center gap-2 p-6 rounded-xl bg-slate-800/50 border border-slate-600/50 hover:border-primary/50 hover:bg-primary/10 transition-all"
                                    >
                                        <Key className="h-8 w-8 text-amber-400" />
                                        <span className="text-sm font-medium text-slate-200">Key Tag</span>
                                        <span className="text-xs text-slate-500">OL875 (2.625" × 1")</span>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Position Selection */}
                                    <div>
                                        <p className="text-sm font-medium text-slate-300 mb-2">
                                            Select Position{labelType === 'key' ? 's (up to 2)' : ''} - {labelType === 'window' ? '2 × 5 Sheet' : '3 × 10 Sheet'}
                                        </p>
                                        <div
                                            className="grid gap-1.5 max-h-60 overflow-y-auto p-1"
                                            style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
                                        >
                                            {currentPositions.map((pos, index) => {
                                                const isSelected = labelType === 'window'
                                                    ? selectedPosition === index
                                                    : selectedKeyPositions.includes(index);
                                                return (
                                                    <button
                                                        key={index}
                                                        onClick={() => labelType === 'window'
                                                            ? setSelectedPosition(index)
                                                            : toggleKeyPosition(index)
                                                        }
                                                        className={`p-2 rounded text-xs transition-all ${isSelected
                                                            ? 'bg-primary/20 text-primary border border-primary/50'
                                                            : 'bg-slate-800/50 text-slate-400 border border-slate-600/50 hover:border-slate-500'
                                                            }`}
                                                    >
                                                        R{pos.row} C{pos.col}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div className="border border-slate-600 rounded-lg p-4 bg-white/5">
                                        <p className="text-xs text-slate-500 mb-2">Preview</p>
                                        {labelType === 'window' ? (
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-slate-100">Stock #{vehicle.stockNumber}</p>
                                                <p className="text-sm font-semibold text-slate-300">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                                                <p className="text-xs text-slate-400 mt-1">VIN: {vehicle.vin}</p>
                                                <p className="text-xs text-slate-400">Trim: {vehicle.trim || 'N/A'} • Color: {vehicle.color || 'N/A'}</p>
                                                <p className="text-xs text-slate-400">Op Co: {vehicle.operationCompany || 'N/A'} • Fleet: {vehicle.fleetCompany || 'N/A'}</p>
                                            </div>
                                        ) : (
                                            <div className="flex gap-3 bg-slate-700 rounded-lg p-3">
                                                <div className="bg-white/90 text-slate-900 rounded px-3 py-2 text-center min-w-[60px]">
                                                    <p className="text-[9px] font-semibold text-slate-600">Stock #</p>
                                                    <p className="text-base font-extrabold">{vehicle.stockNumber}</p>
                                                </div>
                                                <div className="flex flex-col justify-center gap-0.5">
                                                    <p className="text-sm font-bold text-slate-200">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                                                    <p className="text-[9px] text-slate-400">VIN: {vehicle.vin?.slice(-8)}</p>
                                                    <p className="text-[9px] text-slate-400">Color: {vehicle.color || 'N/A'}</p>
                                                    <p className="text-[9px] text-slate-400">Fleet: {vehicle.fleetCompany || 'N/A'}</p>
                                                    <p className="text-[9px] text-slate-400">Op Co: {vehicle.operationCompany || 'N/A'}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between gap-2 p-5 border-t border-slate-700/50">
                            {labelType ? (
                                <>
                                    <Button variant="secondary" onClick={handleReset}>
                                        Back
                                    </Button>
                                    <Button
                                        onClick={handlePrint}
                                        disabled={labelType === 'key' && selectedKeyPositions.length === 0}
                                    >
                                        <Printer className="h-4 w-4" />
                                        Print {labelType === 'key' && selectedKeyPositions.length > 0 ? `(${selectedKeyPositions.length})` : ''}
                                    </Button>
                                </>
                            ) : (
                                <Button variant="secondary" onClick={handleClose} className="w-full">
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
