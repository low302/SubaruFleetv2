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
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Colors (RGB values)
        const primaryColor = [59, 130, 246];      // Blue
        const successColor = [34, 197, 94];       // Green
        const darkColor = [30, 41, 59];           // Slate-800
        const lightBgColor = [241, 245, 249];     // Slate-100
        const textColor = [51, 65, 85];           // Slate-700

        // === HEADER SECTION ===
        // Draw header background with gradient effect
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // Add subtle pattern overlay
        doc.setFillColor(255, 255, 255);
        doc.setGlobalAlpha && doc.setGlobalAlpha(0.1);
        for (let i = 0; i < 10; i++) {
            doc.circle(pageWidth - 20 - (i * 15), 22, 30 + (i * 5), 'F');
        }
        doc.setGlobalAlpha && doc.setGlobalAlpha(1);

        // Header text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('Weekly Sales Report', 14, 22);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(dateRange, 14, 32);

        // Company branding
        doc.setFontSize(10);
        doc.text('Brandon Tomes Subaru', pageWidth - 14, 22, { align: 'right' });
        doc.text('Fleet Department', pageWidth - 14, 30, { align: 'right' });

        // === SUMMARY CARDS SECTION ===
        const cardY = 55;
        const cardHeight = 28;
        const cardSpacing = 5;
        const cardWidth = (pageWidth - 28 - (cardSpacing * 2)) / 3;

        // Calculate summary stats
        const avgSaleAmount = sales.length > 0 ? totalAmount / sales.length : 0;
        const makeBreakdown = {};
        sales.forEach(v => {
            makeBreakdown[v.make] = (makeBreakdown[v.make] || 0) + 1;
        });

        // Card 1: Total Revenue
        doc.setFillColor(...successColor);
        doc.roundedRect(14, cardY, cardWidth, cardHeight, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('TOTAL REVENUE', 14 + cardWidth / 2, cardY + 8, { align: 'center' });
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 14 + cardWidth / 2, cardY + 20, { align: 'center' });

        // Card 2: Vehicles Sold
        doc.setFillColor(...primaryColor);
        doc.roundedRect(14 + cardWidth + cardSpacing, cardY, cardWidth, cardHeight, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('VEHICLES SOLD', 14 + cardWidth + cardSpacing + cardWidth / 2, cardY + 8, { align: 'center' });
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sales.length}`, 14 + cardWidth + cardSpacing + cardWidth / 2, cardY + 20, { align: 'center' });

        // Card 3: Average Sale
        doc.setFillColor(...darkColor);
        doc.roundedRect(14 + (cardWidth + cardSpacing) * 2, cardY, cardWidth, cardHeight, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('AVERAGE SALE', 14 + (cardWidth + cardSpacing) * 2 + cardWidth / 2, cardY + 8, { align: 'center' });
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${avgSaleAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 14 + (cardWidth + cardSpacing) * 2 + cardWidth / 2, cardY + 20, { align: 'center' });

        // === BAR CHART SECTION ===
        const chartY = cardY + cardHeight + 12;
        const chartHeight = 40;
        const chartWidth = pageWidth - 28;

        // Chart background
        doc.setFillColor(...lightBgColor);
        doc.roundedRect(14, chartY, chartWidth, chartHeight + 15, 3, 3, 'F');

        // Chart title
        doc.setTextColor(...textColor);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Sales by Make', 20, chartY + 10);

        // Draw bar chart
        const makes = Object.entries(makeBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxCount = Math.max(...makes.map(m => m[1]), 1);
        const barWidth = (chartWidth - 20) / Math.max(makes.length, 1);
        const barMaxHeight = chartHeight - 10;

        makes.forEach(([make, count], index) => {
            const barHeight = (count / maxCount) * barMaxHeight;
            const barX = 20 + (index * barWidth) + (barWidth * 0.1);
            const barActualWidth = barWidth * 0.8;
            const barY = chartY + chartHeight + 2 - barHeight;

            // Bar gradient effect
            doc.setFillColor(...primaryColor);
            doc.roundedRect(barX, barY, barActualWidth, barHeight, 2, 2, 'F');

            // Count on top of bar
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryColor);
            doc.text(`${count}`, barX + barActualWidth / 2, barY - 2, { align: 'center' });

            // Label below bar
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...textColor);
            const truncatedMake = make.length > 8 ? make.substring(0, 8) + '...' : make;
            doc.text(truncatedMake, barX + barActualWidth / 2, chartY + chartHeight + 12, { align: 'center' });
        });

        // === DATA TABLE SECTION ===
        const tableY = chartY + chartHeight + 25;

        // Section header
        doc.setFillColor(...darkColor);
        doc.rect(14, tableY, chartWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Sales Details', 18, tableY + 5.5);

        // Table data
        const tableData = sales.map(v => [
            v.stockNumber,
            `${v.year} ${v.make} ${v.model}`,
            getCustomerName(v),
            getSaleDate(v),
            `$${getSaleAmount(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        ]);

        autoTable(doc, {
            head: [['Stock #', 'Vehicle', 'Customer', 'Sale Date', 'Amount']],
            body: tableData,
            startY: tableY + 10,
            theme: 'plain',
            headStyles: {
                fillColor: [...lightBgColor],
                textColor: [...textColor],
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: 3
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 3,
                textColor: [...textColor]
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: {
                0: { cellWidth: 22 },
                1: { cellWidth: 55 },
                2: { cellWidth: 40 },
                3: { cellWidth: 28 },
                4: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
            },
            tableLineColor: [226, 232, 240],
            tableLineWidth: 0.1,
            didDrawPage: function (data) {
                // Footer on each page
                const footerY = pageHeight - 15;
                doc.setFillColor(...lightBgColor);
                doc.rect(0, footerY - 5, pageWidth, 20, 'F');

                doc.setFontSize(8);
                doc.setTextColor(...textColor);
                doc.text(`Generated on ${new Date().toLocaleString()}`, 14, footerY);
                doc.text(`Page ${data.pageNumber}`, pageWidth - 14, footerY, { align: 'right' });
            }
        });

        // Add total row after table
        const finalY = doc.lastAutoTable.finalY + 2;
        doc.setFillColor(...successColor);
        doc.rect(14, finalY, chartWidth, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL', pageWidth - 50, finalY + 7);
        doc.text(`$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY + 7, { align: 'right' });

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
