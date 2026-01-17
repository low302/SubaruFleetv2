import { motion, AnimatePresence } from 'motion/react';
import { X, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { StatusBadge } from '../ui/badge';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function WeeklySalesModal({ isOpen, onClose, sales, dateRange }) {
    if (!isOpen) return null;

    const getCustomerName = (vehicle) => {
        if (!vehicle.customer) return '-';
        const firstName = vehicle.customer.firstName || '';
        const lastName = vehicle.customer.lastName || '';
        return `${firstName} ${lastName}`.trim() || '-';
    };

    const getSaleDate = (vehicle) => {
        if (vehicle.customer?.saleDate) {
            // Append T00:00:00 to parse as local time, not UTC
            const dateStr = vehicle.customer.saleDate;
            const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString();
            }
        }
        return '-';
    };

    const getSaleAmount = (vehicle) => {
        return parseFloat(vehicle.customer?.saleAmount) || 0;
    };

    const totalAmount = sales.reduce((sum, v) => sum + getSaleAmount(v), 0);

    const exportToXLSX = () => {
        const data = sales.map(v => ({
            'Stock #': v.stockNumber,
            'Year': v.year,
            'Make': v.make,
            'Model': v.model,
            'Trim': v.trim || '',
            'VIN': v.vin,
            'Customer': getCustomerName(v),
            'Sale Date': getSaleDate(v),
            'Sale Amount': getSaleAmount(v),
            'Fleet Company': v.fleetCompany || '',
            'Operation Company': v.operationCompany || '',
        }));

        // Add total row
        data.push({
            'Stock #': '',
            'Year': '',
            'Make': '',
            'Model': '',
            'Trim': '',
            'VIN': '',
            'Customer': '',
            'Sale Date': 'TOTAL',
            'Sale Amount': totalAmount,
            'Fleet Company': '',
            'Operation Company': '',
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Weekly Sales');

        // Auto-size columns
        const colWidths = Object.keys(data[0] || {}).map(key => ({
            wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length))
        }));
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `weekly-sales-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('Weekly Sales Report', 14, 22);

        // Date range
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(dateRange, 14, 30);

        // Table data
        const tableData = sales.map(v => [
            v.stockNumber,
            `${v.year} ${v.make} ${v.model}`,
            getCustomerName(v),
            getSaleDate(v),
            `$${getSaleAmount(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        ]);

        // Add total row
        tableData.push([
            '', '', '', 'TOTAL',
            `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            head: [['Stock #', 'Vehicle', 'Customer', 'Sale Date', 'Amount']],
            body: tableData,
            startY: 38,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            footStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
            styles: { fontSize: 9 },
            columnStyles: {
                4: { halign: 'right' }
            }
        });

        doc.save(`weekly-sales-${new Date().toISOString().split('T')[0]}.pdf`);
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
                        className="glass-strong rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-100">Weekly Sales</h2>
                                <p className="text-sm text-slate-400">{dateRange}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="secondary" onClick={exportToXLSX}>
                                    <FileSpreadsheet className="h-4 w-4" />
                                    Export XLSX
                                </Button>
                                <Button variant="secondary" onClick={exportToPDF}>
                                    <FileText className="h-4 w-4" />
                                    Export PDF
                                </Button>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto p-5">
                            <table className="w-full">
                                <thead className="bg-slate-800/50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Stock #</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicle</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Sale Date</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {sales.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                                                No sales this week
                                            </td>
                                        </tr>
                                    ) : (
                                        sales.map((vehicle) => (
                                            <tr key={vehicle.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 text-sm font-medium text-primary">{vehicle.stockNumber}</td>
                                                <td className="px-4 py-3 text-sm text-slate-300">
                                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-300">{getCustomerName(vehicle)}</td>
                                                <td className="px-4 py-3 text-sm text-slate-300">{getSaleDate(vehicle)}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-right font-mono text-emerald-400">
                                                    ${getSaleAmount(vehicle).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <StatusBadge status="sold" />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {sales.length > 0 && (
                                    <tfoot className="bg-slate-800/30 border-t border-slate-700/50">
                                        <tr>
                                            <td colSpan="4" className="px-4 py-3 text-right text-sm font-bold text-slate-200">
                                                Total ({sales.length} sale{sales.length !== 1 ? 's' : ''}):
                                            </td>
                                            <td className="px-4 py-3 text-right text-lg font-bold font-mono text-primary">
                                                ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
