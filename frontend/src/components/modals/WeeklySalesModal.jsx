import { motion, AnimatePresence } from 'motion/react';
import { X, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { StatusBadge } from '../ui/badge';
import * as XLSX from 'xlsx';

export default function WeeklySalesModal({ isOpen, onClose, sales, dateRange }) {
    if (!isOpen) return null;

    const getCustomerName = (vehicle) => {
        if (!vehicle.customer) return '-';
        // Check for 'name' field first (used when customer name is added/edited later)
        if (vehicle.customer.name) return vehicle.customer.name;
        // Fall back to firstName/lastName combination
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
        // Calculate summary stats
        const avgSaleAmount = sales.length > 0 ? totalAmount / sales.length : 0;

        // Sales by Model breakdown
        const modelBreakdown = {};
        sales.forEach(v => {
            const model = v.model || 'Unknown';
            modelBreakdown[model] = (modelBreakdown[model] || 0) + 1;
        });
        const topModels = Object.entries(modelBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const maxModelCount = Math.max(...topModels.map(m => m[1]), 1);

        // Sales by Fleet Company breakdown
        const fleetBreakdown = {};
        sales.forEach(v => {
            const fleet = v.fleetCompany || 'No Fleet';
            fleetBreakdown[fleet] = (fleetBreakdown[fleet] || 0) + 1;
        });
        const topFleets = Object.entries(fleetBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const maxFleetCount = Math.max(...topFleets.map(m => m[1]), 1);

        // Generate table rows HTML
        const tableRows = sales.map((v, index) => `
            <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #3b82f6;">${v.stockNumber}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${v.year} ${v.make} ${v.model}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${getCustomerName(v)}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${getSaleDate(v)}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #059669;">$${getSaleAmount(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
        `).join('');

        // Generate bar chart HTML for Models
        const modelChartHTML = topModels.map(([model, count]) => `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                <div style="width: 100px; font-size: 11px; color: #64748b; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${model}</div>
                <div style="flex: 1; height: 20px; background-color: #e2e8f0; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${(count / maxModelCount) * 100}%; height: 100%; background: linear-gradient(90deg, #3b82f6, #2563eb); display: flex; align-items: center; justify-content: flex-end; padding-right: 8px;">
                        <span style="color: white; font-size: 10px; font-weight: 600;">${count}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Generate bar chart HTML for Fleet Companies
        const fleetChartHTML = topFleets.map(([fleet, count]) => `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                <div style="width: 100px; font-size: 11px; color: #64748b; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fleet}</div>
                <div style="flex: 1; height: 20px; background-color: #e2e8f0; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${(count / maxFleetCount) * 100}%; height: 100%; background: linear-gradient(90deg, #8b5cf6, #7c3aed); display: flex; align-items: center; justify-content: flex-end; padding-right: 8px;">
                        <span style="color: white; font-size: 10px; font-weight: 600;">${count}</span>
                    </div>
                </div>
            </div>
        `).join('');

        const printHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Weekly Sales Report - ${dateRange}</title>
    <style>
        @page {
            size: letter;
            margin: 0.5in;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #1e293b;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .page {
            width: 7.5in;
            min-height: 10in;
            padding: 0;
            margin: 0 auto;
        }
        .header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 24px 28px;
            border-radius: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            font-size: 26px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        .header .subtitle {
            font-size: 14px;
            opacity: 0.9;
        }
        .header .branding {
            text-align: right;
            font-size: 12px;
            opacity: 0.9;
        }
        .header .branding .company {
            font-weight: 600;
            font-size: 14px;
        }
        .stats-row {
            display: flex;
            gap: 16px;
            margin-bottom: 20px;
        }
        .stat-card {
            flex: 1;
            padding: 16px 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-card.green {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            color: white;
        }
        .stat-card.blue {
            background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
            color: white;
        }
        .stat-card.slate {
            background: linear-gradient(135deg, #334155 0%, #475569 100%);
            color: white;
        }
        .stat-card .label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.9;
            margin-bottom: 4px;
        }
        .stat-card .value {
            font-size: 22px;
            font-weight: 700;
        }
        .section {
            background: #f8fafc;
            border-radius: 10px;
            padding: 16px 20px;
            margin-bottom: 16px;
        }
        .section-title {
            font-size: 13px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .table-container {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        thead tr {
            background: #1e293b;
        }
        thead th {
            padding: 12px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            color: white;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        thead th:last-child {
            text-align: right;
        }
        .total-row {
            background: linear-gradient(90deg, #059669, #10b981);
            color: white;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 0 0 10px 10px;
            font-weight: 600;
        }
        .footer {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #94a3b8;
        }
        @media print {
            body { background: white; }
            .page { width: 100%; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="page">
        <!-- Header -->
        <div class="header">
            <div>
                <h1>Weekly Sales Report</h1>
                <div class="subtitle">${dateRange}</div>
            </div>
            <div class="branding">
                <div class="company">Brandon Tomes Subaru</div>
                <div>Fleet Department</div>
            </div>
        </div>

        <!-- Stats Cards -->
        <div class="stats-row">
            <div class="stat-card green">
                <div class="label">Total Revenue</div>
                <div class="value">$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="stat-card blue">
                <div class="label">Vehicles Sold</div>
                <div class="value">${sales.length}</div>
            </div>
            <div class="stat-card slate">
                <div class="label">Average Sale</div>
                <div class="value">$${avgSaleAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
        </div>

        <!-- Volume Breakdown Charts -->
        <div style="display: flex; gap: 16px; margin-bottom: 16px;">
            ${topModels.length > 0 ? `
            <div class="section" style="flex: 1; margin-bottom: 0;">
                <div class="section-title">Sales by Model</div>
                ${modelChartHTML}
            </div>
            ` : ''}
            ${topFleets.length > 0 ? `
            <div class="section" style="flex: 1; margin-bottom: 0;">
                <div class="section-title">Sales by Fleet Company</div>
                ${fleetChartHTML}
            </div>
            ` : ''}
        </div>

        <!-- Sales Table -->
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Stock #</th>
                        <th>Vehicle</th>
                        <th>Customer</th>
                        <th>Sale Date</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <div class="total-row">
                <span>Total (${sales.length} sale${sales.length !== 1 ? 's' : ''})</span>
                <span>$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <span>Generated on ${new Date().toLocaleString()}</span>
            <span>Brandon Tomes Subaru Fleet Department</span>
        </div>
    </div>

    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>`;

        // Open in new window and print
        const printWindow = window.open('', '_blank', 'width=850,height=1100');
        printWindow.document.write(printHTML);
        printWindow.document.close();
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
