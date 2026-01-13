const API_BASE = '/api';

/**
 * API Service Layer
 * Wraps all backend API calls
 */

// Helper for handling responses
async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || error.message || 'Request failed');
    }
    return response.json();
}

// Helper for making requests
async function request(endpoint, options = {}) {
    const config = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    return handleResponse(response);
}

// Auth APIs
export const auth = {
    login: (username, password) =>
        request('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),

    logout: () =>
        request('/logout', {
            method: 'POST',
        }),

    checkAuth: () => request('/auth-check'),
};

// Inventory APIs
export const inventory = {
    getAll: () => request('/inventory'),

    add: (vehicle) =>
        request('/inventory', {
            method: 'POST',
            body: JSON.stringify(vehicle),
        }),

    update: (id, vehicle) =>
        request(`/inventory/${id}`, {
            method: 'PUT',
            body: JSON.stringify(vehicle),
        }),

    updateStatus: (id, statusData) =>
        request(`/inventory/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify(statusData),
        }),

    updateCustomer: (id, customerData) =>
        request(`/inventory/${id}/customer`, {
            method: 'PUT',
            body: JSON.stringify(customerData),
        }),

    markAsSold: (id, soldData) =>
        request(`/inventory/${id}/mark-sold`, {
            method: 'POST',
            body: JSON.stringify(soldData),
        }),

    delete: (id) =>
        request(`/inventory/${id}`, {
            method: 'DELETE',
        }),

    clearInStockDates: () =>
        request('/inventory/fix-intransit-dates', {
            method: 'POST',
        }),

};

// Sold Vehicles APIs
export const soldVehicles = {
    getAll: () => request('/sold-vehicles'),

    markAsSold: (data) =>
        request('/sold-vehicles', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id, data) =>
        request(`/sold-vehicles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id) =>
        request(`/sold-vehicles/${id}`, {
            method: 'DELETE',
        }),
};

// Trade-ins APIs
export const tradeIns = {
    getAll: () => request('/trade-ins'),

    add: (tradeIn) =>
        request('/trade-ins', {
            method: 'POST',
            body: JSON.stringify(tradeIn),
        }),

    update: (id, tradeIn) =>
        request(`/trade-ins/${id}`, {
            method: 'PUT',
            body: JSON.stringify(tradeIn),
        }),

    delete: (id) =>
        request(`/trade-ins/${id}`, {
            method: 'DELETE',
        }),

    togglePickup: (id) =>
        request(`/trade-ins/${id}/toggle-pickup`, {
            method: 'POST',
        }),
};

// Sales APIs
export const sales = {
    getAll: () => request('/sales'),

    add: (sale) =>
        request('/sales', {
            method: 'POST',
            body: JSON.stringify(sale),
        }),

    addBulk: (salesArray) =>
        request('/sales/bulk', {
            method: 'POST',
            body: JSON.stringify(salesArray),
        }),

    update: (id, sale) =>
        request(`/sales/${id}`, {
            method: 'PUT',
            body: JSON.stringify(sale),
        }),

    delete: (id) =>
        request(`/sales/${id}`, {
            method: 'DELETE',
        }),
};

// Salespeople APIs
export const salespeople = {
    getAll: () => request('/salespeople'),

    add: (name) =>
        request('/salespeople', {
            method: 'POST',
            body: JSON.stringify({ name }),
        }),

    delete: (id) =>
        request(`/salespeople/${id}`, {
            method: 'DELETE',
        }),
};

// Settings APIs
export const settings = {
    get: () => request('/settings'),

    update: (settingsData) =>
        request('/settings', {
            method: 'PUT',
            body: JSON.stringify(settingsData),
        }),
};

// Documents APIs
export const documents = {
    getByVehicle: async (vehicleId) => {
        const response = await fetch(`${API_BASE}/documents/vehicle/${vehicleId}`, {
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to fetch documents' }));
            throw new Error(error.error || 'Failed to fetch documents');
        }
        return response.json();
    },

    upload: async (vehicleId, file, fileName = null) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('vehicleId', vehicleId);
        if (fileName) {
            formData.append('fileName', fileName);
        }

        const response = await fetch(`${API_BASE}/documents/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(error.error || 'Upload failed');
        }
        return response.json();
    },

    view: (docId) => `${API_BASE}/documents/view/${docId}`,

    download: (docId) => `${API_BASE}/documents/download/${docId}`,

    delete: (docId) =>
        request(`/documents/delete/${docId}`, {
            method: 'DELETE',
        }),
};

// Data Transfer APIs (Import/Export)
export const dataTransfer = {
    exportAll: () => request('/export'),

    importData: (data, duplicateAction = 'skip') =>
        request('/import', {
            method: 'POST',
            body: JSON.stringify({ data, duplicateAction }),
        }),
};

// Export all APIs
export const api = {
    auth,
    inventory,
    soldVehicles,
    tradeIns,
    sales,
    salespeople,
    settings,
    documents,
    dataTransfer,
};

export default api;
