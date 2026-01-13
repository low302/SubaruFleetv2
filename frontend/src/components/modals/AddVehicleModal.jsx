import { useState } from "react";
import { SimpleModal } from "../ui/animated-modal";
import { Button } from "../ui/button";
import { Input, Select, Textarea, FormRow } from "../ui/input";
import { inventory } from "../../services/api";

export default function AddVehicleModal({ isOpen, onClose, onSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        stockNumber: "",
        vin: "",
        year: "",
        make: "Subaru",
        model: "",
        trim: "",
        color: "",
        status: "in-transit",
        fleetCompany: "",
        operationCompany: "",
        notes: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Auto-generate stock number from VIN
        if (name === "vin" && value.length >= 5) {
            const stockNum = "CD" + value.slice(-5).toUpperCase();
            setFormData((prev) => ({ ...prev, stockNumber: stockNum }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            await inventory.add(formData);
            onSuccess();
            // Reset form
            setFormData({
                stockNumber: "",
                vin: "",
                year: "",
                make: "Subaru",
                model: "",
                trim: "",
                color: "",
                status: "in-transit",
                fleetCompany: "",
                operationCompany: "",
                notes: "",
            });
        } catch (err) {
            setError(err.message || "Failed to add vehicle");
        } finally {
            setIsLoading(false);
        }
    };

    const subaruModels = [
        "Ascent",
        "Crosstrek",
        "Forester",
        "Impreza",
        "Legacy",
        "Outback",
        "Solterra",
        "WRX",
        "BRZ",
    ];

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Vehicle"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? "Adding..." : "Add Vehicle"}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                        {error}
                    </div>
                )}

                <FormRow>
                    <Input
                        label="VIN"
                        name="vin"
                        value={formData.vin}
                        onChange={handleChange}
                        placeholder="Enter VIN"
                        required
                    />
                    <Input
                        label="Stock Number"
                        name="stockNumber"
                        value={formData.stockNumber}
                        onChange={handleChange}
                        placeholder="Auto-generated from VIN"
                        required
                    />
                </FormRow>

                <FormRow>
                    <Input
                        label="Year"
                        name="year"
                        type="number"
                        value={formData.year}
                        onChange={handleChange}
                        placeholder="2024"
                        required
                    />
                    <Input
                        label="Make"
                        name="make"
                        value={formData.make}
                        onChange={handleChange}
                        placeholder="Subaru"
                        required
                    />
                </FormRow>

                <FormRow>
                    <Select
                        label="Model"
                        name="model"
                        value={formData.model}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select Model</option>
                        {subaruModels.map((model) => (
                            <option key={model} value={model}>
                                {model}
                            </option>
                        ))}
                    </Select>
                    <Input
                        label="Trim"
                        name="trim"
                        value={formData.trim}
                        onChange={handleChange}
                        placeholder="Limited, Premium, etc."
                    />
                </FormRow>

                <FormRow>
                    <Input
                        label="Color"
                        name="color"
                        value={formData.color}
                        onChange={handleChange}
                        placeholder="Crystal White Pearl"
                    />
                    <Select
                        label="Status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        required
                    >
                        <option value="in-transit">In-Transit</option>
                        <option value="in-stock">In Stock</option>
                        <option value="pdi">PDI</option>
                    </Select>
                </FormRow>

                <FormRow>
                    <Input
                        label="Fleet Company"
                        name="fleetCompany"
                        value={formData.fleetCompany}
                        onChange={handleChange}
                        placeholder="Fleet company name"
                    />
                    <Input
                        label="Operation Company"
                        name="operationCompany"
                        value={formData.operationCompany}
                        onChange={handleChange}
                        placeholder="Operation company name"
                    />
                </FormRow>

                <Textarea
                    label="Notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Additional notes..."
                    rows={3}
                />
            </form>
        </SimpleModal>
    );
}
