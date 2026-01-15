import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit2, Save, Trash2, User, FileText, Printer, DollarSign, FolderOpen, Upload, Eye, Download, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Input, Select, FormRow } from '../ui/input';
import { inventory as inventoryApi, documents as documentsApi } from '../../services/api';
import { jsPDF } from 'jspdf';

// Status options available in dropdown (excludes 'sold' which is only set via Mark as Sold)
const STATUS_OPTIONS = [
    { value: 'in-stock', label: 'In Stock', color: 'bg-emerald-500' },
    { value: 'in-transit', label: 'In-Transit', color: 'bg-blue-500' },
    { value: 'pdi', label: 'PDI', color: 'bg-amber-500' },
    { value: 'pending-pickup', label: 'Pending Pickup', color: 'bg-purple-500' },
    { value: 'pickup-scheduled', label: 'Pickup Scheduled', color: 'bg-green-500' },
];

// All statuses including sold (for display purposes)
const ALL_STATUSES = [
    ...STATUS_OPTIONS,
    { value: 'sold', label: 'Sold', color: 'bg-green-600' },
];

const PAYMENT_METHODS = [
    { value: '', label: 'Select Payment Method' },
    { value: 'ACH', label: 'ACH' },
    { value: 'Check', label: 'Check' },
    { value: 'Credit Card', label: 'Credit Card' },
    { value: 'Wire Transfer', label: 'Wire Transfer' },
    { value: 'Cash', label: 'Cash' },
];

export default function VehicleDetailModal({ vehicle, isOpen, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('details');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSoldModal, setShowSoldModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [vehicleDocuments, setVehicleDocuments] = useState([]);
    const [isEditingPayment, setIsEditingPayment] = useState(false);

    const fileInputRef = useRef(null);
    const statusDropdownRef = useRef(null);

    const [formData, setFormData] = useState({});
    const [customerData, setCustomerData] = useState({});
    const [paymentData, setPaymentData] = useState({
        saleAmount: '',
        saleDate: '',
        paymentMethod: '',
        paymentReference: '',
    });
    const [scheduleData, setScheduleData] = useState({ pickupDate: '', pickupTime: '' });

    useEffect(() => {
        if (vehicle) {
            setFormData({
                stockNumber: vehicle.stockNumber || '',
                vin: vehicle.vin || '',
                year: vehicle.year || '',
                make: vehicle.make || '',
                model: vehicle.model || '',
                trim: vehicle.trim || '',
                color: vehicle.color || '',
                status: vehicle.status || 'in-stock',
                fleetCompany: vehicle.fleetCompany || '',
                operationCompany: vehicle.operationCompany || '',
                notes: vehicle.notes || '',
                inStockDate: vehicle.inStockDate ? vehicle.inStockDate.split('T')[0] : '',
            });
            setCustomerData({
                name: vehicle.customer?.name || vehicle.customer?.firstName && vehicle.customer?.lastName
                    ? `${vehicle.customer.firstName} ${vehicle.customer.lastName}`.trim()
                    : '',
                phone: vehicle.customer?.phone || '',
                email: vehicle.customer?.email || '',
            });
            setPaymentData({
                saleAmount: vehicle.customer?.saleAmount || '',
                saleDate: vehicle.customer?.saleDate || '',
                paymentMethod: vehicle.customer?.paymentMethod || '',
                paymentReference: vehicle.customer?.paymentReference || '',
            });
            setScheduleData({
                pickupDate: vehicle.pickupDate || '',
                pickupTime: vehicle.pickupTime || '',
            });
            // Load documents for this vehicle
            loadDocuments();
        }
    }, [vehicle]);

    // Close status dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
                setShowStatusDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadDocuments = async () => {
        if (!vehicle?.id) return;
        try {
            const docs = await documentsApi.getByVehicle(vehicle.id);
            setVehicleDocuments(docs);
        } catch (error) {
            console.error('Failed to load documents:', error);
            setVehicleDocuments([]);
        }
    };

    if (!isOpen || !vehicle) return null;

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await inventoryApi.update(vehicle.id, formData);
            setIsEditing(false);
            onUpdate?.();
        } catch (error) {
            console.error('Failed to save vehicle:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        setShowStatusDropdown(false);

        if (newStatus === vehicle.status) return;

        // If changing to pickup-scheduled, show schedule modal
        if (newStatus === 'pickup-scheduled') {
            setShowScheduleModal(true);
            return;
        }

        setIsLoading(true);
        try {
            // Determine if we need to set inStockDate (when moving FROM in-transit to another status)
            const wasInTransit = vehicle.status === 'in-transit';
            const updateData = { status: newStatus };

            // If moving from in-transit to any other status, set the in-stock date to now
            if (wasInTransit && newStatus !== 'in-transit') {
                updateData.inStockDate = new Date().toISOString();
            }

            await inventoryApi.update(vehicle.id, {
                ...vehicle,
                ...updateData,
            });

            // Immediately update parent and close dropdown
            onUpdate?.();
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Failed to update status: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSchedulePickup = async () => {
        if (!scheduleData.pickupDate || !scheduleData.pickupTime) {
            alert('Please select both a pickup date and time.');
            return;
        }

        setIsLoading(true);
        try {
            await inventoryApi.update(vehicle.id, {
                ...vehicle,
                status: 'pickup-scheduled',
                pickupDate: scheduleData.pickupDate,
                pickupTime: scheduleData.pickupTime,
            });
            setShowScheduleModal(false);
            setScheduleData({ pickupDate: '', pickupTime: '' });
            onUpdate?.();
        } catch (error) {
            console.error('Failed to schedule pickup:', error);
            alert('Failed to schedule pickup: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveCustomer = async () => {
        setIsLoading(true);
        try {
            await inventoryApi.updateCustomer(vehicle.id, customerData);
            onUpdate?.();
        } catch (error) {
            console.error('Failed to save customer:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await inventoryApi.delete(vehicle.id);
            onClose();
            onUpdate?.();
        } catch (error) {
            console.error('Failed to delete vehicle:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAsSold = async (soldData) => {
        setIsLoading(true);
        try {
            await inventoryApi.markAsSold(vehicle.id, soldData);
            setShowSoldModal(false);
            onClose();
            onUpdate?.();
        } catch (error) {
            console.error('Failed to mark as sold:', error);
            alert('Failed to mark vehicle as sold: ' + (error.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSavePayment = async () => {
        setIsLoading(true);
        try {
            // Merge payment data with existing customer data
            const updatedCustomer = {
                ...vehicle.customer,
                saleAmount: parseFloat(paymentData.saleAmount) || 0,
                saleDate: paymentData.saleDate,
                paymentMethod: paymentData.paymentMethod,
                paymentReference: paymentData.paymentReference,
            };

            await inventoryApi.update(vehicle.id, {
                ...vehicle,
                customer: updatedCustomer,
            });
            onUpdate?.();
        } catch (error) {
            console.error('Failed to save payment:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Only PDF files are allowed');
            return;
        }

        setIsUploading(true);
        try {
            await documentsApi.upload(vehicle.id, file);
            await loadDocuments();
            onUpdate?.();
        } catch (error) {
            console.error('Failed to upload file:', error);
            alert('Failed to upload file: ' + error.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleViewDocument = (docId) => {
        window.open(`/api/documents/view/${docId}`, '_blank');
    };

    const handleDownloadDocument = (docId) => {
        window.open(`/api/documents/download/${docId}`, '_blank');
    };

    const handleDeleteDocument = async (docId) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            await documentsApi.delete(docId);
            await loadDocuments();
            onUpdate?.();
        } catch (error) {
            console.error('Failed to delete document:', error);
            alert('Failed to delete document');
        }
    };

    const getCurrentStatusOption = () => {
        return ALL_STATUSES.find(opt => opt.value === vehicle.status) || STATUS_OPTIONS[0];
    };

    // Generate Vehicle Pickup Acknowledgement PDF
    const generatePickupForm = async () => {
        if (!vehicle) return;

        setIsGeneratingPDF(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 15;
            const contentWidth = pageWidth - margin * 2;

            // ============ HEADER SECTION ============
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Vehicle Pickup Acknowledgement', pageWidth / 2, 20, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text('Brandon Tomes Subaru Fleet Department', pageWidth / 2, 28, { align: 'center' });

            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.line(margin, 34, pageWidth - margin, 34);

            let yPos = 44;

            // ============ VEHICLE INFORMATION SECTION ============
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Vehicle Information', margin, yPos);
            yPos += 6;

            const rowHeight = 10;
            const col1LabelWidth = 30;
            const col1ValueWidth = 50;
            const col2LabelWidth = 30;
            const col2ValueWidth = contentWidth - col1LabelWidth - col1ValueWidth - col2LabelWidth;
            const col2Start = margin + col1LabelWidth + col1ValueWidth;

            // Helper function to draw a 2-column row
            const draw2ColRow = (label1, value1, label2, value2, y) => {
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.3);

                // Column 1 - Label
                doc.setFillColor(240, 240, 240);
                doc.rect(margin, y, col1LabelWidth, rowHeight, 'FD');
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(label1, margin + 2, y + 6.5);

                // Column 1 - Value
                doc.setFillColor(255, 255, 255);
                doc.rect(margin + col1LabelWidth, y, col1ValueWidth, rowHeight, 'FD');
                doc.setFont('helvetica', 'normal');
                doc.text(value1 || '', margin + col1LabelWidth + 2, y + 6.5);

                // Column 2 - Label
                doc.setFillColor(240, 240, 240);
                doc.rect(col2Start, y, col2LabelWidth, rowHeight, 'FD');
                doc.setFont('helvetica', 'bold');
                doc.text(label2, col2Start + 2, y + 6.5);

                // Column 2 - Value
                doc.setFillColor(255, 255, 255);
                doc.rect(col2Start + col2LabelWidth, y, col2ValueWidth, rowHeight, 'FD');
                doc.setFont('helvetica', 'normal');
                doc.text(value2 || '', col2Start + col2LabelWidth + 2, y + 6.5);

                return y + rowHeight;
            };

            // Helper function to draw a full-width row
            const drawFullWidthRow = (label, value, y) => {
                const labelWidth = 30;
                const valueWidth = contentWidth - labelWidth;

                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.3);

                // Label
                doc.setFillColor(240, 240, 240);
                doc.rect(margin, y, labelWidth, rowHeight, 'FD');
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(label, margin + 2, y + 6.5);

                // Value
                doc.setFillColor(255, 255, 255);
                doc.rect(margin + labelWidth, y, valueWidth, rowHeight, 'FD');
                doc.setFont('helvetica', 'normal');
                doc.text(value || '', margin + labelWidth + 2, y + 6.5);

                return y + rowHeight;
            };

            // Vehicle rows
            yPos = draw2ColRow('Stock #:', vehicle.stockNumber || '', 'VIN:', vehicle.vin || '', yPos);
            yPos = draw2ColRow('Year:', vehicle.year?.toString() || '', 'Make:', vehicle.make || '', yPos);
            yPos = draw2ColRow('Model:', vehicle.model || '', 'Trim:', vehicle.trim || '', yPos);
            yPos = drawFullWidthRow('Color:', vehicle.color || '', yPos);

            yPos += 10;

            // ============ COMPANY & CUSTOMER INFORMATION SECTION ============
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Company & Customer Information', margin, yPos);
            yPos += 6;

            yPos = drawFullWidthRow('Fleet Company:', vehicle.fleetCompany || '', yPos);
            yPos = drawFullWidthRow('Operation Co.:', vehicle.operationCompany || '', yPos);

            const customerName = vehicle.customer
                ? `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim() || vehicle.customer.name || ''
                : '';
            yPos = drawFullWidthRow('Customer:', customerName, yPos);
            yPos = drawFullWidthRow('Phone:', vehicle.customer?.phone || '', yPos);

            yPos += 15;

            // ============ ACKNOWLEDGEMENT & TERMS SECTION ============
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Acknowledgement & Terms of Vehicle Pickup', margin, yPos);
            yPos += 8;

            const acknowledgementText = 'By signing below, the undersigned acknowledges receipt and acceptance of the vehicle described above. The vehicle has been inspected and is accepted in its present condition unless otherwise documented at time of delivery. Responsibility for the vehicle, including risk of loss or damage, transfers to the receiving party upon possession. Brandon Tomes Subaru Fleet Department is not responsible for personal property left in the vehicle after delivery.';

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 60, 60);
            const splitAcknowledgement = doc.splitTextToSize(acknowledgementText, contentWidth);
            doc.text(splitAcknowledgement, margin, yPos);
            yPos += splitAcknowledgement.length * 4.5 + 20;

            // ============ SIGNATURE SECTION ============
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);

            doc.text('Customer Signature:', margin, yPos);
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.line(margin + 40, yPos, pageWidth - 80, yPos);

            doc.text('Date:', pageWidth - 70, yPos);
            doc.line(pageWidth - 55, yPos, pageWidth - margin, yPos);

            // ============ FOOTER ============
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'italic');
            const footerText = `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
            doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

            // Save the PDF
            const fileName = `Vehicle_Pickup_Acknowledgement_${vehicle.stockNumber}_${vehicle.year}_${vehicle.make}_${vehicle.model}.pdf`.replace(/\s+/g, '_');
            doc.save(fileName);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const tabs = [
        { id: 'details', label: 'Details', icon: FileText },
        { id: 'customer', label: 'Customer', icon: User },
        { id: 'payment', label: 'Payment', icon: DollarSign },
        { id: 'files', label: 'Files', icon: FolderOpen },
    ];

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
                        className="glass-strong rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-100">
                                    {vehicle.stockNumber} - {vehicle.year} {vehicle.make} {vehicle.model}
                                </h2>
                                <p className="text-sm text-slate-400 mt-0.5">{vehicle.vin}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Status Dropdown */}
                                <div className="relative" ref={statusDropdownRef}>
                                    {/* If vehicle is sold, show static badge without dropdown */}
                                    {vehicle.status === 'sold' ? (
                                        <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white ${getCurrentStatusOption().color}`}>
                                            {getCurrentStatusOption().label}
                                        </span>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                                disabled={isLoading}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white transition-all ${getCurrentStatusOption().color} hover:opacity-90`}
                                            >
                                                {getCurrentStatusOption().label}
                                                <ChevronDown className={`h-4 w-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                                            </button>
                                            {showStatusDropdown && (
                                                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-slate-800 border border-slate-700 shadow-xl z-50 overflow-hidden">
                                                    {STATUS_OPTIONS.map((option) => (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => handleStatusChange(option.value)}
                                                            className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-slate-700/50 transition-colors ${vehicle.status === option.value ? 'bg-slate-700/30' : ''
                                                                }`}
                                                        >
                                                            <span className={`w-2 h-2 rounded-full ${option.color}`} />
                                                            <span className={vehicle.status === option.value ? 'text-white font-medium' : 'text-slate-300'}>
                                                                {option.label}
                                                            </span>
                                                            {vehicle.status === option.value && (
                                                                <span className="ml-auto text-primary">✓</span>
                                                            )}
                                                        </button>
                                                    ))}
                                                    <div className="border-t border-slate-700">
                                                        <button
                                                            onClick={() => {
                                                                setShowStatusDropdown(false);
                                                                setShowSoldModal(true);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-green-600/20 transition-colors text-green-400"
                                                        >
                                                            <span className="w-2 h-2 rounded-full bg-green-500" />
                                                            Mark as Sold
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-700/50">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                                        ? 'text-primary border-b-2 border-primary'
                                        : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                >
                                    <tab.icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-5 overflow-y-auto max-h-[60vh]">
                            {activeTab === 'details' && (
                                <div className="space-y-4">
                                    {isEditing ? (
                                        <>
                                            <FormRow>
                                                <Input
                                                    label="Stock #"
                                                    value={formData.stockNumber}
                                                    onChange={(e) => setFormData({ ...formData, stockNumber: e.target.value })}
                                                />
                                                <Input
                                                    label="VIN"
                                                    value={formData.vin}
                                                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                                                />
                                            </FormRow>
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
                                                    label="Trim"
                                                    value={formData.trim}
                                                    onChange={(e) => setFormData({ ...formData, trim: e.target.value })}
                                                />
                                            </FormRow>
                                            <FormRow>
                                                <Input
                                                    label="Color"
                                                    value={formData.color}
                                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                />
                                                <Input
                                                    label="Fleet Company"
                                                    value={formData.fleetCompany}
                                                    onChange={(e) => setFormData({ ...formData, fleetCompany: e.target.value })}
                                                />
                                            </FormRow>
                                            <Input
                                                label="Operation Company"
                                                value={formData.operationCompany}
                                                onChange={(e) => setFormData({ ...formData, operationCompany: e.target.value })}
                                            />
                                            <Input
                                                type="date"
                                                label="In-Stock Date"
                                                value={formData.inStockDate}
                                                onChange={(e) => setFormData({ ...formData, inStockDate: e.target.value })}
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
                                        </>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <InfoItem label="Stock #" value={vehicle.stockNumber} />
                                            <InfoItem label="VIN" value={vehicle.vin} />
                                            <InfoItem label="Year" value={vehicle.year} />
                                            <InfoItem label="Make" value={vehicle.make} />
                                            <InfoItem label="Model" value={vehicle.model} />
                                            <InfoItem label="Trim" value={vehicle.trim} />
                                            <InfoItem label="Color" value={vehicle.color} />
                                            <InfoItem label="Fleet Company" value={vehicle.fleetCompany} />
                                            <InfoItem label="Operation Company" value={vehicle.operationCompany} />
                                            <InfoItem
                                                label="Days In Stock"
                                                value={vehicle.inStockDate
                                                    ? Math.floor((new Date() - new Date(vehicle.inStockDate)) / (1000 * 60 * 60 * 24))
                                                    : '-'}
                                            />
                                            <InfoItem
                                                label="In Stock Date"
                                                value={vehicle.inStockDate
                                                    ? new Date(vehicle.inStockDate).toLocaleDateString()
                                                    : '-'}
                                            />
                                            {vehicle.notes && (
                                                <div className="col-span-2">
                                                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                                                    <p className="text-sm text-slate-300">{vehicle.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'customer' && (
                                <div className="space-y-4">
                                    <Input
                                        label="Customer Name"
                                        value={customerData.name}
                                        onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                                    />
                                    <FormRow>
                                        <Input
                                            label="Phone"
                                            value={customerData.phone}
                                            onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                                        />
                                        <Input
                                            label="Email"
                                            value={customerData.email}
                                            onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                                        />
                                    </FormRow>
                                    <div className="pt-4">
                                        <Button onClick={handleSaveCustomer} disabled={isLoading}>
                                            <Save className="h-4 w-4" />
                                            Save Customer Info
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'payment' && (
                                <div className="space-y-4">
                                    {/* Display current payment info */}
                                    {vehicle.customer?.saleAmount > 0 ? (
                                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                            <p className="text-sm text-green-400 font-medium mb-3">Payment Information</p>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <span className="text-slate-500">Amount:</span>{' '}
                                                    <span className="text-slate-200 font-medium">${parseFloat(vehicle.customer.saleAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                {vehicle.customer.saleDate && (
                                                    <div>
                                                        <span className="text-slate-500">Date:</span>{' '}
                                                        <span className="text-slate-200">{new Date(vehicle.customer.saleDate).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                                {vehicle.customer.paymentMethod && (
                                                    <div>
                                                        <span className="text-slate-500">Method:</span>{' '}
                                                        <span className="text-slate-200">{vehicle.customer.paymentMethod}</span>
                                                    </div>
                                                )}
                                                {vehicle.customer.paymentReference && (
                                                    <div>
                                                        <span className="text-slate-500">Reference:</span>{' '}
                                                        <span className="text-slate-200">{vehicle.customer.paymentReference}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 text-center">
                                            <p className="text-sm text-slate-400">No payment information recorded</p>
                                        </div>
                                    )}

                                    {/* Edit Payment Form - only shown when editing */}
                                    {isEditingPayment && (
                                        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 space-y-4">
                                            <p className="text-sm text-slate-300 font-medium">Update Payment Info</p>
                                            <FormRow>
                                                <Input
                                                    type="number"
                                                    label="Sale Amount"
                                                    value={paymentData.saleAmount}
                                                    onChange={(e) => setPaymentData({ ...paymentData, saleAmount: e.target.value })}
                                                    placeholder="0.00"
                                                />
                                                <Input
                                                    type="date"
                                                    label="Sale Date"
                                                    value={paymentData.saleDate}
                                                    onChange={(e) => setPaymentData({ ...paymentData, saleDate: e.target.value })}
                                                />
                                            </FormRow>
                                            <FormRow>
                                                <Select
                                                    label="Payment Method"
                                                    value={paymentData.paymentMethod}
                                                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                                                    options={PAYMENT_METHODS}
                                                />
                                                <Input
                                                    label="Payment Reference"
                                                    value={paymentData.paymentReference}
                                                    onChange={(e) => setPaymentData({ ...paymentData, paymentReference: e.target.value })}
                                                    placeholder="Check #, ACH ref, etc."
                                                />
                                            </FormRow>
                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => setIsEditingPayment(false)}
                                                    className="flex-1"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        handleSavePayment();
                                                        setIsEditingPayment(false);
                                                    }}
                                                    disabled={isLoading}
                                                    className="flex-1"
                                                >
                                                    <Save className="h-4 w-4" />
                                                    Save Payment
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Add/Edit Payment Button */}
                                    {!isEditingPayment && (
                                        <div className="pt-2">
                                            <Button
                                                variant="secondary"
                                                onClick={() => setIsEditingPayment(true)}
                                            >
                                                <DollarSign className="h-4 w-4" />
                                                {vehicle.customer?.saleAmount > 0 ? 'Edit Payment' : 'Add Payment'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'files' && (
                                <div className="space-y-4">
                                    {/* Upload Section */}
                                    <div className="border-2 border-dashed border-slate-600/50 rounded-lg p-6 text-center">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            accept=".pdf"
                                            className="hidden"
                                        />
                                        <Upload className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                                        <p className="text-sm text-slate-400 mb-2">Upload PDF files for this vehicle</p>
                                        <Button
                                            variant="secondary"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                        >
                                            {isUploading ? 'Uploading...' : 'Select PDF File'}
                                        </Button>
                                    </div>

                                    {/* Documents List */}
                                    {vehicleDocuments.length > 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-slate-300">Uploaded Documents</p>
                                            {vehicleDocuments.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-5 w-5 text-red-400" />
                                                        <div>
                                                            <p className="text-sm text-slate-200">{doc.fileName}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {new Date(doc.uploadDate).toLocaleDateString()} • {(doc.fileSize / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleViewDocument(doc.id)}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                                                            title="View"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadDocument(doc.id)}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                                                            title="Download"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteDocument(doc.id)}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6">
                                            <FolderOpen className="h-12 w-12 text-slate-600 mx-auto mb-2" />
                                            <p className="text-sm text-slate-500">No documents uploaded yet</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Pickup Scheduled Info (show in details if applicable) */}
                            {vehicle.status === 'pickup-scheduled' && vehicle.pickupDate && activeTab === 'details' && (
                                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 mt-4">
                                    <p className="text-sm text-green-400 font-medium">Scheduled Pickup</p>
                                    <p className="text-sm text-slate-300 mt-1">
                                        {new Date(vehicle.pickupDate).toLocaleDateString()} at {vehicle.pickupTime}
                                    </p>
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
                                <Button variant="secondary" onClick={generatePickupForm} disabled={isGeneratingPDF}>
                                    <Printer className="h-4 w-4" />
                                    {isGeneratingPDF ? 'Generating...' : 'Print'}
                                </Button>
                                {activeTab === 'details' && (
                                    isEditing ? (
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
                                    )
                                )}
                            </div>
                        </div>

                        {/* Delete Confirmation */}
                        {showDeleteConfirm && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
                                <div className="glass rounded-xl p-6 max-w-sm">
                                    <h3 className="text-lg font-semibold text-slate-100 mb-2">Delete Vehicle?</h3>
                                    <p className="text-sm text-slate-400 mb-4">
                                        This will permanently delete {vehicle.stockNumber}. This action cannot be undone.
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

                        {/* Schedule Pickup Modal */}
                        {showScheduleModal && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
                                <div className="glass rounded-xl p-6 max-w-sm w-full">
                                    <h3 className="text-lg font-semibold text-slate-100 mb-4">Schedule Pickup</h3>
                                    <div className="space-y-4">
                                        <Input
                                            type="date"
                                            label="Pickup Date"
                                            value={scheduleData.pickupDate}
                                            onChange={(e) => setScheduleData({ ...scheduleData, pickupDate: e.target.value })}
                                        />
                                        <Input
                                            type="time"
                                            label="Pickup Time"
                                            value={scheduleData.pickupTime}
                                            onChange={(e) => setScheduleData({ ...scheduleData, pickupTime: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleSchedulePickup} disabled={isLoading}>
                                            Schedule
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Mark as Sold Modal */}
                        {showSoldModal && (
                            <SoldModal
                                vehicle={vehicle}
                                onClose={() => setShowSoldModal(false)}
                                onSubmit={handleMarkAsSold}
                                isLoading={isLoading}
                            />
                        )}


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


function SoldModal({ vehicle, onClose, onSubmit, isLoading }) {
    const [hasTradeIn, setHasTradeIn] = useState(false);

    // Get customer name from vehicle data (check multiple possible fields)
    const getCustomerName = () => {
        if (vehicle.customer?.name) return vehicle.customer.name;
        if (vehicle.customer?.firstName || vehicle.customer?.lastName) {
            return `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim();
        }
        return '';
    };

    const [soldData, setSoldData] = useState({
        saleAmount: '',
        saleDate: new Date().toISOString().split('T')[0],
        customerName: getCustomerName(),
        paymentMethod: '',
        paymentReference: '',
        notes: '',
    });
    const [tradeInData, setTradeInData] = useState({
        vin: '',
        year: '',
        make: '',
        model: '',
        color: '',
        mileage: '',
    });

    const handleSubmit = () => {
        // Validate required fields (customerName is now optional since it's auto-filled)
        if (!soldData.saleAmount || !soldData.saleDate || !soldData.paymentMethod || !soldData.paymentReference) {
            alert('Please fill in all required payment fields');
            return;
        }

        if (hasTradeIn) {
            if (!tradeInData.vin || !tradeInData.year || !tradeInData.make || !tradeInData.model || !tradeInData.color) {
                alert('Please fill in all trade-in vehicle details');
                return;
            }
        }

        // Submit with trade-in data if applicable - use auto-filled customer name
        onSubmit({
            ...soldData,
            customerName: soldData.customerName || getCustomerName(),
            saleAmount: parseFloat(soldData.saleAmount),
            hasTradeIn,
            tradeIn: hasTradeIn ? tradeInData : null,
        });
    };

    const PICKUP_TIMES = [
        { value: '', label: 'Select Time' },
        { value: '08:00', label: '8:00 AM' },
        { value: '08:30', label: '8:30 AM' },
        { value: '09:00', label: '9:00 AM' },
        { value: '09:30', label: '9:30 AM' },
        { value: '10:00', label: '10:00 AM' },
        { value: '10:30', label: '10:30 AM' },
        { value: '11:00', label: '11:00 AM' },
        { value: '11:30', label: '11:30 AM' },
        { value: '12:00', label: '12:00 PM' },
        { value: '12:30', label: '12:30 PM' },
        { value: '13:00', label: '1:00 PM' },
        { value: '13:30', label: '1:30 PM' },
        { value: '14:00', label: '2:00 PM' },
        { value: '14:30', label: '2:30 PM' },
        { value: '15:00', label: '3:00 PM' },
        { value: '15:30', label: '3:30 PM' },
        { value: '16:00', label: '4:00 PM' },
        { value: '16:30', label: '4:30 PM' },
        { value: '17:00', label: '5:00 PM' },
    ];

    return (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="glass-strong rounded-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Mark as Sold</h3>

                {/* Vehicle & Customer Info (Auto-filled) */}
                <div className="mb-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-slate-500">Stock #:</span>{' '}
                            <span className="text-slate-200 font-medium">{vehicle.stockNumber}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Vehicle:</span>{' '}
                            <span className="text-slate-200">{vehicle.year} {vehicle.make} {vehicle.model}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-slate-500">VIN:</span>{' '}
                            <span className="text-slate-200 font-mono text-xs">{vehicle.vin}</span>
                        </div>
                        {getCustomerName() && (
                            <div className="col-span-2">
                                <span className="text-slate-500">Customer:</span>{' '}
                                <span className="text-slate-200">{getCustomerName()}</span>
                            </div>
                        )}
                        {vehicle.fleetCompany && (
                            <div>
                                <span className="text-slate-500">Fleet:</span>{' '}
                                <span className="text-slate-200">{vehicle.fleetCompany}</span>
                            </div>
                        )}
                        {vehicle.operationCompany && (
                            <div>
                                <span className="text-slate-500">Operation:</span>{' '}
                                <span className="text-slate-200">{vehicle.operationCompany}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Customer Name (editable if needed, pre-filled from vehicle data) */}
                    <Input
                        label="Customer Name"
                        value={soldData.customerName}
                        onChange={(e) => setSoldData({ ...soldData, customerName: e.target.value })}
                        placeholder="Enter or update customer name"
                    />

                    {/* Sale Amount and Date */}
                    <FormRow>
                        <Input
                            type="number"
                            label="Sale Amount ($) *"
                            value={soldData.saleAmount}
                            onChange={(e) => setSoldData({ ...soldData, saleAmount: e.target.value })}
                            placeholder="0.00"
                            step="0.01"
                        />
                        <Input
                            type="date"
                            label="Sale Date *"
                            value={soldData.saleDate}
                            onChange={(e) => setSoldData({ ...soldData, saleDate: e.target.value })}
                        />
                    </FormRow>

                    {/* Payment Method and Reference */}
                    <FormRow>
                        <Select
                            label="Payment Method *"
                            value={soldData.paymentMethod}
                            onChange={(e) => setSoldData({ ...soldData, paymentMethod: e.target.value })}
                        >
                            <option value="">Select Payment Method</option>
                            <option value="ACH">ACH</option>
                            <option value="Check">Check</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="Wire Transfer">Wire Transfer</option>
                            <option value="Cash">Cash</option>
                        </Select>
                        <Input
                            label="Reference Number *"
                            value={soldData.paymentReference}
                            onChange={(e) => setSoldData({ ...soldData, paymentReference: e.target.value })}
                            placeholder="Transaction/Check #"
                        />
                    </FormRow>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
                        <textarea
                            value={soldData.notes}
                            onChange={(e) => setSoldData({ ...soldData, notes: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg text-sm text-slate-200 bg-slate-800/50 border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="Any additional notes..."
                        />
                    </div>

                    {/* Trade-In Section */}
                    <div className="pt-4 border-t border-slate-700/50">
                        <Select
                            label="Trade-In Vehicle?"
                            value={hasTradeIn ? 'yes' : 'no'}
                            onChange={(e) => setHasTradeIn(e.target.value === 'yes')}
                        >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </Select>

                        {hasTradeIn && (
                            <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <h4 className="text-sm font-semibold text-blue-300 mb-3">Trade-In Vehicle Details</h4>
                                <div className="space-y-3">
                                    <Input
                                        label="VIN *"
                                        value={tradeInData.vin}
                                        onChange={(e) => setTradeInData({ ...tradeInData, vin: e.target.value.toUpperCase() })}
                                        maxLength={17}
                                        placeholder="17-character VIN"
                                    />
                                    <FormRow>
                                        <Input
                                            type="number"
                                            label="Year *"
                                            value={tradeInData.year}
                                            onChange={(e) => setTradeInData({ ...tradeInData, year: e.target.value })}
                                            min="1980"
                                            max="2030"
                                        />
                                        <Input
                                            label="Make *"
                                            value={tradeInData.make}
                                            onChange={(e) => setTradeInData({ ...tradeInData, make: e.target.value })}
                                        />
                                    </FormRow>
                                    <FormRow>
                                        <Input
                                            label="Model *"
                                            value={tradeInData.model}
                                            onChange={(e) => setTradeInData({ ...tradeInData, model: e.target.value })}
                                        />
                                        <Input
                                            label="Color *"
                                            value={tradeInData.color}
                                            onChange={(e) => setTradeInData({ ...tradeInData, color: e.target.value })}
                                        />
                                    </FormRow>
                                    <Input
                                        type="number"
                                        label="Mileage"
                                        value={tradeInData.mileage}
                                        onChange={(e) => setTradeInData({ ...tradeInData, mileage: e.target.value })}
                                        placeholder="Current mileage"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 mt-6">
                    <Button variant="secondary" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                    <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : 'Complete Sale'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

