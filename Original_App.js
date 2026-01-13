const API_BASE = '/api';
let vehicles = [];
let soldVehicles = [];
let tradeIns = [];
let currentVehicle = null;
let currentFilter = { search: '', make: '', status: '' };

// Mobile Sidebar Toggle
function initMobileSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!menuToggle || !sidebar || !sidebarOverlay) return;

    // Toggle sidebar
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
        menuToggle.classList.toggle('active');
    }

    // Close sidebar
    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        menuToggle.classList.remove('active');
    }

    // Event listeners
    menuToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // Close sidebar when clicking nav links on mobile
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    });

    // Close sidebar on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            closeSidebar();
        }
    });
}

// Custom notification system to replace browser alerts
function showNotification(message, type = 'info') {
    const modal = document.getElementById('notificationModal');
    const icon = document.getElementById('notificationIcon');
    const messageEl = document.getElementById('notificationMessage');
    const okBtn = document.getElementById('notificationOkBtn');

    // Set icon based on type
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠️',
        info: 'ℹ️'
    };
    icon.textContent = icons[type] || icons.info;

    // Set icon color
    const colors = {
        success: 'var(--joy-success-500)',
        error: 'var(--joy-danger-500)',
        warning: 'var(--joy-warning-500)',
        info: 'var(--joy-primary-500)'
    };
    icon.style.color = colors[type] || colors.info;

    messageEl.textContent = message;
    modal.style.display = 'flex';

    // Close on OK button
    okBtn.onclick = () => {
        modal.style.display = 'none';
    };

    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Custom confirmation dialog to replace browser confirms
function showConfirmation(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        messageEl.textContent = message;
        modal.style.display = 'flex';

        // Handle OK button
        okBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };

        // Handle Cancel button
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };

        // Close on outside click (treat as cancel)
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                resolve(false);
            }
        };
    });
}

async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/status`, { credentials: 'include' });
        const data = await response.json();
        if (data.authenticated) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';

            // Update user display
            const userName = document.getElementById('userName');
            const userAvatar = document.getElementById('userAvatar');
            if (userName && data.username) {
                userName.textContent = data.username;
            }
            if (userAvatar && data.username) {
                userAvatar.textContent = data.username.charAt(0).toUpperCase();
            }

            await loadAllData();
        } else {
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('mainApp').style.display = 'none';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
}

async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            await checkAuth();
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Connection error. Please try again.', 'error');
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

async function loadAllData() {
    await Promise.all([loadInventory(), loadSoldVehicles(), loadTradeIns()]);
    updateDashboard();
    renderCurrentPage();
}

async function loadInventory() {
    try {
        const response = await fetch(`${API_BASE}/inventory`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load inventory');
        vehicles = await response.json();
    } catch (error) {
        console.error('Error loading inventory:', error);
        vehicles = [];
    }
}

async function loadSoldVehicles() {
    try {
        const response = await fetch(`${API_BASE}/sold-vehicles`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load sold vehicles');
        soldVehicles = await response.json();
    } catch (error) {
        console.error('Error loading sold vehicles:', error);
        soldVehicles = [];
    }
}

async function loadTradeIns() {
    try {
        const response = await fetch(`${API_BASE}/trade-ins`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load trade-ins');
        tradeIns = await response.json();
    } catch (error) {
        console.error('Error loading trade-ins:', error);
        tradeIns = [];
    }
}

// Auto-generate stock number from VIN (CDXXXXX format where XXXXX = last 5 of VIN)
function autoGenerateStockNumber() {
    const vinInput = document.getElementById('vin').value.toUpperCase();
    const stockNumberInput = document.getElementById('stockNumber');

    // Only generate if VIN is 17 characters
    if (vinInput.length === 17) {
        const lastFive = vinInput.slice(-5);
        stockNumberInput.value = 'CD' + lastFive;
    } else {
        stockNumberInput.value = '';
    }
}

async function addVehicle(event) {
    event.preventDefault();

    // Disable submit button to prevent double submission
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return; // Already submitting
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    // Validate VIN format (17 alphanumeric characters, no I, O, or Q)
    const vinInput = document.getElementById('vin').value.toUpperCase();
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
    if (!vinPattern.test(vinInput)) {
        showNotification('Invalid VIN format. VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q).', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Vehicle';
        return;
    }

    // Get in stock date - only set if user manually provides it
    const inStockDateInput = document.getElementById('inStockDate').value;
    const vehicleStatus = document.getElementById('status').value;
    let inStockDate = null;
    if (inStockDateInput) {
        // Create date in local timezone, then convert to ISO string
        const [year, month, day] = inStockDateInput.split('-');
        const localDate = new Date(year, month - 1, day);
        inStockDate = localDate.toISOString();
    }

    const vehicle = {
        id: Date.now(),
        stockNumber: document.getElementById('stockNumber').value,
        vin: vinInput,
        year: parseInt(document.getElementById('year').value),
        make: document.getElementById('make').value,
        model: document.getElementById('model').value,
        trim: document.getElementById('trim').value,
        color: document.getElementById('color').value,
        fleetCompany: document.getElementById('fleetCompany').value,
        operationCompany: document.getElementById('addOperationCompany').value,
        status: vehicleStatus,
        dateAdded: new Date().toISOString(),
        inStockDate: inStockDate,
        customer: null,
        documents: []
    };

    try {
        const response = await fetch(`${API_BASE}/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(vehicle)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add vehicle');
        }

        await loadInventory();
        closeAddModal();
        updateDashboard();
        renderCurrentPage();
        document.getElementById('vehicleForm').reset();
        showNotification('Vehicle added successfully!', 'success');

    } catch (error) {
        console.error('Error adding vehicle:', error);
        showNotification('Failed to add vehicle: ' + error.message, 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Vehicle';
    }
}

async function updateVehicleStatus() {
    if (!currentVehicle) return;
    const newStatus = document.getElementById('detailStatus').value;
    const currentlyInSold = soldVehicles.some(v => v.id === currentVehicle.id);

    // Moving TO sold status - show sold modal
    if (newStatus === 'sold' && !currentlyInSold) {
        // Save reference to vehicle before closing modal
        const vehicleToSell = currentVehicle;
        closeDetailModal();
        currentVehicle = vehicleToSell; // Restore the vehicle reference
        openSoldModal();
        return;
    }
    // Moving FROM sold back to inventory
    else if (newStatus !== 'sold' && currentlyInSold) {
        const inventoryVehicle = { ...currentVehicle, status: newStatus };
        try {
            // First add back to inventory
            const inventoryResponse = await fetch(`${API_BASE}/inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(inventoryVehicle)
            });

            if (!inventoryResponse.ok) {
                const errorData = await inventoryResponse.json();
                throw new Error(errorData.error || 'Failed to add to inventory');
            }

            // Then delete from sold vehicles
            const deleteResponse = await fetch(`${API_BASE}/sold-vehicles/${currentVehicle.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!deleteResponse.ok) {
                throw new Error('Failed to remove from sold vehicles');
            }

            await loadAllData();
            closeDetailModal();
            updateDashboard();
            renderCurrentPage();
            showNotification('Vehicle moved back to inventory successfully!', 'success');

        } catch (error) {
            console.error('Error moving vehicle from sold:', error);
            showNotification('Failed to update vehicle status: ' + error.message, 'error');
        }
    }
    // Pickup scheduled (requires additional info)
    else if (newStatus === 'pickup-scheduled') {
        openPickupScheduleModal();
    }
    // Regular status update within inventory
    else {
        currentVehicle.status = newStatus;

        try {
            const response = await fetch(`${API_BASE}/inventory/${currentVehicle.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(currentVehicle)
            });
            if (!response.ok) throw new Error('Failed to update vehicle');
            await loadInventory();
            closeDetailModal();
            updateDashboard();
            renderCurrentPage();
        } catch (error) {
            console.error('Error updating vehicle:', error);
            showNotification('Failed to update vehicle status. Please try again.', 'error');
        }
    }
}

async function deleteVehicle(vehicleId) {
    const confirmed = await showConfirmation('Are you sure you want to delete this vehicle? This action cannot be undone.');
    if (!confirmed) return;

    try {
        // Check if vehicle is in sold vehicles
        const isInSold = soldVehicles.some(v => v.id === vehicleId);

        if (isInSold) {
            // Delete from sold vehicles table
            const response = await fetch(`${API_BASE}/sold-vehicles/${vehicleId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete sold vehicle');
            }
        } else {
            // Delete from inventory table
            const response = await fetch(`${API_BASE}/inventory/${vehicleId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete vehicle');
            }
        }

        // Reload all data
        await loadAllData();
        closeDetailModal();
        updateDashboard();
        renderCurrentPage();
        showNotification('Vehicle deleted successfully!', 'success');

    } catch (error) {
        console.error('Error deleting vehicle:', error);
        showNotification('Failed to delete vehicle: ' + error.message, 'error');
    }
}

async function saveCustomerInfo(event) {
    event.preventDefault();
    if (!currentVehicle) return;

    // Preserve existing payment information if it exists
    const existingCustomer = currentVehicle.customer || {};
    currentVehicle.customer = {
        firstName: document.getElementById('customerFirstName').value,
        lastName: document.getElementById('customerLastName').value,
        phone: document.getElementById('customerPhone').value,
        notes: document.getElementById('notes').value,
        // Preserve payment fields
        saleAmount: existingCustomer.saleAmount || 0,
        saleDate: existingCustomer.saleDate || '',
        paymentMethod: existingCustomer.paymentMethod || '',
        paymentReference: existingCustomer.paymentReference || ''
    };
    try {
        const response = await fetch(`${API_BASE}/inventory/${currentVehicle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(currentVehicle)
        });
        if (!response.ok) throw new Error('Failed to save customer info');
        await loadInventory();
        showNotification('Customer information saved successfully!', 'success');
        renderDetailModal(currentVehicle);
    } catch (error) {
        console.error('Error saving customer info:', error);
        showNotification('Failed to save customer information. Please try again.', 'error');
    }
}

async function savePaymentInfo(event) {
    event.preventDefault();
    if (!currentVehicle) return;

    // Preserve existing customer information if it exists
    const existingCustomer = currentVehicle.customer || {};
    currentVehicle.customer = {
        ...existingCustomer,
        saleAmount: parseFloat(document.getElementById('saleAmount').value) || 0,
        saleDate: document.getElementById('saleDate').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        paymentReference: document.getElementById('paymentReference').value
    };
    try {
        const response = await fetch(`${API_BASE}/inventory/${currentVehicle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(currentVehicle)
        });
        if (!response.ok) throw new Error('Failed to save payment info');
        await loadInventory();
        showNotification('Payment information saved successfully!', 'success');
        renderDetailModal(currentVehicle);
    } catch (error) {
        console.error('Error saving payment info:', error);
        showNotification('Failed to save payment information. Please try again.', 'error');
    }
}

function enableEditMode(vehicleId) {
    window.currentlyEditingVehicle = vehicleId;
    const vehicle = vehicles.find(v => v.id === vehicleId) || soldVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
        currentVehicle = vehicle;
        renderDetailModal(vehicle);
    }
}

function cancelEditMode() {
    window.currentlyEditingVehicle = null;
    if (currentVehicle) {
        renderDetailModal(currentVehicle);
    }
}

async function saveVehicleEdit(event) {
    event.preventDefault();
    if (!currentVehicle) return;

    // Validate VIN format (17 alphanumeric characters, no I, O, or Q)
    const vinInput = document.getElementById('editVin').value.toUpperCase();
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
    if (!vinPattern.test(vinInput)) {
        showNotification('Invalid VIN format. VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q).', 'error');
        return;
    }

    // Get in stock date - allow it to be cleared (null)
    const inStockDateInput = document.getElementById('editInStockDate').value;
    let inStockDate = null;
    if (inStockDateInput) {
        // Create date in local timezone, then convert to ISO string
        const [year, month, day] = inStockDateInput.split('-');
        const localDate = new Date(year, month - 1, day);
        inStockDate = localDate.toISOString();
    }

    // Update only the edited fields, preserve everything else
    const updatedVehicle = {
        ...currentVehicle,
        stockNumber: document.getElementById('editStockNumber').value,
        vin: vinInput,
        year: parseInt(document.getElementById('editYear').value),
        make: document.getElementById('editMake').value,
        model: document.getElementById('editModel').value,
        trim: document.getElementById('editTrim').value,
        color: document.getElementById('editColor').value,
        fleetCompany: document.getElementById('editFleetCompany').value,
        operationCompany: document.getElementById('editOperationCompany').value,
        inStockDate: inStockDate
    };

    try {
        const isInSold = soldVehicles.some(v => v.id === currentVehicle.id);
        const endpoint = isInSold ? 'sold-vehicles' : 'inventory';

        const response = await fetch(`${API_BASE}/${endpoint}/${updatedVehicle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updatedVehicle)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save vehicle changes');
        }

        await loadAllData();

        const reloadedVehicle = vehicles.find(v => v.id === updatedVehicle.id) || soldVehicles.find(v => v.id === updatedVehicle.id);

        window.currentlyEditingVehicle = null;
        currentVehicle = reloadedVehicle || updatedVehicle;
        renderDetailModal(currentVehicle);
        updateDashboard();
        renderCurrentPage();
        showNotification('Vehicle updated successfully!', 'success');

    } catch (error) {
        console.error('Error saving vehicle:', error);
        showNotification('Failed to save vehicle changes: ' + error.message, 'error');
    }
}

async function addTradeIn(event) {
    event.preventDefault();

    // Validate VIN format (17 alphanumeric characters, no I, O, or Q)
    const vinInput = document.getElementById('tradeVin').value.toUpperCase();
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
    if (!vinPattern.test(vinInput)) {
        showNotification('Invalid VIN format. VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q).', 'error');
        return;
    }

    // Get stock number - use provided value or generate from timestamp
    let stockNumber = document.getElementById('tradeStockNumber').value.trim();
    if (!stockNumber) {
        // Auto-generate stock number if not provided
        stockNumber = 'TI-' + Date.now();
    }

    const tradeIn = {
        id: Date.now(),
        stockNumber: stockNumber,
        vin: vinInput,
        year: parseInt(document.getElementById('tradeYear').value),
        make: document.getElementById('tradeMake').value,
        model: document.getElementById('tradeModel').value,
        trim: document.getElementById('tradeTrim').value || '',
        color: document.getElementById('tradeColor').value,
        mileage: parseInt(document.getElementById('tradeMileage').value) || 0,
        notes: document.getElementById('tradeNotes').value,
        pickedUp: false,
        pickedUpDate: null,
        dateAdded: new Date().toISOString()
    };
    try {
        const response = await fetch(`${API_BASE}/trade-ins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(tradeIn)
        });
        if (!response.ok) throw new Error('Failed to add trade-in');
        if (currentVehicle) {
            currentVehicle.tradeInId = tradeIn.id;
            await fetch(`${API_BASE}/inventory/${currentVehicle.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(currentVehicle)
            });
        }
        await loadAllData();
        closeTradeInModal();
        closeDetailModal();
        updateDashboard();
        renderCurrentPage();
        document.getElementById('tradeInForm').reset();
        showNotification('Trade-in vehicle added successfully!', 'success');
    } catch (error) {
        console.error('Error adding trade-in:', error);
        showNotification('Failed to add trade-in vehicle. Please try again.', 'error');
    }
}

async function toggleTradeInPickup(tradeInId) {
    const tradeIn = tradeIns.find(t => t.id === tradeInId);
    if (!tradeIn) return;
    if (!tradeIn.pickedUp) {
        // Mark as picked up immediately
        tradeIn.pickedUp = true;
        tradeIn.pickedUpDate = new Date().toISOString();
        try {
            await fetch(`${API_BASE}/trade-ins/${tradeInId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(tradeIn)
            });
            await loadTradeIns();
            renderCurrentPage();
        } catch (error) {
            console.error('Error updating trade-in:', error);
            showNotification('Failed to update trade-in. Please try again.', 'error');
        }
    } else {
        // Unmark as picked up
        tradeIn.pickedUp = false;
        tradeIn.pickedUpDate = null;
        try {
            await fetch(`${API_BASE}/trade-ins/${tradeInId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(tradeIn)
            });
            await loadTradeIns();
            renderCurrentPage();
        } catch (error) {
            console.error('Error updating trade-in:', error);
            showNotification('Failed to update trade-in. Please try again.', 'error');
        }
    }
}

function openTradeInDetail(tradeInId) {
    const tradeIn = tradeIns.find(t => t.id === tradeInId);
    if (!tradeIn) return;

    window.currentTradeInId = tradeInId;
    window.currentTradeIn = tradeIn;
    window.currentlyEditingTradeIn = null;

    renderTradeInDetailModal(tradeIn);
    document.getElementById('tradeInDetailModal').style.display = 'flex';
}

function closeTradeInDetailModal() {
    document.getElementById('tradeInDetailModal').style.display = 'none';
    window.currentTradeInId = null;
    window.currentTradeIn = null;
    window.currentlyEditingTradeIn = null;
}

function enableTradeInEditMode(tradeInId) {
    window.currentlyEditingTradeIn = tradeInId;
    const tradeIn = tradeIns.find(t => t.id === tradeInId);
    if (tradeIn) {
        renderTradeInDetailModal(tradeIn);
    }
}

function cancelTradeInEditMode() {
    window.currentlyEditingTradeIn = null;
    const tradeIn = tradeIns.find(t => t.id === window.currentTradeInId);
    if (tradeIn) {
        renderTradeInDetailModal(tradeIn);
    }
}

async function saveTradeInEdit(event) {
    event.preventDefault();

    const tradeIn = tradeIns.find(t => t.id === window.currentTradeInId);
    if (!tradeIn) return;

    tradeIn.stockNumber = document.getElementById('editTradeStockNumber').value;
    tradeIn.vin = document.getElementById('editTradeVin').value.toUpperCase();
    tradeIn.year = parseInt(document.getElementById('editTradeYear').value);
    tradeIn.make = document.getElementById('editTradeMake').value;
    tradeIn.model = document.getElementById('editTradeModel').value;
    tradeIn.trim = document.getElementById('editTradeTrim').value;
    tradeIn.color = document.getElementById('editTradeColor').value;
    tradeIn.mileage = parseInt(document.getElementById('editTradeMileage').value) || 0;
    tradeIn.notes = document.getElementById('editTradeNotes').value;

    try {
        await fetch(`${API_BASE}/trade-ins/${tradeIn.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(tradeIn)
        });

        await loadTradeIns();
        showNotification('Trade-in updated successfully!', 'success');
        window.currentlyEditingTradeIn = null;
        renderTradeInDetailModal(tradeIn);
        renderCurrentPage();
    } catch (error) {
        console.error('Error saving trade-in:', error);
        showNotification('Failed to save trade-in changes: ' + error.message, 'error');
    }
}

function renderTradeInDetailModal(tradeIn) {
    const content = document.getElementById('tradeInDetailContent');
    const isEditing = window.currentlyEditingTradeIn === tradeIn.id;

    if (!isEditing) {
        // Display mode
        content.innerHTML = `
            <div class="vehicle-info">
                <div class="info-item"><div class="info-label">Stock #</div><div class="info-value">${tradeIn.stockNumber || 'N/A'}</div></div>
                <div class="info-item"><div class="info-label">VIN</div><div class="info-value">${tradeIn.vin}</div></div>
                <div class="info-item"><div class="info-label">Year</div><div class="info-value">${tradeIn.year}</div></div>
                <div class="info-item"><div class="info-label">Make</div><div class="info-value">${tradeIn.make}</div></div>
                <div class="info-item"><div class="info-label">Model</div><div class="info-value">${tradeIn.model}</div></div>
                <div class="info-item"><div class="info-label">Trim</div><div class="info-value">${tradeIn.trim || 'N/A'}</div></div>
                <div class="info-item"><div class="info-label">Color</div><div class="info-value">${tradeIn.color}</div></div>
                <div class="info-item"><div class="info-label">Mileage</div><div class="info-value">${tradeIn.mileage ? tradeIn.mileage.toLocaleString() : 'N/A'}</div></div>
                ${tradeIn.notes ? `<div class="info-item"><div class="info-label">Notes</div><div class="info-value">${tradeIn.notes}</div></div>` : ''}
                <div class="info-item"><div class="info-label">Status</div><div class="info-value">${tradeIn.pickedUp ? '<span class="picked-up-badge">✓ Picked Up</span>' : '<span class="status-badge status-pending-pickup">Awaiting Pickup</span>'}</div></div>
                ${tradeIn.pickedUp && tradeIn.pickedUpDate ? `<div class="info-item"><div class="info-label">Picked Up Date</div><div class="info-value">${new Date(tradeIn.pickedUpDate).toLocaleDateString()}</div></div>` : ''}
            </div>
            <div style="margin-top: 2rem;">
                <label class="custom-checkbox">
                    <input type="checkbox" ${tradeIn.pickedUp ? 'checked' : ''} onchange="toggleTradeInPickup(${tradeIn.id})">
                    <span class="checkbox-label">
                        <span class="checkbox-box"></span>
                        <span class="checkbox-text">Mark as Picked Up</span>
                    </span>
                </label>
            </div>
            <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                <button class="btn btn-secondary" onclick='generateTradeInKeytag(${JSON.stringify(tradeIn).replace(/'/g, "&#39;")})' style="flex: 1;">🏷️ Generate Keytag</button>
                <button class="btn" onclick="enableTradeInEditMode(${tradeIn.id})" style="flex: 1;">✏️ Edit Trade-In</button>
            </div>
        `;
    } else {
        // Edit mode
        content.innerHTML = `
            <form id="editTradeInForm" onsubmit="saveTradeInEdit(event)">
                <div class="form-group">
                    <label for="editTradeStockNumber">Stock #</label>
                    <input type="text" id="editTradeStockNumber" value="${tradeIn.stockNumber || ''}">
                </div>
                <div class="form-group">
                    <label for="editTradeVin">VIN</label>
                    <input type="text" id="editTradeVin" value="${tradeIn.vin}" maxlength="17" minlength="17" pattern="[A-HJ-NPR-Z0-9]{17}" title="VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q)" required style="text-transform: uppercase;">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editTradeYear">Year</label>
                        <input type="number" id="editTradeYear" value="${tradeIn.year}" min="1980" max="2030" required title="Vehicle year must be between 1980 and 2030">
                    </div>
                    <div class="form-group">
                        <label for="editTradeMake">Make</label>
                        <input type="text" id="editTradeMake" value="${tradeIn.make}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editTradeModel">Model</label>
                        <input type="text" id="editTradeModel" value="${tradeIn.model}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTradeTrim">Trim</label>
                        <input type="text" id="editTradeTrim" value="${tradeIn.trim || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editTradeColor">Color</label>
                        <input type="text" id="editTradeColor" value="${tradeIn.color}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTradeMileage">Mileage</label>
                        <input type="number" id="editTradeMileage" value="${tradeIn.mileage || ''}" min="0">
                    </div>
                </div>
                <div class="form-group">
                    <label for="editTradeNotes">Notes</label>
                    <textarea id="editTradeNotes" rows="3">${tradeIn.notes || ''}</textarea>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button type="submit" class="btn" style="flex: 1;">💾 Save Changes</button>
                    <button type="button" class="btn btn-secondary" onclick="cancelTradeInEditMode()" style="flex: 1;">✖ Cancel</button>
                </div>
            </form>
        `;
    }
}

async function deleteTradeIn(tradeInId) {
    const confirmed = await showConfirmation('Are you sure you want to delete this trade-in? This action cannot be undone.');
    if (!confirmed) return;

    try {
        await fetch(`${API_BASE}/trade-ins/${tradeInId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        await loadTradeIns();
        closeTradeInDetailModal();
        showNotification('Trade-in deleted successfully!', 'success');
        renderCurrentPage();
    } catch (error) {
        console.error('Error deleting trade-in:', error);
        showNotification('Failed to delete trade-in: ' + error.message, 'error');
    }
}

async function schedulePickup(event) {
    event.preventDefault();
    if (!currentVehicle) return;
    currentVehicle.pickupDate = document.getElementById('pickupDate').value;
    currentVehicle.pickupTime = document.getElementById('pickupTime').value;
    currentVehicle.pickupNotes = document.getElementById('pickupNotes').value;
    currentVehicle.status = 'pickup-scheduled';
    try {
        await fetch(`${API_BASE}/inventory/${currentVehicle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(currentVehicle)
        });
        await loadInventory();
        closePickupScheduleModal();
        closeDetailModal();
        updateDashboard();
        renderCurrentPage();
        document.getElementById('pickupScheduleForm').reset();
    } catch (error) {
        console.error('Error scheduling pickup:', error);
        showNotification('Failed to schedule pickup. Please try again.', 'error');
    }
}

function completePickup(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    // Set the current vehicle
    currentVehicle = vehicle;

    // Open the sold modal to complete the sale
    openSoldModal();
}

function generateLabelById(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId) ||
        soldVehicles.find(v => v.id === vehicleId) ||
        tradeIns.find(t => t.id === vehicleId);
    if (vehicle) {
        generateLabel(vehicle);
    }
}

function generateLabel(vehicle) {
    currentVehicle = vehicle;

    // Set stock number
    document.getElementById('labelStockNumber').textContent = `Stock #${vehicle.stockNumber}`;

    // Set vehicle description
    document.getElementById('labelVehicle').textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

    // Set additional info
    const labelInfo = document.getElementById('labelInfo');
    labelInfo.innerHTML = `
        <div><strong>VIN:</strong> ${vehicle.vin}</div>
        <div><strong>Trim:</strong> ${vehicle.trim} • <strong>Color:</strong> ${vehicle.color}</div>
        <div><strong>Op Co:</strong> ${vehicle.operationCompany || 'N/A'} • <strong>Fleet:</strong> ${vehicle.fleetCompany || 'N/A'}</div>
    `;

    // Generate QR code with VIN only
    const qrContainer = document.getElementById('labelQR');
    qrContainer.innerHTML = '';

    // Create QR code - qrcode.js library auto-generates it
    try {
        // Using the qrcode.js library (different from qrcodejs)
        if (typeof QRCode !== 'undefined' && QRCode) {
            new QRCode(qrContainer, {
                text: vehicle.vin,
                width: 140,
                height: 140,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.H : 2
            });
        } else {
            throw new Error('QRCode library not available');
        }
    } catch (error) {
        console.error('QRCode error:', error);
        // Fallback: display VIN as text
        qrContainer.innerHTML = `<div style="width: 140px; height: 140px; background: #f0f0f0; border: 2px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 9px; text-align: center; padding: 8px; word-break: break-all; font-family: monospace; font-weight: 600;">${vehicle.vin}</div>`;
    }

    // Populate key tag preview
    document.getElementById('keyLabelStock').textContent = vehicle.stockNumber;
    document.getElementById('keyLabelVehicle').textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const vinLast8 = vehicle.vin ? vehicle.vin.slice(-8) : '';
    document.getElementById('keyLabelVin').textContent = `VIN: ${vinLast8}`;
    document.getElementById('keyLabelColor').textContent = `Color: ${vehicle.color || 'N/A'}`;
    document.getElementById('keyLabelFleet').textContent = `Fleet: ${vehicle.fleetCompany || 'N/A'}`;
    document.getElementById('keyLabelOperation').textContent = `Op Co: ${vehicle.operationCompany || 'N/A'}`;

    // Open label type modal (it will appear on top with higher z-index)
    openLabelTypeModal();
}

// Global variable to store selected label position
let selectedLabelPosition = null;
let selectedKeyLabelPositions = [];

// OL125 label positions (2 columns × 5 rows)
const OL125_POSITIONS = [
    { row: 1, col: 1, top: '0.5in', left: '0.1875in' },   // 3/16" left margin
    { row: 1, col: 2, top: '0.5in', left: '4.3125in' },  // 4" label + 1/8" gutter
    { row: 2, col: 1, top: '2.5in', left: '0.1875in' },
    { row: 2, col: 2, top: '2.5in', left: '4.3125in' },
    { row: 3, col: 1, top: '4.5in', left: '0.1875in' },
    { row: 3, col: 2, top: '4.5in', left: '4.3125in' },
    { row: 4, col: 1, top: '6.5in', left: '0.1875in' },
    { row: 4, col: 2, top: '6.5in', left: '4.3125in' },
    { row: 5, col: 1, top: '8.5in', left: '0.1875in' },
    { row: 5, col: 2, top: '8.5in', left: '4.3125in' }
];

// OL875 label positions (3 columns × 10 rows)
const OL875_POSITIONS = Array.from({ length: 30 }, (_, index) => {
    const row = Math.floor(index / 3) + 1;
    const col = (index % 3) + 1;
    const top = `${0.5 + (row - 1) * 1}in`; // 1" vertical pitch
    const leftVal = 0.21975 + (col - 1) * 2.7335; // 0.21975" left margin, 2.7335" pitch
    return {
        row,
        col,
        top,
        left: `${leftVal.toFixed(5)}in`
    };
});

function printLabel() {
    // Open position selector modal instead of printing directly
    openLabelPositionModal();
}

function printKeyLabel() {
    openKeyLabelPositionModal();
}

function openLabelTypeModal() {
    const modal = document.getElementById('labelTypeModal');
    modal.classList.add('active');
    modal.style.zIndex = '2001'; // Ensure it's above the detail modal
}

function closeLabelTypeModal() {
    const modal = document.getElementById('labelTypeModal');
    modal.classList.remove('active');
    modal.style.zIndex = ''; // Reset z-index
    // Also close the detail modal when label type is closed without selection
}

function chooseLabelType(type) {
    closeLabelTypeModal();
    // Close detail modal when choosing a label type
    closeDetailModal();

    if (type === 'folder') {
        openLabelModal();
    } else {
        openKeyLabelModal();
    }
}

function openLabelPositionModal() {
    const modal = document.getElementById('labelPositionModal');
    const grid = document.getElementById('labelGrid');

    // Generate grid buttons
    grid.innerHTML = OL125_POSITIONS.map((pos, index) => `
        <button class="label-position-btn" onclick="selectLabelPosition(${index})">
            Row ${pos.row}, Col ${pos.col}
        </button>
    `).join('');

    modal.classList.add('active');
}

function closeLabelPositionModal() {
    document.getElementById('labelPositionModal').classList.remove('active');
    selectedLabelPosition = null;

    // Remove selected class from all buttons
    document.querySelectorAll('#labelGrid .label-position-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
}

function selectLabelPosition(index) {
    selectedLabelPosition = index;

    // Update button states
    document.querySelectorAll('#labelGrid .label-position-btn').forEach((btn, i) => {
        if (i === index) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function openKeyLabelPositionModal() {
    const modal = document.getElementById('keyLabelPositionModal');
    const grid = document.getElementById('keyLabelGrid');

    grid.innerHTML = OL875_POSITIONS.map((pos, index) => `
        <button class="label-position-btn" style="aspect-ratio: 2.5935 / 1;" onclick="selectKeyLabelPosition(${index})">
            Row ${pos.row}, Col ${pos.col}
        </button>
    `).join('');

    modal.classList.add('active');
}

function closeKeyLabelPositionModal() {
    document.getElementById('keyLabelPositionModal').classList.remove('active');
    selectedKeyLabelPositions = [];
    document.querySelectorAll('#keyLabelGrid .label-position-btn').forEach(btn => btn.classList.remove('selected'));
}

function selectKeyLabelPosition(index) {
    const alreadySelected = selectedKeyLabelPositions.includes(index);
    if (alreadySelected) {
        selectedKeyLabelPositions = selectedKeyLabelPositions.filter(i => i !== index);
    } else {
        if (selectedKeyLabelPositions.length >= 2) {
            showNotification('You can select up to 2 key tag positions at once', 'error');
            return;
        }
        selectedKeyLabelPositions.push(index);
    }

    document.querySelectorAll('#keyLabelGrid .label-position-btn').forEach((btn, i) => {
        btn.classList.toggle('selected', selectedKeyLabelPositions.includes(i));
    });
}

function printSelectedPosition() {
    if (selectedLabelPosition === null) {
        showNotification('Please select a label position first', 'error');
        return;
    }

    const position = OL125_POSITIONS[selectedLabelPosition];
    const label = document.getElementById('label');
    const labelParent = label.parentNode;
    const placeholder = document.createComment('label-placeholder');

    // Move label to body for print so modal positioning/flex styles do not interfere
    labelParent.insertBefore(placeholder, label);
    document.body.appendChild(label);

    // Set data attribute and CSS custom properties for precise positioning
    label.setAttribute('data-print-position', selectedLabelPosition);
    label.style.setProperty('--print-top', position.top);
    label.style.setProperty('--print-left', position.left);
    label.classList.add('printing');

    // Close modal
    closeLabelPositionModal();

    // Small delay to ensure styles are applied, then print
    setTimeout(() => {
        window.print();

        // Reset after print dialog closes (longer delay)
        setTimeout(() => {
            label.removeAttribute('data-print-position');
            label.style.removeProperty('--print-top');
            label.style.removeProperty('--print-left');
            label.classList.remove('printing');

            // Return label to its original place in the modal
            if (placeholder.parentNode) {
                placeholder.replaceWith(label);
            } else {
                labelParent.appendChild(label);
            }
        }, 500);
    }, 200);
}

function printSelectedKeyPosition() {
    if (selectedKeyLabelPositions.length === 0) {
        showNotification('Please select at least one key tag position', 'error');
        return;
    }
    if (selectedKeyLabelPositions.length > 2) {
        showNotification('You can print up to 2 key tags at once', 'error');
        return;
    }

    const positions = selectedKeyLabelPositions.map(i => OL875_POSITIONS[i]);
    const originalLabel = document.getElementById('keyLabel');
    const clones = [];

    positions.forEach((position, idx) => {
        const clone = originalLabel.cloneNode(true);
        clone.removeAttribute('id');
        clone.setAttribute('data-print-position', selectedKeyLabelPositions[idx]);
        clone.style.setProperty('--print-top', position.top);
        clone.style.setProperty('--print-left', position.left);
        clone.classList.add('printing');
        document.body.appendChild(clone);
        clones.push(clone);
    });

    closeKeyLabelPositionModal();

    setTimeout(() => {
        window.print();

        setTimeout(() => {
            clones.forEach(clone => clone.remove());
        }, 500);
    }, 200);
}

async function saveLabel() {
    const label = document.getElementById('label');
    try {
        const canvas = await html2canvas(label, { backgroundColor: '#ffffff', scale: 2 });
        const link = document.createElement('a');
        link.download = `label-${currentVehicle.stockNumber}.png`;
        link.href = canvas.toDataURL();
        link.click();
    } catch (error) {
        console.error('Error saving label:', error);
        showNotification('Failed to save label. Please try again.', 'error');
    }
}

async function copyLabel() {
    const label = document.getElementById('label');
    try {
        const canvas = await html2canvas(label, { backgroundColor: '#ffffff', scale: 2 });
        canvas.toBlob(async (blob) => {
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                showNotification('Label copied to clipboard!', 'success');
            } catch (error) {
                console.error('Error copying to clipboard:', error);
                showNotification('Failed to copy label. Try saving instead.', 'error');
            }
        });
    } catch (error) {
        console.error('Error copying label:', error);
        showNotification('Failed to copy label. Please try again.', 'error');
    }
}

async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        showNotification('Please select a PDF file.', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showNotification('File size must be less than 10MB.', 'error');
        return;
    }

    if (!currentVehicle) {
        showNotification('No vehicle selected.', 'error');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('vehicleId', currentVehicle.id);
        formData.append('fileName', file.name);

        const response = await fetch(`${API_BASE}/documents/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload document');
        }

        const result = await response.json();

        // Add document to current vehicle
        if (!currentVehicle.documents) {
            currentVehicle.documents = [];
        }
        currentVehicle.documents.push(result.document);

        // Update vehicle in database
        const isInSold = soldVehicles.some(v => v.id === currentVehicle.id);
        const endpoint = isInSold ? 'sold-vehicles' : 'inventory';

        await fetch(`${API_BASE}/${endpoint}/${currentVehicle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(currentVehicle)
        });

        await loadAllData();
        renderDocumentList();
        showNotification('Document uploaded successfully!', 'success');

        // Reset file input
        event.target.value = '';

    } catch (error) {
        console.error('Error uploading document:', error);
        showNotification('Failed to upload document: ' + error.message, 'error');
    }
}

function renderDocumentList() {
    const container = document.getElementById('documentList');
    if (!container || !currentVehicle) return;

    const documents = currentVehicle.documents || [];

    if (documents.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 1rem; color: var(--joy-text-tertiary); font-size: 0.875rem;">No documents uploaded</div>';
        return;
    }

    container.innerHTML = documents.map((doc, index) => `
        <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem;
            background: var(--joy-bg-level1);
            border: 1px solid var(--joy-divider);
            border-radius: var(--joy-radius-sm);
            margin-bottom: 0.5rem;
            transition: all 0.2s;
        " onmouseover="this.style.background='var(--joy-bg-level2)'" onmouseout="this.style.background='var(--joy-bg-level1)'">
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 600; font-size: 0.875rem; color: var(--joy-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    📄 ${doc.fileName}
                </div>
                <div style="font-size: 0.75rem; color: var(--joy-text-tertiary); margin-top: 0.25rem;">
                    ${doc.uploadDate ? `Uploaded: ${new Date(doc.uploadDate).toLocaleDateString()}` : ''}
                    ${doc.fileSize ? ` • ${formatFileSize(doc.fileSize)}` : ''}
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
                <button class="btn btn-sm btn-secondary" onclick="viewPDFDocument(${index})" title="View Document">
                    👁️
                </button>
                <button class="btn btn-sm btn-secondary" onclick="downloadPDFDocument(${index})" title="Download">
                    💾
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePDFDocument(${index})" title="Delete">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function viewPDFDocument(index) {
    if (!currentVehicle || !currentVehicle.documents || !currentVehicle.documents[index]) {
        showNotification('Document not found.', 'error');
        return;
    }

    const doc = currentVehicle.documents[index];

    try {
        const response = await fetch(`${API_BASE}/documents/view/${doc.id}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load document');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Open in new tab
        window.open(url, '_blank');

        // Clean up the URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 100);

    } catch (error) {
        console.error('Error viewing document:', error);
        showNotification('Failed to view document. Please try again.', 'error');
    }
}

async function downloadPDFDocument(index) {
    if (!currentVehicle || !currentVehicle.documents || !currentVehicle.documents[index]) {
        showNotification('Document not found.', 'error');
        return;
    }

    const doc = currentVehicle.documents[index];

    try {
        const response = await fetch(`${API_BASE}/documents/download/${doc.id}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to download document');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error downloading document:', error);
        showNotification('Failed to download document. Please try again.', 'error');
    }
}

async function deletePDFDocument(index) {
    if (!currentVehicle || !currentVehicle.documents || !currentVehicle.documents[index]) {
        showNotification('Document not found.', 'error');
        return;
    }

    const doc = currentVehicle.documents[index];

    const confirmed = await showConfirmation(`Are you sure you want to delete "${doc.fileName}"?`);
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/documents/delete/${doc.id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete document');
        }

        // Remove document from current vehicle
        currentVehicle.documents.splice(index, 1);

        // Update vehicle in database
        const isInSold = soldVehicles.some(v => v.id === currentVehicle.id);
        const endpoint = isInSold ? 'sold-vehicles' : 'inventory';

        await fetch(`${API_BASE}/${endpoint}/${currentVehicle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(currentVehicle)
        });

        await loadAllData();
        renderDocumentList();
        showNotification('Document deleted successfully!', 'success');

    } catch (error) {
        console.error('Error deleting document:', error);
        showNotification('Failed to delete document: ' + error.message, 'error');
    }
}

async function saveVehicleDetailPDF() {
    if (!currentVehicle) return;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 15;
        const contentWidth = pageWidth - margin * 2;

        // ============ HEADER SECTION ============
        // Title: "Vehicle Pickup Acknowledgement"
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Vehicle Pickup Acknowledgement', pageWidth / 2, 20, { align: 'center' });

        // Subtitle: "Brandon Tomes Subaru Fleet Department"
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Brandon Tomes Subaru Fleet Department', pageWidth / 2, 28, { align: 'center' });

        // Horizontal divider line
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

        // Table settings for 2-column layout
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

        // Row 1: Stock Number | VIN
        yPos = draw2ColRow('Stock #:', currentVehicle.stockNumber || '', 'VIN:', currentVehicle.vin || '', yPos);

        // Row 2: Year | Make
        yPos = draw2ColRow('Year:', currentVehicle.year?.toString() || '', 'Make:', currentVehicle.make || '', yPos);

        // Row 3: Model | Trim
        yPos = draw2ColRow('Model:', currentVehicle.model || '', 'Trim:', currentVehicle.trim || '', yPos);

        // Row 4: Color (full width)
        yPos = drawFullWidthRow('Color:', currentVehicle.color || '', yPos);

        yPos += 10;

        // ============ COMPANY & CUSTOMER INFORMATION SECTION ============
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Company & Customer Information', margin, yPos);
        yPos += 6;

        // Fleet Company
        yPos = drawFullWidthRow('Fleet Company:', currentVehicle.fleetCompany || '', yPos);

        // Operation Company
        yPos = drawFullWidthRow('Operation Co.:', currentVehicle.operationCompany || '', yPos);

        // Customer Name
        const customerName = currentVehicle.customer 
            ? `${currentVehicle.customer.firstName || ''} ${currentVehicle.customer.lastName || ''}`.trim() 
            : '';
        yPos = drawFullWidthRow('Customer:', customerName, yPos);

        // Customer Phone
        yPos = drawFullWidthRow('Phone:', currentVehicle.customer?.phone || '', yPos);

        yPos += 15;

        // ============ ACKNOWLEDGEMENT & TERMS SECTION ============
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Acknowledgement & Terms of Vehicle Pickup', margin, yPos);
        yPos += 8;

        // Legal text
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

        // Customer Signature line
        doc.text('Customer Signature:', margin, yPos);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(margin + 40, yPos, pageWidth - 80, yPos);

        // Date line
        doc.text('Date:', pageWidth - 70, yPos);
        doc.line(pageWidth - 55, yPos, pageWidth - margin, yPos);

        // ============ FOOTER ============
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'italic');
        const footerText = `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Save the PDF
        const fileName = `Vehicle_Pickup_Acknowledgement_${currentVehicle.stockNumber}_${currentVehicle.year}_${currentVehicle.make}_${currentVehicle.model}.pdf`.replace(/\s+/g, '_');
        doc.save(fileName);

        showNotification('Vehicle Pickup Acknowledgement PDF generated successfully!', 'success');

    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Failed to generate PDF. Please try again.', 'error');
    }
}

// Generate Keytag Label for Trade-In Vehicles
function generateTradeInKeytag(tradeIn) {
    // Store the trade-in as current vehicle for label generation
    currentTradeInForLabel = tradeIn;

    // Populate the key tag preview with trade-in data
    const vinLast8 = tradeIn.vin ? tradeIn.vin.slice(-8) : '';

    document.getElementById('keyLabelStock').textContent = tradeIn.stockNumber || 'N/A';
    document.getElementById('keyLabelVehicle').textContent = `${tradeIn.year} ${tradeIn.make} ${tradeIn.model}`;
    document.getElementById('keyLabelVin').textContent = `VIN: ${vinLast8}`;
    document.getElementById('keyLabelColor').textContent = `Color: ${tradeIn.color || 'N/A'}`;
    document.getElementById('keyLabelFleet').textContent = tradeIn.mileage ? `Miles: ${tradeIn.mileage.toLocaleString()}` : 'TRADE-IN';
    document.getElementById('keyLabelOperation').textContent = 'TRADE-IN';

    // Open the key label modal and position selector
    openKeyLabelModal();
}

// Store current trade-in for label printing
let currentTradeInForLabel = null;

function updateDashboard() {
    // Update stat cards
    const totalVehicles = document.getElementById('totalVehicles');
    if (totalVehicles) totalVehicles.textContent = vehicles.length;

    const inStockVehicles = document.getElementById('inStockVehicles');
    if (inStockVehicles) inStockVehicles.textContent = vehicles.filter(v =>
        v.status === 'in-stock' || v.status === 'pdi' || v.status === 'pending-pickup' || v.status === 'pickup-scheduled'
    ).length;

    const inTransitCount = document.getElementById('inTransitCount');
    if (inTransitCount) inTransitCount.textContent = vehicles.filter(v => v.status === 'in-transit').length;

    const pendingPickupCount = document.getElementById('pendingPickupCount');
    if (pendingPickupCount) pendingPickupCount.textContent = vehicles.filter(v => v.status === 'pending-pickup').length;

    const pickupScheduledCount = document.getElementById('pickupScheduledCount');
    if (pickupScheduledCount) pickupScheduledCount.textContent = vehicles.filter(v => v.status === 'pickup-scheduled').length;

    const soldCount = document.getElementById('soldCount');
    if (soldCount) soldCount.textContent = soldVehicles.length;

    const tradeInsCount = document.getElementById('tradeInsCount');
    // Only count trade-ins that haven't been picked up yet
    if (tradeInsCount) tradeInsCount.textContent = tradeIns.filter(t => !t.pickedUp).length;

    // Helper function to get color based on vehicle age
    function getAgeColor(days) {
        if (days <= 45) return 'var(--joy-success-500)'; // Green
        if (days <= 60) return 'rgb(255, 152, 0)'; // Orange
        return 'var(--joy-danger-500)'; // Red
    }

    // Helper function to calculate days in stock (returns null if no inStockDate)
    function getDaysInStock(vehicle) {
        if (!vehicle.inStockDate) return null;
        const stockDate = new Date(vehicle.inStockDate);
        const today = new Date();

        // Set both dates to midnight local time for accurate day calculation
        stockDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        return Math.floor((today - stockDate) / (1000 * 60 * 60 * 24));
    }

    // Oldest Units Section
    const oldestVehicles = [...vehicles]
        .filter(v => v.inStockDate) // Only include vehicles with in-stock date
        .sort((a, b) => {
            const dateA = new Date(a.inStockDate);
            const dateB = new Date(b.inStockDate);
            return dateA - dateB;
        })
        .slice(0, 5);

    const oldestContainer = document.getElementById('oldestVehicles');
    if (oldestContainer) {
        if (oldestVehicles.length === 0) {
            oldestContainer.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--joy-text-tertiary); font-size: 0.875rem;">No vehicles in inventory</div>';
        } else {
            oldestContainer.innerHTML = oldestVehicles.map(v => {
                const daysOld = getDaysInStock(v);
                const ageColor = getAgeColor(daysOld);
                const statusClass = `status-${v.status}`;
                const statusText = v.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                return `
                    <div style="padding: 0.5rem; border-bottom: 1px solid var(--joy-divider);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.375rem; cursor: pointer;" onclick="openVehicleDetail(${v.id})">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; font-size: 0.875rem; color: var(--joy-text-primary);">${v.year} ${v.make} ${v.model}</div>
                                <div style="font-size: 0.75rem; color: var(--joy-text-tertiary); margin-top: 0.125rem;">
                                    Stock: ${v.stockNumber}
                                </div>
                            </div>
                            <div style="text-align: right; margin-left: 0.5rem;">
                                <div style="font-size: 0.75rem; font-weight: 600; color: ${ageColor};">
                                    ${daysOld} days
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.375rem; align-items: center;">
                            <span class="status-badge ${statusClass}" style="font-size: 0.6875rem; padding: 0.125rem 0.375rem;">${statusText}</span>
                            ${v.status === 'pending-pickup' ? `<button class="btn btn-sm btn-secondary" onclick="openPickupScheduleModal(); currentVehicle = vehicles.find(veh => veh.id === ${v.id}); event.stopPropagation();" style="padding: 0.25rem 0.5rem; font-size: 0.6875rem;">Schedule</button>` : ''}
                            ${v.status === 'pickup-scheduled' ? `<button class="btn btn-sm btn-primary" onclick="completePickup(${v.id}); event.stopPropagation();" style="padding: 0.25rem 0.5rem; font-size: 0.6875rem;">Complete</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Newest Units Section (exclude in-transit and vehicles without in-stock date)
    const newestVehicles = [...vehicles]
        .filter(v => v.inStockDate) // Only include vehicles with in-stock date
        .sort((a, b) => {
            const dateA = new Date(a.inStockDate);
            const dateB = new Date(b.inStockDate);
            return dateB - dateA;
        })
        .slice(0, 5);

    const newestContainer = document.getElementById('newestVehicles');
    if (newestContainer) {
        if (newestVehicles.length === 0) {
            newestContainer.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--joy-text-tertiary); font-size: 0.875rem;">No vehicles in inventory</div>';
        } else {
            newestContainer.innerHTML = newestVehicles.map(v => {
                const daysOld = getDaysInStock(v);
                const ageColor = getAgeColor(daysOld);
                const statusClass = `status-${v.status}`;
                const statusText = v.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                return `
                    <div style="padding: 0.5rem; border-bottom: 1px solid var(--joy-divider);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.375rem; cursor: pointer;" onclick="openVehicleDetail(${v.id})">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; font-size: 0.875rem; color: var(--joy-text-primary);">${v.year} ${v.make} ${v.model}</div>
                                <div style="font-size: 0.75rem; color: var(--joy-text-tertiary); margin-top: 0.125rem;">
                                    Stock: ${v.stockNumber}
                                </div>
                            </div>
                            <div style="text-align: right; margin-left: 0.5rem;">
                                <div style="font-size: 0.75rem; font-weight: 600; color: ${ageColor};">
                                    ${daysOld === 0 ? 'Today' : daysOld + ' days'}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.375rem; align-items: center;">
                            <span class="status-badge ${statusClass}" style="font-size: 0.6875rem; padding: 0.125rem 0.375rem;">${statusText}</span>
                            ${v.status === 'pending-pickup' ? `<button class="btn btn-sm btn-secondary" onclick="openPickupScheduleModal(); currentVehicle = vehicles.find(veh => veh.id === ${v.id}); event.stopPropagation();" style="padding: 0.25rem 0.5rem; font-size: 0.6875rem;">Schedule</button>` : ''}
                            ${v.status === 'pickup-scheduled' ? `<button class="btn btn-sm btn-primary" onclick="completePickup(${v.id}); event.stopPropagation();" style="padding: 0.25rem 0.5rem; font-size: 0.6875rem;">Complete</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Pending Pickups Section
    const pendingPickups = vehicles.filter(v => v.status === 'pending-pickup');
    const pendingContainer = document.getElementById('pendingPickups');

    if (pendingContainer) {
        if (pendingPickups.length === 0) {
            pendingContainer.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--joy-text-tertiary); font-size: 0.875rem;">No pending pickups</div>';
        } else {
            pendingContainer.innerHTML = pendingPickups.map(v => {
                const customerName = v.customer ? `${v.customer.firstName || ''} ${v.customer.lastName || ''}`.trim() : 'No customer';
                return `
                    <div style="padding: 0.5rem; border-bottom: 1px solid var(--joy-divider); cursor: pointer; transition: background 0.2s;"
                         onclick="openVehicleDetail(${v.id})"
                         onmouseover="this.style.background='var(--joy-bg-level1)'"
                         onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; font-size: 0.875rem; color: var(--joy-text-primary);">${v.year} ${v.make} ${v.model}</div>
                                <div style="font-size: 0.75rem; color: var(--joy-text-tertiary); margin-top: 0.125rem;">
                                    ${customerName}
                                </div>
                            </div>
                            <button class="btn btn-sm btn-secondary" onclick="openPickupScheduleModal(); currentVehicle = vehicles.find(v => v.id === ${v.id}); event.stopPropagation();" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                Schedule
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Scheduled Pickups Section
    const scheduledPickups = vehicles.filter(v => v.status === 'pickup-scheduled');
    const pickupsContainer = document.getElementById('scheduledPickups');

    if (pickupsContainer) {
        if (scheduledPickups.length === 0) {
            pickupsContainer.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--joy-text-tertiary); font-size: 0.875rem;">No pickups scheduled</div>';
        } else {
            pickupsContainer.innerHTML = scheduledPickups.map(v => {
                const customerName = v.customer ? `${v.customer.firstName || ''} ${v.customer.lastName || ''}`.trim() : 'No customer';
                return `
                    <div style="padding: 0.5rem; border-bottom: 1px solid var(--joy-divider); cursor: pointer; transition: background 0.2s;"
                         onclick="openVehicleDetail(${v.id})"
                         onmouseover="this.style.background='var(--joy-bg-level1)'"
                         onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.375rem;">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; font-size: 0.875rem; color: var(--joy-text-primary);">${v.year} ${v.make} ${v.model}</div>
                                <div style="font-size: 0.75rem; color: var(--joy-text-tertiary); margin-top: 0.125rem;">
                                    ${customerName}
                                </div>
                            </div>
                            <div style="text-align: right; margin-left: 0.5rem;">
                                <div style="font-size: 0.75rem; font-weight: 600; color: var(--joy-primary-500);">
                                    ${v.pickupDate ? new Date(v.pickupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
                                </div>
                                <div style="font-size: 0.6875rem; color: var(--joy-text-tertiary);">
                                    ${v.pickupTime || 'No time'}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.375rem;">
                            <button class="btn btn-sm btn-primary" onclick="completePickup(${v.id}); event.stopPropagation();" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                Complete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Inventory Overview Section
    const inventoryContainer = document.getElementById('inventoryOverview');
    if (inventoryContainer) {
        // Filter vehicles by different statuses
        const inStockVehicles = vehicles.filter(v => v.status === 'in-stock');
        const pdiVehicles = vehicles.filter(v => v.status === 'pdi');
        const pendingPickupVehicles = vehicles.filter(v => v.status === 'pending-pickup');
        const pickupScheduledVehicles = vehicles.filter(v => v.status === 'pickup-scheduled');

        const allSelectedVehicles = [...inStockVehicles, ...pdiVehicles, ...pendingPickupVehicles, ...pickupScheduledVehicles];

        if (allSelectedVehicles.length === 0) {
            inventoryContainer.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--joy-text-tertiary); font-size: 0.875rem;">No vehicles in these statuses</div>';
        } else {
            inventoryContainer.innerHTML = `
                <!-- Status Summary Cards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    <div style="background: rgba(50, 215, 75, 0.1); border: 1px solid rgba(50, 215, 75, 0.3); border-radius: var(--joy-radius-sm); padding: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 0.75rem; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">In Stock</div>
                                <div style="font-size: 1.75rem; font-weight: 700; color: var(--joy-success-500);">${inStockVehicles.length}</div>
                            </div>
                            <span style="font-size: 2rem;">📦</span>
                        </div>
                    </div>

                    <div style="background: rgba(255, 159, 10, 0.1); border: 1px solid rgba(255, 159, 10, 0.3); border-radius: var(--joy-radius-sm); padding: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 0.75rem; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">PDI</div>
                                <div style="font-size: 1.75rem; font-weight: 700; color: var(--joy-warning-500);">${pdiVehicles.length}</div>
                            </div>
                            <span style="font-size: 2rem;">🔧</span>
                        </div>
                    </div>

                    <div style="background: rgba(10, 132, 255, 0.1); border: 1px solid rgba(10, 132, 255, 0.3); border-radius: var(--joy-radius-sm); padding: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 0.75rem; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Pending Pickup</div>
                                <div style="font-size: 1.75rem; font-weight: 700; color: var(--joy-primary-500);">${pendingPickupVehicles.length}</div>
                            </div>
                            <span style="font-size: 2rem;">⏳</span>
                        </div>
                    </div>

                    <div style="background: rgba(191, 90, 242, 0.1); border: 1px solid rgba(191, 90, 242, 0.3); border-radius: var(--joy-radius-sm); padding: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 0.75rem; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Pickup Scheduled</div>
                                <div style="font-size: 1.75rem; font-weight: 700; color: rgb(191, 90, 242);">${pickupScheduledVehicles.length}</div>
                            </div>
                            <span style="font-size: 2rem;">📅</span>
                        </div>
                    </div>
                </div>

                <!-- Combined Inventory Table -->
                <div style="overflow-x: auto;">
                    <table style="width: 100%; font-size: 0.8125rem;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--joy-divider);">
                                <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Stock #</th>
                                <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Vehicle</th>
                                <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">VIN</th>
                                <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Color</th>
                                <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Status</th>
                                <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Days</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allSelectedVehicles.slice(0, 10).map(v => {
                const daysOld = getDaysInStock(v);
                const ageColor = daysOld !== null ? getAgeColor(daysOld) : 'var(--joy-text-tertiary)';
                const statusClass = `status-${v.status}`;
                const statusText = v.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                return `
                                    <tr style="border-bottom: 1px solid var(--joy-divider); cursor: pointer; transition: background 0.2s;"
                                        onclick="openVehicleDetail(${v.id})"
                                        onmouseover="this.style.background='var(--joy-bg-level1)'"
                                        onmouseout="this.style.background='transparent'">
                                        <td style="padding: 0.5rem; font-weight: 600;">${v.stockNumber}</td>
                                        <td style="padding: 0.5rem;">${v.year} ${v.make} ${v.model}</td>
                                        <td style="padding: 0.5rem; font-family: monospace; font-size: 0.75rem;">${v.vin}</td>
                                        <td style="padding: 0.5rem;">${v.color}</td>
                                        <td style="padding: 0.5rem;">
                                            <span class="status-badge ${statusClass}" style="font-size: 0.6875rem; padding: 0.125rem 0.375rem;">${statusText}</span>
                                        </td>
                                        <td style="padding: 0.5rem; font-weight: 600; color: ${ageColor};">
                                            ${daysOld !== null ? daysOld : '-'}
                                        </td>
                                    </tr>
                                `;
            }).join('')}
                        </tbody>
                    </table>
                </div>

                ${allSelectedVehicles.length > 10 ? `
                    <div style="text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--joy-divider);">
                        <span style="font-size: 0.875rem; color: var(--joy-text-secondary);">
                            Showing 10 of ${allSelectedVehicles.length} vehicles
                        </span>
                    </div>
                ` : ''}
            `;
        }
    }

    // Weekly Sales Section
    const weeklySalesContainer = document.getElementById('weeklySales');
    const weeklySalesDateRange = document.getElementById('weeklySalesDateRange');

    if (weeklySalesContainer && weeklySalesDateRange) {
        // Get current week (Monday to Saturday)
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Calculate Monday of current week
        const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday, go back 6 days
        const monday = new Date(today);
        monday.setDate(today.getDate() - daysFromMonday);
        monday.setHours(0, 0, 0, 0);

        // Calculate Saturday of current week
        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5); // Monday + 5 = Saturday
        saturday.setHours(23, 59, 59, 999);

        // Set date range header
        const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        weeklySalesDateRange.textContent = `${monday.toLocaleDateString('en-US', dateOptions)} - ${saturday.toLocaleDateString('en-US', dateOptions)}`;

        // Filter sold vehicles for current week
        const weeklySales = soldVehicles.filter(v => {
            if (!v.customer || !v.customer.saleDate) return false;
            const saleDate = new Date(v.customer.saleDate);
            return saleDate >= monday && saleDate <= saturday;
        }).sort((a, b) => {
            // Sort by sale date - newest first
            const dateA = new Date(a.customer.saleDate);
            const dateB = new Date(b.customer.saleDate);
            return dateB - dateA;
        });

        if (weeklySales.length === 0) {
            weeklySalesContainer.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--joy-text-tertiary); font-size: 0.875rem;">No vehicles sold this week</div>';
        } else {
            weeklySalesContainer.innerHTML = `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--joy-divider);">
                                <th style="padding: 0.75rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase;">Stock #</th>
                                <th style="padding: 0.75rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase;">Vehicle</th>
                                <th style="padding: 0.75rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase;">Customer Name</th>
                                <th style="padding: 0.75rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase;">Operation Company</th>
                                <th style="padding: 0.75rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase;">Fleet Company</th>
                                <th style="padding: 0.75rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase;">Date Sold</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${weeklySales.map(v => {
                const customerName = v.customer ? `${v.customer.firstName || ''} ${v.customer.lastName || ''}`.trim() : 'N/A';
                const saleDate = v.customer && v.customer.saleDate ? new Date(v.customer.saleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

                return `
                                    <tr style="border-bottom: 1px solid var(--joy-divider); cursor: pointer; transition: background 0.2s;"
                                        onclick="openVehicleDetail(${v.id})"
                                        onmouseover="this.style.background='var(--joy-bg-level1)'"
                                        onmouseout="this.style.background='transparent'">
                                        <td style="padding: 0.75rem 0.5rem;">
                                            <span style="font-weight: 600; color: var(--joy-primary-500);">${v.stockNumber}</span>
                                        </td>
                                        <td style="padding: 0.75rem 0.5rem;">
                                            <div style="font-weight: 600; font-size: 0.875rem;">${v.year} ${v.make} ${v.model}</div>
                                            <div style="font-size: 0.75rem; color: var(--joy-text-tertiary);">${v.trim}</div>
                                        </td>
                                        <td style="padding: 0.75rem 0.5rem;">${customerName}</td>
                                        <td style="padding: 0.75rem 0.5rem;">${v.operationCompany || 'N/A'}</td>
                                        <td style="padding: 0.75rem 0.5rem;">${v.fleetCompany || 'N/A'}</td>
                                        <td style="padding: 0.75rem 0.5rem;">
                                            <span style="font-weight: 500;">${saleDate}</span>
                                        </td>
                                    </tr>
                                `;
            }).join('')}
                        </tbody>
                    </table>
                </div>

                ${weeklySales.length > 0 ? `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--joy-divider); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.875rem; color: var(--joy-text-secondary);">
                            Total: ${weeklySales.length} vehicle${weeklySales.length !== 1 ? 's' : ''} sold this week
                        </span>
                        <span style="font-size: 0.875rem; font-weight: 600; color: var(--joy-success-500);">
                            $${weeklySales.reduce((sum, v) => sum + (parseFloat(v.customer?.saleAmount) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                ` : ''}
            `;
        }
    }
}

function renderCurrentPage() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;
    const pageId = activePage.id;
    switch (pageId) {
        case 'dashboard': updateDashboard(); break;
        case 'inventory': renderInventoryPage(); break;
        case 'in-transit': renderStatusPage('in-transit', 'transitGrid', 'transitSearchInput', 'transitMakeFilter'); break;
        case 'pdi': renderStatusPage('pdi', 'pdiGrid', 'pdiSearchInput', 'pdiMakeFilter'); break;
        case 'pending-pickup': renderStatusPage('pending-pickup', 'pendingPickupGrid', 'pendingPickupSearchInput', 'pendingPickupMakeFilter'); break;
        case 'pickup-scheduled': renderStatusPage('pickup-scheduled', 'pickupScheduledGrid', 'pickupScheduledSearchInput', 'pickupScheduledMakeFilter'); break;
        case 'sold': renderSoldPage(); break;
        case 'tradeins': renderTradeInsPage(); break;
        case 'payments': renderPaymentsPage(); break;
        case 'analytics': renderAnalytics(); break;
    }
}

function renderInventoryPage() {
    // Filter out in-transit vehicles from inventory view
    const nonTransitVehicles = vehicles.filter(v => v.status !== 'in-transit');
    const filtered = filterVehicles(nonTransitVehicles);
    const container = document.getElementById('inventoryGrid');
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚗</div><p>No vehicles found</p></div>';
    } else {
        container.innerHTML = `
            <table class="modern-table">
                <thead>
                    <tr>
                        <th>Stock #</th>
                        <th>Vehicle</th>
                        <th>VIN</th>
                        <th>Color</th>
                        <th>Fleet</th>
                        <th>Operation</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(v => createVehicleRow(v)).join('')}
                </tbody>
            </table>
        `;
    }
    updateMakeFilter('makeFilter', nonTransitVehicles);
}

function renderStatusPage(status, gridId, searchId, makeFilterId) {
    let filtered = vehicles.filter(v => v.status === status);

    // Apply search filter
    const searchInput = document.getElementById(searchId);
    const searchTerm = searchInput?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(v => {
            return v.stockNumber.toLowerCase().includes(searchTerm) ||
                v.vin.toLowerCase().includes(searchTerm) ||
                v.make.toLowerCase().includes(searchTerm) ||
                v.model.toLowerCase().includes(searchTerm) ||
                `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(searchTerm) ||
                (v.customer?.firstName || '').toLowerCase().includes(searchTerm) ||
                (v.customer?.lastName || '').toLowerCase().includes(searchTerm);
        });
    }

    // Apply make filter
    const makeFilterSelect = document.getElementById(makeFilterId);
    const makeFilter = makeFilterSelect?.value || '';
    if (makeFilter) {
        filtered = filtered.filter(v => v.make === makeFilter);
    }

    const container = document.getElementById(gridId);
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚗</div><p>No vehicles in this status</p></div>';
    } else {
        container.innerHTML = `
            <table class="modern-table">
                <thead>
                    <tr>
                        <th>Stock #</th>
                        <th>Vehicle</th>
                        <th>VIN</th>
                        <th>Color</th>
                        <th>Fleet</th>
                        <th>Operation</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(v => createVehicleRow(v)).join('')}
                </tbody>
            </table>
        `;
    }
    // Update make filter with all vehicles of this status (not just filtered ones)
    updateMakeFilter(makeFilterId, vehicles.filter(v => v.status === status));
}

function renderSoldPage() {
    const container = document.getElementById('soldGrid');

    // Apply filters
    let filtered = soldVehicles;

    // Get filter values
    const startDate = document.getElementById('soldStartDateFilter')?.value;
    const endDate = document.getElementById('soldEndDateFilter')?.value;
    const monthFilter = document.getElementById('soldMonthFilter')?.value;
    const yearFilter = document.getElementById('soldYearFilter')?.value;

    // Date range filter takes priority over month/year
    if (startDate || endDate) {
        filtered = filtered.filter(v => {
            if (!v.customer?.saleDate) return false;
            const saleDate = new Date(v.customer.saleDate);
            saleDate.setHours(0, 0, 0, 0); // Normalize to start of day

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (saleDate < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // End of day
                if (saleDate > end) return false;
            }
            return true;
        });
    } else if (monthFilter || yearFilter) {
        // Only apply month/year filter if date range is not set
        filtered = filtered.filter(v => {
            if (!v.customer?.saleDate) return false;
            const saleDate = new Date(v.customer.saleDate);
            if (yearFilter && saleDate.getFullYear().toString() !== yearFilter) return false;
            if (monthFilter && (saleDate.getMonth() + 1).toString() !== monthFilter) return false;
            return true;
        });
    }

    // Filter by search
    const searchTerm = document.getElementById('soldSearchInput')?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(v => {
            return v.stockNumber.toLowerCase().includes(searchTerm) ||
                v.vin.toLowerCase().includes(searchTerm) ||
                `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(searchTerm) ||
                (v.customer?.firstName || '').toLowerCase().includes(searchTerm) ||
                (v.customer?.lastName || '').toLowerCase().includes(searchTerm);
        });
    }

    // Filter by make
    const makeFilter = document.getElementById('soldMakeFilter')?.value;
    if (makeFilter) {
        filtered = filtered.filter(v => v.make === makeFilter);
    }

    // Sort by sale date - most recent first
    filtered = filtered.sort((a, b) => {
        const dateA = a.customer?.saleDate ? new Date(a.customer.saleDate) : new Date(0);
        const dateB = b.customer?.saleDate ? new Date(b.customer.saleDate) : new Date(0);
        return dateB - dateA; // Most recent first
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div><p>No sold vehicles match your filters</p></div>';
    } else {
        container.innerHTML = `
            <table class="modern-table">
                <thead>
                    <tr>
                        <th>Stock #</th>
                        <th>Vehicle</th>
                        <th>VIN</th>
                        <th>Color</th>
                        <th>Fleet</th>
                        <th>Operation</th>
                        <th>Customer</th>
                        <th>Sold Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(v => createSoldVehicleRow(v)).join('')}
                </tbody>
            </table>
        `;
    }
    updateMakeFilter('soldMakeFilter', soldVehicles);
    updateYearFilter();
}

function updateYearFilter() {
    const yearFilter = document.getElementById('soldYearFilter');
    if (!yearFilter) return;

    // Get unique years from sold vehicles' sale dates
    const years = new Set();
    soldVehicles.forEach(v => {
        if (v.customer?.saleDate) {
            const year = new Date(v.customer.saleDate).getFullYear();
            years.add(year);
        }
    });

    // Sort years in descending order
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    // Keep the current selection
    const currentValue = yearFilter.value;

    // Populate the filter
    yearFilter.innerHTML = '<option value="">All Years</option>' +
        sortedYears.map(year => `<option value="${year}">${year}</option>`).join('');

    // Restore selection if it still exists
    if (currentValue && sortedYears.includes(parseInt(currentValue))) {
        yearFilter.value = currentValue;
    }
}

// Handle date range change - clears month/year filters when date range is set
function handleSoldDateRangeChange() {
    const startDate = document.getElementById('soldStartDateFilter')?.value;
    const endDate = document.getElementById('soldEndDateFilter')?.value;

    // If a date range is set, clear month/year filters
    if (startDate || endDate) {
        const monthFilter = document.getElementById('soldMonthFilter');
        const yearFilter = document.getElementById('soldYearFilter');
        if (monthFilter) monthFilter.value = '';
        if (yearFilter) yearFilter.value = '';
    }

    renderCurrentPage();
}

// Handle month/year change - clears date range filters when month/year is set
function handleSoldMonthYearChange() {
    const monthFilter = document.getElementById('soldMonthFilter')?.value;
    const yearFilter = document.getElementById('soldYearFilter')?.value;

    // If month or year is set, clear date range filters
    if (monthFilter || yearFilter) {
        const startDateFilter = document.getElementById('soldStartDateFilter');
        const endDateFilter = document.getElementById('soldEndDateFilter');
        if (startDateFilter) startDateFilter.value = '';
        if (endDateFilter) endDateFilter.value = '';
    }

    renderCurrentPage();
}

// Clear all sold vehicle filters
function clearSoldFilters() {
    const startDateFilter = document.getElementById('soldStartDateFilter');
    const endDateFilter = document.getElementById('soldEndDateFilter');
    const monthFilter = document.getElementById('soldMonthFilter');
    const yearFilter = document.getElementById('soldYearFilter');
    const makeFilter = document.getElementById('soldMakeFilter');
    const searchInput = document.getElementById('soldSearchInput');

    if (startDateFilter) startDateFilter.value = '';
    if (endDateFilter) endDateFilter.value = '';
    if (monthFilter) monthFilter.value = '';
    if (yearFilter) yearFilter.value = '';
    if (makeFilter) makeFilter.value = '';
    if (searchInput) searchInput.value = '';

    renderCurrentPage();
}

function exportSoldVehicles() {
    // Get the currently filtered vehicles
    let filtered = soldVehicles;

    // Apply same filters as renderSoldPage
    const monthFilter = document.getElementById('soldMonthFilter')?.value;
    const yearFilter = document.getElementById('soldYearFilter')?.value;

    if (monthFilter || yearFilter) {
        filtered = filtered.filter(v => {
            if (!v.customer?.saleDate) return false;
            const saleDate = new Date(v.customer.saleDate);
            if (yearFilter && saleDate.getFullYear().toString() !== yearFilter) return false;
            if (monthFilter && (saleDate.getMonth() + 1).toString() !== monthFilter) return false;
            return true;
        });
    }

    const searchTerm = document.getElementById('soldSearchInput')?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(v => {
            return v.stockNumber.toLowerCase().includes(searchTerm) ||
                v.vin.toLowerCase().includes(searchTerm) ||
                `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(searchTerm) ||
                (v.customer?.firstName || '').toLowerCase().includes(searchTerm) ||
                (v.customer?.lastName || '').toLowerCase().includes(searchTerm);
        });
    }

    const makeFilter = document.getElementById('soldMakeFilter')?.value;
    if (makeFilter) {
        filtered = filtered.filter(v => v.make === makeFilter);
    }

    // Sort by sale date - most recent first (same as renderSoldPage)
    filtered = filtered.sort((a, b) => {
        const dateA = a.customer?.saleDate ? new Date(a.customer.saleDate) : new Date(0);
        const dateB = b.customer?.saleDate ? new Date(b.customer.saleDate) : new Date(0);
        return dateB - dateA; // Most recent first
    });

    if (filtered.length === 0) {
        showNotification('No vehicles to export', 'error');
        return;
    }

    // Create CSV content
    const headers = ['Stock #', 'Year', 'Make', 'Model', 'Trim', 'VIN', 'Color', 'Fleet Company', 'Operation Company', 'Customer Name', 'Sale Date', 'Sale Amount', 'Payment Method', 'Payment Reference'];

    const rows = filtered.map(v => {
        const customerName = v.customer ? `${v.customer.firstName || ''} ${v.customer.lastName || ''}`.trim() : '';
        const soldDate = v.customer?.saleDate ? new Date(v.customer.saleDate).toLocaleDateString() : '';
        const saleAmount = v.customer?.saleAmount ? `$${v.customer.saleAmount.toFixed(2)}` : '';

        return [
            v.stockNumber,
            v.year,
            v.make,
            v.model,
            v.trim,
            v.vin,
            v.color,
            v.fleetCompany || '',
            v.operationCompany || '',
            customerName,
            soldDate,
            saleAmount,
            v.customer?.paymentMethod || '',
            v.customer?.paymentReference || ''
        ].map(field => `"${field}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    // Create filename with filter info
    let filename = 'sold-vehicles';
    if (yearFilter && monthFilter) {
        const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        filename += `-${monthNames[parseInt(monthFilter)]}-${yearFilter}`;
    } else if (yearFilter) {
        filename += `-${yearFilter}`;
    } else if (monthFilter) {
        const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        filename += `-${monthNames[parseInt(monthFilter)]}`;
    }
    filename += '.csv';

    // Download the file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification(`Exported ${filtered.length} vehicle${filtered.length !== 1 ? 's' : ''} to ${filename}`, 'success');
}

function renderTradeInsPage() {
    const container = document.getElementById('tradeInGrid');

    // Apply search filter
    let filtered = tradeIns;
    const searchInput = document.getElementById('tradeInSearchInput');
    const searchTerm = searchInput?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(t => {
            return t.stockNumber.toLowerCase().includes(searchTerm) ||
                t.vin.toLowerCase().includes(searchTerm) ||
                t.make.toLowerCase().includes(searchTerm) ||
                t.model.toLowerCase().includes(searchTerm) ||
                `${t.year} ${t.make} ${t.model}`.toLowerCase().includes(searchTerm);
        });
    }

    // Apply make filter
    const makeFilterSelect = document.getElementById('tradeInMakeFilter');
    const makeFilter = makeFilterSelect?.value || '';
    if (makeFilter) {
        filtered = filtered.filter(t => t.make === makeFilter);
    }

    // Separate trade-ins into picked up and awaiting pickup
    const awaitingPickup = filtered.filter(t => !t.pickedUp);
    const pickedUp = filtered.filter(t => t.pickedUp);

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔄</div><p>No fleet returns match your filters</p></div>';
    } else {
        container.innerHTML = `
            ${awaitingPickup.length > 0 ? `
                <div style="margin-bottom: 2rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; color: var(--joy-text-primary); display: flex; align-items: center; gap: 0.5rem;">
                        <span>⏳</span> Awaiting Pickup <span style="background: var(--joy-warning-500); color: white; padding: 0.125rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">${awaitingPickup.length}</span>
                    </h3>
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Stock #</th>
                                <th>Vehicle</th>
                                <th>VIN</th>
                                <th>Color</th>
                                <th>Mileage</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${awaitingPickup.map(t => createTradeInRow(t)).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            ${pickedUp.length > 0 ? `
                <div>
                    <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; color: var(--joy-text-primary); display: flex; align-items: center; gap: 0.5rem;">
                        <span>✓</span> Picked Up <span style="background: var(--joy-success-500); color: white; padding: 0.125rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">${pickedUp.length}</span>
                    </h3>
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Stock #</th>
                                <th>Vehicle</th>
                                <th>VIN</th>
                                <th>Color</th>
                                <th>Mileage</th>
                                <th>Picked Up Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pickedUp.map(t => createTradeInRow(t)).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        `;
    }
    updateMakeFilter('tradeInMakeFilter', tradeIns);
}

function createVehicleRow(vehicle) {
    const statusClass = `status-${vehicle.status}`;
    const statusText = vehicle.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const customerName = vehicle.customer ? `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim() : '';
    const dateAdded = new Date(vehicle.dateAdded).toLocaleDateString();

    return `
        <tr class="vehicle-row" onclick="openVehicleDetail(${vehicle.id})" style="cursor: pointer;">
            <td>
                <div style="font-weight: 600; font-size: 0.875rem; color: var(--accent);">${vehicle.stockNumber}</div>
            </td>
            <td>
                <div style="font-weight: 600; font-size: 0.875rem;">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.125rem;">${vehicle.trim}</div>
            </td>
            <td>
                <div style="font-size: 0.8125rem;">${vehicle.vin}</div>
            </td>
            <td>
                <div style="font-size: 0.8125rem;">${vehicle.color}</div>
            </td>
            <td>
                ${vehicle.fleetCompany ? `<div style="font-size: 0.8125rem;">${vehicle.fleetCompany}</div>` : '<div style="font-size: 0.8125rem; color: var(--text-secondary);">-</div>'}
            </td>
            <td>
                ${vehicle.operationCompany ? `<div style="font-size: 0.8125rem;">${vehicle.operationCompany}</div>` : '<div style="font-size: 0.8125rem; color: var(--text-secondary);">-</div>'}
            </td>
            <td>
                ${customerName ? `<div style="font-size: 0.8125rem;">${customerName}</div>` : '<div style="font-size: 0.8125rem; color: var(--text-secondary);">-</div>'}
            </td>
            <td>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td onclick="event.stopPropagation();">
                <div style="display: flex; gap: 0.375rem;">
                    <button class="btn btn-small btn-secondary" onclick="openVehicleDetail(${vehicle.id})" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Details</button>
                    <button class="btn btn-small btn-secondary" onclick="openStatusPopup(${vehicle.id}, event)" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Status</button>
                </div>
            </td>
        </tr>
    `;
}

function createSoldVehicleRow(vehicle) {
    const statusClass = `status-${vehicle.status}`;
    const statusText = vehicle.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const customerName = vehicle.customer ? `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim() : '';
    const soldDate = vehicle.customer?.saleDate ? new Date(vehicle.customer.saleDate).toLocaleDateString() : '-';

    return `
        <tr class="vehicle-row" onclick="openVehicleDetail(${vehicle.id})" style="cursor: pointer;">
            <td>
                <div style="font-weight: 600; font-size: 0.875rem; color: var(--accent);">${vehicle.stockNumber}</div>
            </td>
            <td>
                <div style="font-weight: 600; font-size: 0.875rem;">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.125rem;">${vehicle.trim}</div>
            </td>
            <td>
                <div style="font-size: 0.8125rem;">${vehicle.vin}</div>
            </td>
            <td>
                <div style="font-size: 0.8125rem;">${vehicle.color}</div>
            </td>
            <td>
                ${vehicle.fleetCompany ? `<div style="font-size: 0.8125rem;">${vehicle.fleetCompany}</div>` : '<div style="font-size: 0.8125rem; color: var(--text-secondary);">-</div>'}
            </td>
            <td>
                ${vehicle.operationCompany ? `<div style="font-size: 0.8125rem;">${vehicle.operationCompany}</div>` : '<div style="font-size: 0.8125rem; color: var(--text-secondary);">-</div>'}
            </td>
            <td>
                ${customerName ? `<div style="font-size: 0.8125rem;">${customerName}</div>` : '<div style="font-size: 0.8125rem; color: var(--text-secondary);">-</div>'}
            </td>
            <td>
                <div style="font-size: 0.8125rem; font-weight: 500;">${soldDate}</div>
            </td>
            <td>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td onclick="event.stopPropagation();">
                <div style="display: flex; gap: 0.375rem;">
                    <button class="btn btn-small btn-secondary" onclick="openVehicleDetail(${vehicle.id})" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Details</button>
                    <button class="btn btn-small btn-secondary" onclick="openStatusPopup(${vehicle.id}, event)" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Status</button>
                </div>
            </td>
        </tr>
    `;
}

// Compact card for dashboard
function createVehicleCard(vehicle) {
    const statusClass = `status-${vehicle.status}`;
    const statusText = vehicle.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return `
        <div class="vehicle-card" onclick="openVehicleDetail(${vehicle.id})" style="cursor: pointer;">
            <div class="vehicle-header">
                <div class="vehicle-stock">${vehicle.stockNumber}</div>
                <div class="vehicle-title">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
            </div>
            <div class="vehicle-body" style="padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${vehicle.vin}</div>
                        <div style="font-size: 0.875rem; margin-top: 0.25rem;">${vehicle.trim} • ${vehicle.color}</div>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
        </div>
    `;
}

function createTradeInRow(tradeIn) {
    const statusBadge = tradeIn.pickedUp
        ? '<span class="status-badge" style="background: var(--joy-success-soft-bg); color: var(--joy-success-500);">✓ Picked Up</span>'
        : '<span class="status-badge status-pending-pickup">Awaiting Pickup</span>';
    const pickedUpDate = tradeIn.pickedUp && tradeIn.pickedUpDate
        ? new Date(tradeIn.pickedUpDate).toLocaleDateString()
        : '-';

    return `
        <tr class="vehicle-row" onclick="openTradeInDetail(${tradeIn.id})" style="cursor: pointer;">
            <td>
                <div style="font-weight: 600; font-size: 0.875rem; color: var(--accent);">${tradeIn.stockNumber || 'Fleet Return'}</div>
            </td>
            <td>
                <div style="font-weight: 600; font-size: 0.875rem;">${tradeIn.year} ${tradeIn.make} ${tradeIn.model}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.125rem;">${tradeIn.trim || ''}</div>
            </td>
            <td>
                <div style="font-size: 0.8125rem;">${tradeIn.vin}</div>
            </td>
            <td>
                <div style="font-size: 0.8125rem;">${tradeIn.color}</div>
            </td>
            <td>
                <div style="font-size: 0.8125rem;">${tradeIn.mileage ? tradeIn.mileage.toLocaleString() : 'N/A'}</div>
            </td>
            <td>
                ${tradeIn.pickedUp ? `<div style="font-size: 0.8125rem;">${pickedUpDate}</div>` : statusBadge}
            </td>
            <td onclick="event.stopPropagation();">
                <div style="display: flex; gap: 0.375rem; align-items: center;">
                    <button class="btn btn-small btn-secondary" onclick="openTradeInDetail(${tradeIn.id})" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Details</button>
                    <label class="custom-checkbox" style="margin: 0;">
                        <input type="checkbox" id="pickup-${tradeIn.id}" ${tradeIn.pickedUp ? 'checked' : ''} onchange="toggleTradeInPickup(${tradeIn.id})">
                        <span class="checkbox-label">
                            <span class="checkbox-box"></span>
                        </span>
                    </label>
                </div>
            </td>
        </tr>
    `;
}

function renderDetailModal(vehicle) {
    const isFromSold = soldVehicles.some(v => v.id === vehicle.id);
    const isFromTradeIn = tradeIns.some(t => t.id === vehicle.id);
    const content = document.getElementById('detailContent');

    const isEditing = window.currentlyEditingVehicle === vehicle.id;

    if (!isEditing) {
        // Display mode
        content.innerHTML = `
            <div class="vehicle-info">
                <div class="info-item"><div class="info-label">Stock #</div><div class="info-value">${vehicle.stockNumber}</div></div>
                <div class="info-item"><div class="info-label">VIN</div><div class="info-value">${vehicle.vin}</div></div>
                <div class="info-item"><div class="info-label">Year</div><div class="info-value">${vehicle.year}</div></div>
                <div class="info-item"><div class="info-label">Make</div><div class="info-value">${vehicle.make}</div></div>
                <div class="info-item"><div class="info-label">Model</div><div class="info-value">${vehicle.model}</div></div>
                <div class="info-item"><div class="info-label">Trim</div><div class="info-value">${vehicle.trim}</div></div>
                <div class="info-item"><div class="info-label">Color</div><div class="info-value">${vehicle.color}</div></div>
                <div class="info-item"><div class="info-label">Fleet Company</div><div class="info-value">${vehicle.fleetCompany || 'N/A'}</div></div>
                <div class="info-item"><div class="info-label">Operation Company</div><div class="info-value">${vehicle.operationCompany || 'N/A'}</div></div>
                <div class="info-item"><div class="info-label">In Stock Date</div><div class="info-value">${vehicle.inStockDate ? new Date(vehicle.inStockDate).toLocaleDateString() : 'N/A'}</div></div>
                <div class="info-item"><div class="info-label">Days in Stock</div><div class="info-value">${(() => {
                if (!vehicle.inStockDate) return 'N/A';
                const inStockDate = new Date(vehicle.inStockDate);
                const isSold = vehicle.status === 'sold' || soldVehicles.some(v => v.id === vehicle.id);
                const endDate = isSold && vehicle.customer?.saleDate ? new Date(vehicle.customer.saleDate) : new Date();

                // Normalize both dates to midnight local time for accurate day calculation
                inStockDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                const days = Math.floor((endDate - inStockDate) / (1000 * 60 * 60 * 24));
                return days >= 0 ? days + ' days' : 'N/A';
            })()}</div></div>
            </div>
            <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                <button class="btn btn-secondary" onclick="generateLabelById(${vehicle.id})" style="flex: 1;">🏷️ Generate Label</button>
                ${!isFromTradeIn ? `<button class="btn" onclick="enableEditMode(${vehicle.id})" style="flex: 1;">✏️ Edit Vehicle</button>` : ''}
            </div>
        `;
    } else {
        // Edit mode
        content.innerHTML = `
            <form id="editVehicleForm" onsubmit="saveVehicleEdit(event)">
                <div class="form-group">
                    <label for="editStockNumber">Stock #</label>
                    <input type="text" id="editStockNumber" value="${vehicle.stockNumber}" required>
                </div>
                <div class="form-group">
                    <label for="editVin">VIN</label>
                    <input type="text" id="editVin" value="${vehicle.vin}" maxlength="17" minlength="17" pattern="[A-HJ-NPR-Z0-9]{17}" title="VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q)" required style="text-transform: uppercase;">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editYear">Year</label>
                        <input type="number" id="editYear" value="${vehicle.year}" min="2000" max="2030" required title="Vehicle year must be between 2000 and 2030">
                    </div>
                    <div class="form-group">
                        <label for="editMake">Make</label>
                        <input type="text" id="editMake" value="${vehicle.make}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editModel">Model</label>
                        <input type="text" id="editModel" value="${vehicle.model}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTrim">Trim</label>
                        <input type="text" id="editTrim" value="${vehicle.trim}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editColor">Color</label>
                        <input type="text" id="editColor" value="${vehicle.color}" required>
                    </div>
                    <div class="form-group">
                        <label for="editFleetCompany">Fleet Company</label>
                        <input type="text" id="editFleetCompany" value="${vehicle.fleetCompany || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="editOperationCompany">Operation Company</label>
                    <input type="text" id="editOperationCompany" value="${vehicle.operationCompany || ''}">
                </div>
                <div class="form-group">
                    <label for="editInStockDate">In Stock Date</label>
                    <input type="date" id="editInStockDate" value="${vehicle.inStockDate ? (() => {
                const date = new Date(vehicle.inStockDate);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            })() : ''}">
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button type="submit" class="btn" style="flex: 1;">💾 Save Changes</button>
                    <button type="button" class="btn btn-secondary" onclick="cancelEditMode()" style="flex: 1;">✖ Cancel</button>
                </div>
            </form>
        `;
    }

    document.getElementById('detailStatus').value = vehicle.status;

    // Check if vehicle is sold
    const isSold = vehicle.status === 'sold' || soldVehicles.some(v => v.id === vehicle.id);

    // Show/hide payment section based on sold status
    const paymentSection = document.getElementById('paymentInfoSection');
    if (paymentSection) {
        paymentSection.style.display = isSold ? 'block' : 'none';
    }

    // Populate customer information
    if (vehicle.customer) {
        document.getElementById('customerFirstName').value = vehicle.customer.firstName || '';
        document.getElementById('customerLastName').value = vehicle.customer.lastName || '';
        document.getElementById('customerPhone').value = vehicle.customer.phone || '';
        document.getElementById('notes').value = vehicle.customer.notes || '';

        // Populate payment information separately (only if vehicle is sold)
        if (isSold) {
            document.getElementById('saleAmount').value = vehicle.customer.saleAmount || '';
            document.getElementById('saleDate').value = vehicle.customer.saleDate || '';
            document.getElementById('paymentMethod').value = vehicle.customer.paymentMethod || '';
            document.getElementById('paymentReference').value = vehicle.customer.paymentReference || '';
        }
    } else {
        document.getElementById('customerForm').reset();
        if (isSold && document.getElementById('paymentForm')) {
            document.getElementById('paymentForm').reset();
        }
    }

    // Render document list
    renderDocumentList();
}

// Store chart instances to destroy them before re-rendering
let chartInstances = {};

function renderAnalytics() {
    // Destroy existing charts to prevent memory leaks and rendering issues
    Object.values(chartInstances).forEach(chart => {
        if (chart) chart.destroy();
    });
    chartInstances = {};

    const period = document.getElementById('revenuePeriodFilter')?.value || 'monthly';

    // Chart color palette
    const colors = {
        primary: 'rgba(10, 132, 255, 0.8)',
        success: 'rgba(50, 215, 75, 0.8)',
        warning: 'rgba(255, 159, 10, 0.8)',
        danger: 'rgba(255, 69, 58, 0.8)',
        purple: 'rgba(191, 90, 242, 0.8)',
        teal: 'rgba(100, 210, 255, 0.8)',
        pink: 'rgba(255, 55, 95, 0.8)',
        orange: 'rgba(255, 149, 0, 0.8)'
    };

    const textColor = '#cbd5e1';
    const gridColor = 'rgba(226, 232, 240, 0.12)';

    // 1. Revenue Tracker Chart
    renderRevenueChart(period, colors, textColor, gridColor);

    // 2. Average Days to Sale Chart
    renderAgeChart(colors, textColor, gridColor);

    // 3. Inventory Status Distribution Chart
    renderStatusChart(colors, textColor);

    // 4. Vehicles by Make Chart
    renderMakeChart(colors, textColor, gridColor);

    // 5. Payment Method Distribution Chart
    renderPaymentChart(colors, textColor);

    // 6. Top Selling Models Chart
    renderTopModelsChart(colors, textColor, gridColor);

    // 7. Fleet Company Distribution Chart
    renderFleetCompanyChart(colors, textColor, gridColor);
}

function renderRevenueChart(period, colors, textColor, gridColor) {
    const soldVehiclesWithSales = soldVehicles.filter(v => {
        const saleDate = v.customer?.saleDate || v.saleDate;
        const saleAmount = v.customer?.saleAmount || v.saleAmount;
        return saleDate && saleAmount;
    });

    if (soldVehiclesWithSales.length === 0) {
        const canvas = document.getElementById('revenueChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = textColor;
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No sales data available', canvas.width / 2, canvas.height / 2);
        }
        return;
    }

    const revenueData = {};

    soldVehiclesWithSales.forEach(v => {
        const saleDate = v.customer?.saleDate || v.saleDate;
        const saleAmount = v.customer?.saleAmount || v.saleAmount;
        const date = new Date(saleDate);
        let key;

        if (period === 'weekly') {
            const weekNum = getWeekNumber(date);
            key = `Week ${weekNum}, ${date.getFullYear()}`;
        } else if (period === 'monthly') {
            key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        } else {
            key = date.getFullYear().toString();
        }

        revenueData[key] = (revenueData[key] || 0) + parseFloat(saleAmount || 0);
    });

    const sortedKeys = Object.keys(revenueData).sort((a, b) => {
        const dateA = parsePeriodKey(a, period);
        const dateB = parsePeriodKey(b, period);
        return dateA - dateB;
    });

    const canvas = document.getElementById('revenueChart');
    if (canvas) {
        chartInstances.revenue = new Chart(canvas, {
            type: 'line',
            data: {
                labels: sortedKeys,
                datasets: [{
                    label: 'Revenue ($)',
                    data: sortedKeys.map(k => revenueData[k]),
                    backgroundColor: 'rgba(50, 215, 75, 0.2)',
                    borderColor: colors.success,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: colors.success,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: 12, weight: '600' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Revenue: $${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            callback: (value) => '$' + value.toLocaleString()
                        },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }
}

function renderAgeChart(colors, textColor, gridColor) {
    const soldVehiclesWithDates = soldVehicles.filter(v => {
        const saleDate = v.customer?.saleDate || v.saleDate;
        return saleDate && v.inStockDate;
    });

    if (soldVehiclesWithDates.length === 0) {
        const canvas = document.getElementById('ageChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = textColor;
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No sold vehicle data available', canvas.width / 2, canvas.height / 2);
        }
        return;
    }

    // Group by month
    const ageByMonth = {};

    soldVehiclesWithDates.forEach(v => {
        const saleDate = v.customer?.saleDate || v.saleDate;
        const inStockDate = new Date(v.inStockDate);
        const saleDateObj = new Date(saleDate);

        // Calculate days between in stock date and sold date
        const daysInInventory = Math.floor((saleDateObj - inStockDate) / (1000 * 60 * 60 * 24));

        // Only include positive day values (sold date should be after in stock date)
        if (daysInInventory >= 0) {
            // Group by sale month
            const monthKey = `${saleDateObj.toLocaleString('default', { month: 'short' })} ${saleDateObj.getFullYear()}`;

            if (!ageByMonth[monthKey]) {
                ageByMonth[monthKey] = { total: 0, count: 0, date: saleDateObj };
            }
            ageByMonth[monthKey].total += daysInInventory;
            ageByMonth[monthKey].count += 1;
        }
    });

    // Calculate averages and sort by date
    const averages = Object.keys(ageByMonth).map(month => ({
        month,
        avg: ageByMonth[month].total / ageByMonth[month].count,
        date: ageByMonth[month].date
    })).sort((a, b) => a.date - b.date);

    const canvas = document.getElementById('ageChart');
    if (canvas) {
        chartInstances.age = new Chart(canvas, {
            type: 'line',
            data: {
                labels: averages.map(a => a.month),
                datasets: [{
                    label: 'Average Days to Sale',
                    data: averages.map(a => a.avg),
                    backgroundColor: 'rgba(10, 132, 255, 0.2)',
                    borderColor: colors.primary,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: colors.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: 12, weight: '600' } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        padding: 12,
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                                const days = Math.round(context.parsed.y);
                                return `Average: ${days} day${days !== 1 ? 's' : ''} to sale`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            callback: (value) => Math.round(value) + ' days'
                        },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }
}

function renderStatusChart(colors, textColor) {
    const statusData = {
        'In Stock': 0,
        'PDI': 0,
        'Pending Pickup': 0,
        'Pickup Scheduled': 0
    };

    // Exclude in-transit vehicles from status chart
    vehicles.filter(v => v.status !== 'in-transit').forEach(v => {
        switch (v.status) {
            case 'in-stock': statusData['In Stock']++; break;
            case 'pdi': statusData['PDI']++; break;
            case 'pending-pickup': statusData['Pending Pickup']++; break;
            case 'pickup-scheduled': statusData['Pickup Scheduled']++; break;
            case 'sold': statusData['Sold']++; break;
        }
    });

    const canvas = document.getElementById('statusChart');
    if (canvas) {
        chartInstances.status = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: [
                        colors.primary,
                        colors.warning,
                        colors.purple,
                        colors.orange,
                        colors.success,
                        colors.teal
                    ],
                    borderWidth: 2,
                    borderColor: '#1e293b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: textColor,
                            font: { size: 11, weight: '600' },
                            padding: 10
                        }
                    }
                }
            }
        });
    }
}

function renderMakeChart(colors, textColor, gridColor) {
    // Define all Subaru models
    const subaruModels = [
        'Subaru Outback',
        'Subaru Forester',
        'Subaru Crosstrek',
        'Subaru Ascent',
        'Subaru Impreza',
        'Subaru Legacy',
        'Subaru WRX',
        'Subaru BRZ',
        'Subaru Solterra'
    ];

    // Initialize all models with 0
    const modelData = {};
    subaruModels.forEach(model => {
        modelData[model] = 0;
    });

    // Count vehicles by model (exclude in-transit vehicles)
    vehicles.filter(v => v.status !== 'in-transit').forEach(v => {
        const modelKey = `${v.make} ${v.model}`;
        if (subaruModels.includes(modelKey)) {
            modelData[modelKey] = (modelData[modelKey] || 0) + 1;
        } else {
            // For non-Subaru or non-standard models, still count them
            modelData[modelKey] = (modelData[modelKey] || 0) + 1;
        }
    });

    // Sort by count (highest first) but keep all Subaru models
    const sortedModels = Object.entries(modelData)
        .sort((a, b) => b[1] - a[1]);

    const canvas = document.getElementById('makeChart');
    if (canvas) {
        chartInstances.make = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: sortedModels.map(m => m[0]),
                datasets: [{
                    label: 'Vehicles by Model',
                    data: sortedModels.map(m => m[1]),
                    backgroundColor: colors.primary,
                    borderColor: colors.primary.replace('0.8', '1'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: 12, weight: '600' } }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            stepSize: 1
                        },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: {
                            color: textColor,
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }
}

function renderPaymentChart(colors, textColor) {
    const soldVehiclesWithPayment = soldVehicles.filter(v => {
        const paymentMethod = v.customer?.paymentMethod || v.paymentMethod;
        return paymentMethod;
    });

    if (soldVehiclesWithPayment.length === 0) {
        const canvas = document.getElementById('paymentChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = textColor;
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No payment data available', canvas.width / 2, canvas.height / 2);
        }
        return;
    }

    const paymentData = {};
    soldVehiclesWithPayment.forEach(v => {
        const paymentMethod = v.customer?.paymentMethod || v.paymentMethod;
        paymentData[paymentMethod] = (paymentData[paymentMethod] || 0) + 1;
    });

    const canvas = document.getElementById('paymentChart');
    if (canvas) {
        chartInstances.payment = new Chart(canvas, {
            type: 'pie',
            data: {
                labels: Object.keys(paymentData),
                datasets: [{
                    data: Object.values(paymentData),
                    backgroundColor: [
                        colors.success,
                        colors.primary,
                        colors.purple
                    ],
                    borderWidth: 2,
                    borderColor: '#1e293b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            font: { size: 11, weight: '600' },
                            padding: 15
                        }
                    }
                }
            }
        });
    }
}

function renderTopModelsChart(colors, textColor, gridColor) {
    if (soldVehicles.length === 0) {
        const canvas = document.getElementById('modelsChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = textColor;
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No sold vehicle data available', canvas.width / 2, canvas.height / 2);
        }
        return;
    }

    const modelData = {};
    soldVehicles.forEach(v => {
        const modelKey = `${v.make} ${v.model}`;
        modelData[modelKey] = (modelData[modelKey] || 0) + 1;
    });

    const sortedModels = Object.entries(modelData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const canvas = document.getElementById('modelsChart');
    if (canvas) {
        chartInstances.models = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: sortedModels.map(m => m[0]),
                datasets: [{
                    label: 'Units Sold',
                    data: sortedModels.map(m => m[1]),
                    backgroundColor: colors.teal,
                    borderColor: colors.teal.replace('0.8', '1'),
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: 12, weight: '600' } }
                    }
                },
                scales: {
                    y: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            stepSize: 1
                        },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }
}

function renderFleetCompanyChart(colors, textColor, gridColor) {
    // Filter for vehicles currently on lot (not sold, not in-transit)
    const onLotVehicles = vehicles.filter(v => v.status !== 'sold' && v.status !== 'in-transit' && v.fleetCompany);

    if (onLotVehicles.length === 0) {
        const canvas = document.getElementById('fleetCompanyChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = textColor;
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No fleet company data available', canvas.width / 2, canvas.height / 2);
        }
        return;
    }

    const companyData = {};
    onLotVehicles.forEach(v => {
        const company = v.fleetCompany || 'Unknown';
        companyData[company] = (companyData[company] || 0) + 1;
    });

    const sortedCompanies = Object.entries(companyData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const canvas = document.getElementById('fleetCompanyChart');
    if (canvas) {
        chartInstances.fleetCompany = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: sortedCompanies.map(c => c[0]),
                datasets: [{
                    label: 'Units on Lot',
                    data: sortedCompanies.map(c => c[1]),
                    backgroundColor: colors.pink,
                    borderColor: colors.pink.replace('0.8', '1'),
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: 12, weight: '600' } }
                    }
                },
                scales: {
                    y: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            stepSize: 1
                        },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }
}

// Helper function to get week number
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Helper function to parse period keys for sorting
function parsePeriodKey(key, period) {
    if (period === 'yearly') {
        return new Date(parseInt(key), 0, 1);
    } else if (period === 'monthly') {
        const parts = key.split(' ');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames.indexOf(parts[0]);
        const year = parseInt(parts[1]);
        return new Date(year, month, 1);
    } else {
        const parts = key.split(', ');
        const year = parseInt(parts[1]);
        const week = parseInt(parts[0].split(' ')[1]);
        return new Date(year, 0, 1 + (week - 1) * 7);
    }
}

function filterVehicles(vehicleList) {
    return vehicleList.filter(v => {
        const searchTerm = currentFilter.search.toLowerCase();
        const matchesSearch = !searchTerm || v.stockNumber.toLowerCase().includes(searchTerm) || v.vin.toLowerCase().includes(searchTerm) || v.make.toLowerCase().includes(searchTerm) || v.model.toLowerCase().includes(searchTerm);
        const matchesMake = !currentFilter.make || v.make === currentFilter.make;
        const matchesStatus = !currentFilter.status || v.status === currentFilter.status;
        return matchesSearch && matchesMake && matchesStatus;
    });
}

function updateMakeFilter(selectId, vehicleList) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const makes = [...new Set(vehicleList.map(v => v.make))].sort();
    const currentValue = select.value;
    select.innerHTML = '<option value="">All Makes</option>' + makes.map(make => `<option value="${make}" ${make === currentValue ? 'selected' : ''}>${make}</option>`).join('');
}

function openAddModal() { document.getElementById('addModal').classList.add('active'); }
function closeAddModal() { document.getElementById('addModal').classList.remove('active'); document.getElementById('vehicleForm').reset(); }
function openVehicleDetail(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId) || soldVehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    currentVehicle = vehicle;
    window.currentVehicleId = vehicleId; // Set for delete button
    renderDetailModal(vehicle);
    document.getElementById('detailModal').classList.add('active');
}
function closeDetailModal() { document.getElementById('detailModal').classList.remove('active'); currentVehicle = null; }
function openLabelModal() { document.getElementById('labelModal').classList.add('active'); }
function closeLabelModal() { document.getElementById('labelModal').classList.remove('active'); }
function openKeyLabelModal() { document.getElementById('keyLabelModal').classList.add('active'); }
function closeKeyLabelModal() { document.getElementById('keyLabelModal').classList.remove('active'); }
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}
function openAdminPanel() {
    document.getElementById('adminPanelModal').classList.add('active');
    toggleUserDropdown(); // Close the dropdown
}
function closeAdminPanel() { document.getElementById('adminPanelModal').classList.remove('active'); }
function openTradeInModal() {
    document.getElementById('tradeInModal').classList.add('active');
}
function openManualTradeInModal() {
    // This is for manually adding trade-ins from the trade-ins page
    document.getElementById('tradeInModalTitle').textContent = 'Add Trade-In Vehicle';
    const stockNumberInput = document.getElementById('tradeStockNumber');
    const stockNumberHint = document.getElementById('tradeStockNumberHint');

    // Make stock number editable and show hint
    stockNumberInput.removeAttribute('readonly');
    stockNumberInput.style.background = '';
    stockNumberInput.style.cursor = '';
    stockNumberInput.placeholder = 'Enter stock number';
    if (stockNumberHint) stockNumberHint.style.display = 'inline';

    openTradeInModal();
}
function closeTradeInModal() {
    document.getElementById('tradeInModal').classList.remove('active');
    document.getElementById('tradeInForm').reset();

    // Reset stock number hint visibility
    const stockNumberHint = document.getElementById('tradeStockNumberHint');
    if (stockNumberHint) stockNumberHint.style.display = 'none';
}
function openPickupScheduleModal() { document.getElementById('pickupScheduleModal').classList.add('active'); }
function closePickupScheduleModal() { document.getElementById('pickupScheduleModal').classList.remove('active'); document.getElementById('pickupScheduleForm').reset(); }
function openSoldModal() {
    document.getElementById('soldModal').classList.add('active');
    // Reset trade-in section
    document.getElementById('hasTradeIn').value = 'no';
    toggleTradeInSection();
}
function closeSoldModal() {
    document.getElementById('soldModal').classList.remove('active');
    document.getElementById('soldForm').reset();
    // Reset trade-in section
    document.getElementById('hasTradeIn').value = 'no';
    toggleTradeInSection();
}

function openImportCSVModal() {
    document.getElementById('importCSVModal').classList.add('active');
    document.getElementById('importCSVForm').reset();
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importResults').style.display = 'none';
}

function closeImportCSVModal() {
    document.getElementById('importCSVModal').classList.remove('active');
    document.getElementById('importCSVForm').reset();
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importResults').style.display = 'none';
}

// Remove Duplicates Modal Functions
function openRemoveDuplicatesModal() {
    document.getElementById('removeDuplicatesModal').classList.add('active');
    document.getElementById('duplicateScanResults').style.display = 'none';
    document.getElementById('duplicateRemovalResults').style.display = 'none';
    document.getElementById('removeDuplicatesBtn').style.display = 'none';
}

function closeRemoveDuplicatesModal() {
    document.getElementById('removeDuplicatesModal').classList.remove('active');
    document.getElementById('duplicateScanResults').style.display = 'none';
    document.getElementById('duplicateRemovalResults').style.display = 'none';
    document.getElementById('removeDuplicatesBtn').style.display = 'none';
}

let foundDuplicates = [];

async function scanForDuplicates() {
    try {
        // Fetch all vehicles
        const [inventoryResponse, soldResponse] = await Promise.all([
            fetch(`${API_BASE}/inventory`, { credentials: 'include' }),
            fetch(`${API_BASE}/sold-vehicles`, { credentials: 'include' })
        ]);

        const inventory = inventoryResponse.ok ? await inventoryResponse.json() : [];
        const soldVehicles = soldResponse.ok ? await soldResponse.json() : [];

        // Combine all vehicles with source information
        const allVehicles = [
            ...inventory.map(v => ({ ...v, source: 'inventory' })),
            ...soldVehicles.map(v => ({ ...v, source: 'sold' }))
        ];

        // Find duplicates by VIN
        const vinMap = new Map();
        foundDuplicates = [];

        for (const vehicle of allVehicles) {
            const vin = vehicle.vin?.toUpperCase();
            if (!vin) continue;

            if (vinMap.has(vin)) {
                // We found a duplicate
                const existing = vinMap.get(vin);
                if (!existing.isDuplicate) {
                    // First time finding this duplicate
                    existing.isDuplicate = true;
                    foundDuplicates.push({
                        vin: vin,
                        vehicles: [existing, vehicle]
                    });
                } else {
                    // Add to existing duplicate group
                    const dupGroup = foundDuplicates.find(d => d.vin === vin);
                    if (dupGroup) {
                        dupGroup.vehicles.push(vehicle);
                    }
                }
            } else {
                vinMap.set(vin, vehicle);
            }
        }

        // Display results
        const resultsDiv = document.getElementById('duplicateScanResults');
        resultsDiv.style.display = 'block';

        if (foundDuplicates.length === 0) {
            resultsDiv.innerHTML = `
                <div style="padding: 1rem; background: rgba(50, 215, 75, 0.1); border: 1px solid rgba(50, 215, 75, 0.3); border-radius: var(--joy-radius-sm);">
                    <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--joy-success-500);">✅ No Duplicates Found</h4>
                    <p style="font-size: 0.8125rem; color: var(--joy-text-secondary);">Your inventory is clean!</p>
                </div>
            `;
            document.getElementById('removeDuplicatesBtn').style.display = 'none';
        } else {
            const totalDuplicates = foundDuplicates.reduce((sum, group) => sum + (group.vehicles.length - 1), 0);

            let duplicatesList = foundDuplicates.map(group => {
                const sortedVehicles = group.vehicles.sort((a, b) => {
                    const dateA = new Date(a.dateAdded || 0);
                    const dateB = new Date(b.dateAdded || 0);
                    return dateB - dateA; // Most recent first
                });

                return `
                    <div style="margin-bottom: 1rem; padding: 0.75rem; background: rgba(0, 0, 0, 0.2); border-radius: var(--joy-radius-sm);">
                        <div style="font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--joy-text-primary);">
                            VIN: ${group.vin}
                        </div>
                        ${sortedVehicles.map((v, idx) => `
                            <div style="font-size: 0.75rem; color: var(--joy-text-secondary); padding: 0.25rem 0; ${idx === 0 ? 'color: var(--joy-success-500); font-weight: 600;' : ''}">
                                ${idx === 0 ? '✓ KEEP: ' : '✗ DELETE: '}
                                ${v.year} ${v.make} ${v.model} - Stock: ${v.stockNumber}
                                (${v.source === 'inventory' ? 'Inventory' : 'Sold'})
                                ${v.dateAdded ? `- Added: ${new Date(v.dateAdded).toLocaleDateString()}` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            }).join('');

            resultsDiv.innerHTML = `
                <div style="padding: 1rem; background: rgba(255, 159, 10, 0.1); border: 1px solid rgba(255, 159, 10, 0.3); border-radius: var(--joy-radius-sm);">
                    <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--joy-warning-500);">⚠️ ${foundDuplicates.length} Duplicate VIN${foundDuplicates.length > 1 ? 's' : ''} Found</h4>
                    <p style="font-size: 0.8125rem; color: var(--joy-text-secondary); margin-bottom: 1rem;">
                        ${totalDuplicates} duplicate vehicle${totalDuplicates > 1 ? 's' : ''} will be removed (keeping the most recent entry for each VIN)
                    </p>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${duplicatesList}
                    </div>
                </div>
            `;
            document.getElementById('removeDuplicatesBtn').style.display = 'block';
        }
    } catch (error) {
        console.error('Error scanning for duplicates:', error);
        showNotification('Failed to scan for duplicates: ' + error.message, 'error');
    }
}

async function confirmRemoveDuplicates() {
    if (foundDuplicates.length === 0) return;

    const totalToRemove = foundDuplicates.reduce((sum, group) => sum + (group.vehicles.length - 1), 0);

    const confirmed = await showConfirmation(
        `Remove ${totalToRemove} duplicate vehicle${totalToRemove > 1 ? 's' : ''}? This will permanently delete ${totalToRemove} duplicate entries. The most recent entry for each VIN will be kept.`
    );

    if (!confirmed) return;

    await removeDuplicates();
}

async function removeDuplicates() {
    try {
        let removedCount = 0;
        let failedCount = 0;

        for (const group of foundDuplicates) {
            // Sort by date (most recent first) and keep the first one
            const sortedVehicles = group.vehicles.sort((a, b) => {
                const dateA = new Date(a.dateAdded || 0);
                const dateB = new Date(b.dateAdded || 0);
                return dateB - dateA;
            });

            // Remove all except the first (most recent)
            for (let i = 1; i < sortedVehicles.length; i++) {
                const vehicle = sortedVehicles[i];
                const endpoint = vehicle.source === 'inventory'
                    ? `${API_BASE}/inventory/${vehicle.id}`
                    : `${API_BASE}/sold-vehicles/${vehicle.id}`;

                try {
                    const response = await fetch(endpoint, {
                        method: 'DELETE',
                        credentials: 'include'
                    });

                    if (response.ok) {
                        removedCount++;
                    } else {
                        failedCount++;
                    }
                } catch (error) {
                    failedCount++;
                }
            }
        }

        // Show results
        const resultsDiv = document.getElementById('duplicateRemovalResults');
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = `
            <div style="padding: 1rem; background: rgba(50, 215, 75, 0.1); border: 1px solid rgba(50, 215, 75, 0.3); border-radius: var(--joy-radius-sm);">
                <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--joy-success-500);">✅ Duplicates Removed</h4>
                <p style="font-size: 0.8125rem; color: var(--joy-text-secondary);">
                    ${removedCount} duplicate${removedCount !== 1 ? 's' : ''} removed successfully
                    ${failedCount > 0 ? `<br>${failedCount} failed to remove` : ''}
                </p>
            </div>
        `;

        await loadAllData();
        renderCurrentPage();
        showNotification(`Removed ${removedCount} duplicate vehicle${removedCount !== 1 ? 's' : ''}`, 'success');

        // Reset scan results
        document.getElementById('duplicateScanResults').style.display = 'none';
        document.getElementById('removeDuplicatesBtn').style.display = 'none';
        foundDuplicates = [];

        setTimeout(() => {
            closeRemoveDuplicatesModal();
        }, 2000);

    } catch (error) {
        console.error('Error removing duplicates:', error);
        showNotification('Failed to remove duplicates: ' + error.message, 'error');
    }
}

function downloadExampleCSV() {
    const exampleData = [
        ['Stock Number', 'VIN', 'Year', 'Make', 'Model', 'Trim', 'Color', 'Fleet Company', 'Operation Company', 'Status', 'In Stock Date', 'Customer First Name', 'Customer Last Name', 'Customer Phone', 'Sale Date', 'Sale Amount', 'Payment Method', 'Payment Reference'],
        ['SUB001', '1HGBH41JXMN109186', '2024', 'Subaru', 'Outback', 'Premium', 'Crystal White Pearl', 'Acme Fleet', 'Northeast Operations', 'in-stock', '2024-01-15', '', '', '', '', '', '', ''],
        ['SUB002', '4S4BTANC5M3128456', '2024', 'Subaru', 'Forester', 'Sport', 'Magnetite Gray Metallic', 'ABC Rentals', 'West Coast Ops', 'in-transit', '2024-01-20', '', '', '', '', '', '', ''],
        ['SUB003', 'JF2SKAGC8MH523789', '2023', 'Subaru', 'Crosstrek', 'Limited', 'Horizon Blue Pearl', 'Enterprise Fleet', 'Southern Region', 'sold', '2023-12-10', 'John', 'Smith', '555-123-4567', '2024-01-05', '28500', 'ACH', 'TXN123456'],
        ['SUB004', '4S3GTAA68M1742590', '2024', 'Subaru', 'Ascent', 'Touring', 'Autumn Green Metallic', '', '', 'sold', '2024-01-10', 'Jane', 'Doe', '555-987-6543', '2024-01-18', '35000', 'Check', 'CHK789012']
    ];

    const csv = exampleData.map(row => row.map(field => '"' + field + '"').join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicle-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification('Example CSV template downloaded', 'success');
}

async function handleCSVImport(event) {
    event.preventDefault();

    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];

    if (!file) {
        showNotification('Please select a CSV file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            showNotification('CSV file is empty or invalid', 'error');
            return;
        }

        // Parse CSV
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

        const headers = parseCSVLine(lines[0]);
        const vehicles = [];
        const errors = [];

        // Validate headers
        const requiredHeaders = ['Stock Number', 'VIN', 'Year', 'Make', 'Model', 'Trim', 'Color'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
            showNotification(`Missing required columns: ${missingHeaders.join(', ')}`, 'error');
            return;
        }

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < 7) continue; // Skip invalid rows

            // Helper function to check if value is not empty
            const hasValue = (val) => val && val.trim() !== '';

            // Parse customer and payment information if present
            const customerInfo = {};
            if (hasValue(values[11]) || hasValue(values[12]) || hasValue(values[13])) {
                customerInfo.firstName = values[11] || '';
                customerInfo.lastName = values[12] || '';
                customerInfo.phone = values[13] || '';
            }
            if (hasValue(values[14]) || hasValue(values[15]) || hasValue(values[16]) || hasValue(values[17])) {
                customerInfo.saleDate = values[14] || '';
                customerInfo.saleAmount = parseFloat(values[15]) || 0;
                customerInfo.paymentMethod = values[16] || '';
                customerInfo.paymentReference = values[17] || '';
            }

            const vehicleStatus = values[9] || 'in-stock';

            const vehicle = {
                id: Date.now() + i,
                stockNumber: values[0],
                vin: values[1] ? values[1].toUpperCase() : '',
                year: parseInt(values[2]),
                make: values[3],
                model: values[4],
                trim: values[5],
                color: values[6],
                fleetCompany: values[7] || '',
                operationCompany: values[8] || '',
                status: vehicleStatus,
                dateAdded: new Date().toISOString(),
                // Only set inStockDate if not in-transit
                inStockDate: vehicleStatus === 'in-transit' ? null : (hasValue(values[10]) ? new Date(values[10]).toISOString() : null),
                customer: Object.keys(customerInfo).length > 0 ? customerInfo : undefined
            };

            // Validation
            const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
            if (!vinPattern.test(vehicle.vin)) {
                errors.push(`Row ${i + 1}: Invalid VIN format - ${vehicle.vin}`);
                continue;
            }

            if (vehicle.year < 2000 || vehicle.year > 2030) {
                errors.push(`Row ${i + 1}: Invalid year - ${vehicle.year}`);
                continue;
            }

            const validStatuses = ['in-stock', 'in-transit', 'pdi', 'pending-pickup', 'pickup-scheduled', 'sold'];
            if (vehicle.status && !validStatuses.includes(vehicle.status.toLowerCase())) {
                errors.push(`Row ${i + 1}: Invalid status - ${vehicle.status}`);
                continue;
            }

            // Normalize status to lowercase
            if (vehicle.status) {
                vehicle.status = vehicle.status.toLowerCase();
            }

            vehicles.push(vehicle);
        }

        // Show preview
        const previewDiv = document.getElementById('importPreview');
        const previewContent = document.getElementById('importPreviewContent');
        previewDiv.style.display = 'block';

        previewContent.innerHTML = `
            <p style="font-size: 0.875rem; margin-bottom: 0.5rem;">
                <strong style="color: var(--joy-success-500);">${vehicles.length} vehicles</strong> ready to import
                ${errors.length > 0 ? `<br><strong style="color: var(--joy-danger-500);">${errors.length} errors</strong> found` : ''}
            </p>
            ${errors.length > 0 ? `
                <div style="max-height: 150px; overflow-y: auto; background: rgba(255, 69, 58, 0.1); border: 1px solid rgba(255, 69, 58, 0.3); border-radius: 4px; padding: 0.5rem; margin-top: 0.5rem;">
                    ${errors.map(err => `<div style="font-size: 0.75rem; color: var(--joy-danger-500);">${err}</div>`).join('')}
                </div>
            ` : ''}
        `;

        if (vehicles.length === 0) {
            showNotification('No valid vehicles to import', 'error');
            return;
        }

        // Import vehicles
        try {
            // First, fetch all existing VINs to check for duplicates
            const [inventoryResponse, soldResponse] = await Promise.all([
                fetch(`${API_BASE}/inventory`, { credentials: 'include' }),
                fetch(`${API_BASE}/sold-vehicles`, { credentials: 'include' })
            ]);

            const existingInventory = inventoryResponse.ok ? await inventoryResponse.json() : [];
            const existingSold = soldResponse.ok ? await soldResponse.json() : [];

            // Create a Set of existing VINs for fast lookup
            const existingVINs = new Set([
                ...existingInventory.map(v => v.vin?.toUpperCase()),
                ...existingSold.map(v => v.vin?.toUpperCase())
            ]);

            let successCount = 0;
            let failCount = 0;
            let soldCount = 0;
            let duplicateCount = 0;

            for (const vehicle of vehicles) {
                try {
                    // Check for duplicate VIN
                    if (existingVINs.has(vehicle.vin)) {
                        duplicateCount++;
                        errors.push(`${vehicle.stockNumber}: Duplicate VIN ${vehicle.vin} already exists`);
                        continue;
                    }

                    // Determine if vehicle should go to sold_vehicles or inventory
                    const hasSaleDate = vehicle.customer?.saleDate && vehicle.customer.saleDate.trim() !== '';
                    const isSold = hasSaleDate || vehicle.status === 'sold';
                    const endpoint = isSold ? `${API_BASE}/sold-vehicles` : `${API_BASE}/inventory`;

                    // Set status to 'sold' if it has sale information
                    if (isSold) {
                        vehicle.status = 'sold';
                        soldCount++;
                    }

                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(vehicle)
                    });

                    if (response.ok) {
                        successCount++;
                        // Add to existing VINs set to prevent duplicates within the same import
                        existingVINs.add(vehicle.vin);
                    } else {
                        failCount++;
                        const errorData = await response.json();
                        errors.push(`${vehicle.stockNumber}: ${errorData.error || 'Failed to import'}`);
                    }
                } catch (error) {
                    failCount++;
                    errors.push(`${vehicle.stockNumber}: ${error.message}`);
                }
            }

            // Show results
            const resultsDiv = document.getElementById('importResults');
            resultsDiv.style.display = 'block';
            resultsDiv.innerHTML = `
                <div style="padding: 1rem; background: rgba(50, 215, 75, 0.1); border: 1px solid rgba(50, 215, 75, 0.3); border-radius: var(--joy-radius-sm);">
                    <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--joy-success-500);">Import Complete</h4>
                    <p style="font-size: 0.8125rem; color: var(--joy-text-secondary);">
                        ✅ ${successCount} vehicles imported successfully<br>
                        ${soldCount > 0 ? `💰 ${soldCount} imported as sold<br>` : ''}
                        ${duplicateCount > 0 ? `⚠️ ${duplicateCount} duplicates skipped<br>` : ''}
                        ${failCount > 0 ? `❌ ${failCount} vehicles failed` : ''}
                    </p>
                </div>
            `;

            await loadAllData();
            renderCurrentPage();
            showNotification(`Successfully imported ${successCount} vehicles (${soldCount} sold)`, 'success');

            // Reset form after successful import
            setTimeout(() => {
                closeImportCSVModal();
            }, 2000);

        } catch (error) {
            console.error('Import error:', error);
            showNotification('Failed to import vehicles: ' + error.message, 'error');
        }
    };

    reader.readAsText(file);
}

// Open status popup
function openStatusPopup(vehicleId, event) {
    event.stopPropagation();

    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    const button = event.target;
    const popup = document.getElementById('statusPopup');
    const rect = button.getBoundingClientRect();

    // Create status options
    const statuses = [
        { value: 'in-stock', label: 'In Stock', class: 'status-in-stock' },
        { value: 'in-transit', label: 'In-Transit', class: 'status-in-transit' },
        { value: 'pdi', label: 'PDI', class: 'status-pdi' },
        { value: 'pending-pickup', label: 'Pending Pickup', class: 'status-pending-pickup' },
        { value: 'pickup-scheduled', label: 'Pickup Scheduled', class: 'status-pickup-scheduled' },
        { value: 'sold', label: 'Sold', class: 'status-sold' }
    ];

    popup.innerHTML = statuses.map(status => `
        <div class="status-popup-option ${vehicle.status === status.value ? 'selected' : ''}" 
             onclick="quickStatusChange(${vehicleId}, '${status.value}')">
            <span class="status-badge ${status.class}" style="margin-right: 0.5rem;">${status.label}</span>
        </div>
    `).join('');

    // Show popup temporarily to get its height
    popup.style.visibility = 'hidden';
    popup.classList.add('active');

    // Calculate positions
    const popupHeight = popup.offsetHeight;
    const popupWidth = popup.offsetWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let top = rect.bottom + window.scrollY + 5;
    let left = rect.left + window.scrollX;

    // Check if popup goes off bottom of screen
    if (rect.bottom + popupHeight + 5 > viewportHeight) {
        // Position above button instead
        top = rect.top + window.scrollY - popupHeight - 5;
    }

    // Check if popup goes off right of screen
    if (left + popupWidth > viewportWidth) {
        // Align to right edge of button
        left = rect.right + window.scrollX - popupWidth;
    }

    // Make sure it doesn't go off left edge
    if (left < 0) {
        left = 10;
    }

    // Make sure it doesn't go off top edge
    if (top < window.scrollY) {
        top = window.scrollY + 10;
    }

    // Position popup
    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
    popup.style.visibility = 'visible';

    // Close popup when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeStatusPopup);
    }, 0);
}

function closeStatusPopup() {
    const popup = document.getElementById('statusPopup');
    popup.classList.remove('active');
    document.removeEventListener('click', closeStatusPopup);
}

// Quick status change from card dropdown
async function quickStatusChange(vehicleId, newStatus) {
    closeStatusPopup(); // Close the popup immediately

    if (!newStatus) return;

    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    currentVehicle = vehicle;

    // If changing to sold, show sold modal
    if (newStatus === 'sold') {
        openSoldModal();
        return;
    }

    // If changing to pickup-scheduled, show pickup schedule modal
    if (newStatus === 'pickup-scheduled') {
        openPickupScheduleModal();
        return;
    }

    // Regular status change
    vehicle.status = newStatus;
    try {
        const response = await fetch(`${API_BASE}/inventory/${vehicleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(vehicle)
        });
        if (!response.ok) throw new Error('Failed to update vehicle');
        await loadInventory();
        updateDashboard();
        renderCurrentPage();
    } catch (error) {
        console.error('Error updating vehicle:', error);
        alert('Failed to update vehicle status. Please try again.');
    }
}

function toggleTradeInSection() {
    const hasTradeIn = document.getElementById('hasTradeIn').value;
    const tradeInSection = document.getElementById('tradeInSection');
    const tradeInFields = ['tradeInVin', 'tradeInYear', 'tradeInMake', 'tradeInModel', 'tradeInColor'];

    if (hasTradeIn === 'yes') {
        tradeInSection.style.display = 'block';
        // Set required attributes
        tradeInFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.required = true;
        });

        // Generate stock number based on current vehicle
        if (currentVehicle && currentVehicle.stockNumber) {
            document.getElementById('tradeInStockNumber').value = currentVehicle.stockNumber + '-A';
        }
    } else {
        tradeInSection.style.display = 'none';
        // Remove required attributes and clear values
        tradeInFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.required = false;
                field.value = '';
            }
        });
        document.getElementById('tradeInStockNumber').value = '';
    }
}

async function handleSoldSubmit(event) {
    event.preventDefault();
    if (!currentVehicle) {
        showNotification('Error: No vehicle selected', 'error');
        return;
    }

    // Get payment information
    const saleInfo = {
        saleAmount: parseFloat(document.getElementById('soldAmount').value) || 0,
        saleDate: document.getElementById('soldDate').value,
        paymentMethod: document.getElementById('soldPaymentMethod').value,
        paymentReference: document.getElementById('soldReference').value,
        notes: document.getElementById('soldNotes').value
    };

    // Preserve existing customer info if it exists
    currentVehicle.customer = {
        ...(currentVehicle.customer || {}),
        ...saleInfo
    };

    const soldVehicle = { ...currentVehicle, status: 'sold' };

    try {
        // Check if vehicle already exists in sold_vehicles table
        const existsInSold = soldVehicles.some(v => v.id === currentVehicle.id);

        if (existsInSold) {
            // Update existing sold vehicle
            const updateResponse = await fetch(`${API_BASE}/sold-vehicles/${currentVehicle.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(soldVehicle)
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(errorData.error || 'Failed to update sold vehicle');
            }
        } else {
            // Add to sold vehicles
            const soldResponse = await fetch(`${API_BASE}/sold-vehicles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(soldVehicle)
            });

            if (!soldResponse.ok) {
                const errorData = await soldResponse.json();
                throw new Error(errorData.error || 'Failed to add sold vehicle');
            }
        }

        // Delete from inventory (if it exists there)
        const existsInInventory = vehicles.some(v => v.id === currentVehicle.id);
        if (existsInInventory) {
            const deleteResponse = await fetch(`${API_BASE}/inventory/${currentVehicle.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!deleteResponse.ok) {
                throw new Error('Failed to remove from inventory');
            }
        }

        // Check if there's a trade-in
        const hasTradeIn = document.getElementById('hasTradeIn').value;
        if (hasTradeIn === 'yes') {
            // Validate VIN format
            const tradeInVin = document.getElementById('tradeInVin').value.toUpperCase();
            const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
            if (!vinPattern.test(tradeInVin)) {
                throw new Error('Invalid trade-in VIN format. VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q).');
            }

            // Create trade-in vehicle
            const tradeIn = {
                id: Date.now(),
                stockNumber: document.getElementById('tradeInStockNumber').value,
                vin: tradeInVin,
                year: parseInt(document.getElementById('tradeInYear').value),
                make: document.getElementById('tradeInMake').value,
                model: document.getElementById('tradeInModel').value,
                trim: '',
                color: document.getElementById('tradeInColor').value,
                mileage: 0,
                notes: `Trade-in for ${currentVehicle.stockNumber} (${currentVehicle.year} ${currentVehicle.make} ${currentVehicle.model})`,
                pickedUp: false,
                pickedUpDate: null,
                dateAdded: new Date().toISOString()
            };

            // Add trade-in to database
            const tradeInResponse = await fetch(`${API_BASE}/trade-ins`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(tradeIn)
            });

            if (!tradeInResponse.ok) {
                throw new Error('Failed to add trade-in vehicle');
            }
        }

        await loadAllData();
        closeSoldModal();
        closeDetailModal();
        updateDashboard();
        renderCurrentPage();

        // Clear the form and reset trade-in section
        document.getElementById('soldForm').reset();
        document.getElementById('hasTradeIn').value = 'no';
        toggleTradeInSection();

        showNotification('Vehicle marked as sold successfully!' + (hasTradeIn === 'yes' ? ' Trade-in vehicle added.' : ''), 'success');

    } catch (error) {
        console.error('Error marking vehicle as sold:', error);
        showNotification('Failed to mark vehicle as sold: ' + error.message, 'error');
    }
}

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
        const pageNames = {
            'dashboard': 'Dashboard',
            'inventory': 'Inventory',
            'in-transit': 'In-Transit',
            'pdi': 'PDI',
            'pending-pickup': 'Pending Pickup',
            'pickup-scheduled': 'Pickup Scheduled',
            'sold': 'Sold Vehicles',
            'tradeins': 'Trade-Ins',
            'payments': 'Payments',
            'analytics': 'Analytics'
        };
        breadcrumb.textContent = pageNames[pageId] || 'Dashboard';
    }

    renderCurrentPage();
}

// Helper function for navigating from dashboard cards
function navigateTo(pageId) {
    switchPage(pageId);
}

function formatDate(dateString) { if (!dateString) return 'N/A'; return new Date(dateString).toLocaleDateString(); }

document.addEventListener('DOMContentLoaded', function () {
    checkAuth();

    // Initialize mobile sidebar
    initMobileSidebar();

    // Add event listeners only if elements exist
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', login);

    const vehicleForm = document.getElementById('vehicleForm');
    if (vehicleForm) vehicleForm.addEventListener('submit', addVehicle);

    const customerForm = document.getElementById('customerForm');
    if (customerForm) customerForm.addEventListener('submit', saveCustomerInfo);

    const tradeInForm = document.getElementById('tradeInForm');
    if (tradeInForm) tradeInForm.addEventListener('submit', addTradeIn);

    const pickupScheduleForm = document.getElementById('pickupScheduleForm');
    if (pickupScheduleForm) pickupScheduleForm.addEventListener('submit', schedulePickup);

    const soldForm = document.getElementById('soldForm');
    if (soldForm) soldForm.addEventListener('submit', handleSoldSubmit);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // User dropdown toggle
    const userInfoClick = document.getElementById('userInfoClick');
    if (userInfoClick) {
        userInfoClick.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleUserDropdown();
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        const userDropdown = document.getElementById('userDropdown');
        const userInfoClick = document.getElementById('userInfoClick');
        if (userDropdown && userInfoClick && !userInfoClick.contains(e.target)) {
            userDropdown.style.display = 'none';
        }
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            switchPage(pageId);
        });
    });

    if (document.getElementById('searchInput')) {
        document.getElementById('searchInput').addEventListener('input', function (e) {
            currentFilter.search = e.target.value;
            renderCurrentPage();
        });
    }

    if (document.getElementById('makeFilter')) {
        document.getElementById('makeFilter').addEventListener('change', function (e) {
            currentFilter.make = e.target.value;
            renderCurrentPage();
        });
    }

    if (document.getElementById('statusFilter')) {
        document.getElementById('statusFilter').addEventListener('change', function (e) {
            currentFilter.status = e.target.value;
            renderCurrentPage();
        });
    }

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) this.classList.remove('active');
        });
    });
});

// Payment Tracking Functions
function renderPaymentsPage() {
    // Render MoM and YoY analytics first
    renderPaymentAnalytics();

    // Get all sold vehicles with payments
    let filtered = soldVehicles.filter(v =>
        v.customer &&
        v.customer.saleDate &&
        (v.customer.paymentMethod || v.customer.paymentReference || v.customer.saleAmount)
    );

    // Apply filters
    const monthFilter = document.getElementById('paymentMonthFilter')?.value;
    const yearFilter = document.getElementById('paymentYearFilter')?.value;
    const methodFilter = document.getElementById('paymentMethodFilter')?.value;
    const searchTerm = document.getElementById('paymentSearchInput')?.value.toLowerCase() || '';

    // Filter by month/year
    if (monthFilter || yearFilter) {
        filtered = filtered.filter(v => {
            const saleDate = new Date(v.customer.saleDate);
            if (yearFilter && saleDate.getFullYear().toString() !== yearFilter) return false;
            if (monthFilter && (saleDate.getMonth() + 1).toString() !== monthFilter) return false;
            return true;
        });
    }

    // Filter by payment method
    if (methodFilter) {
        filtered = filtered.filter(v => v.customer.paymentMethod === methodFilter);
    }

    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(v => {
            return v.stockNumber.toLowerCase().includes(searchTerm) ||
                v.vin.toLowerCase().includes(searchTerm) ||
                `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(searchTerm) ||
                (v.customer?.firstName || '').toLowerCase().includes(searchTerm) ||
                (v.customer?.lastName || '').toLowerCase().includes(searchTerm) ||
                (v.customer?.paymentReference || '').toLowerCase().includes(searchTerm);
        });
    }

    // Sort by sale date - newest first
    filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.customer.saleDate);
        const dateB = new Date(b.customer.saleDate);
        return dateB - dateA; // Most recent first
    });

    // Update year filter options
    updatePaymentYearFilter();

    const tbody = document.getElementById('paymentsTableBody');
    const tfoot = document.getElementById('paymentsTableFooter');
    if (!tbody || !tfoot) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding: 2rem; text-align: center; color: var(--text-secondary);">No payment records found</td></tr>';
        tfoot.innerHTML = '';
        return;
    }

    let totalAmount = 0;

    tbody.innerHTML = filtered.map(vehicle => {
        const customerName = `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim() || 'N/A';
        const saleDate = vehicle.customer.saleDate ? new Date(vehicle.customer.saleDate).toLocaleDateString() : 'N/A';
        const saleAmount = parseFloat(vehicle.customer.saleAmount) || 0;
        const paymentMethod = vehicle.customer.paymentMethod || 'N/A';
        const paymentRef = vehicle.customer.paymentReference || 'N/A';

        totalAmount += saleAmount;

        return `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 1rem;">${vehicle.stockNumber}</td>
                <td style="padding: 1rem;">${vehicle.year} ${vehicle.make} ${vehicle.model}</td>
                <td style="padding: 1rem;">${customerName}</td>
                <td style="padding: 1rem;">${saleDate}</td>
                <td style="padding: 1rem; text-align: right; font-weight: 600; font-family: monospace;">$${saleAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="padding: 1rem;">
                    <span class="status-badge ${paymentMethod === 'ACH' ? 'status-in-stock' :
                paymentMethod === 'Check' ? 'status-pending-pickup' :
                    paymentMethod === 'Credit Card' ? 'status-pickup-scheduled' :
                        paymentMethod === 'Wire Transfer' ? 'status-pdi' :
                            paymentMethod === 'Cash' ? 'status-sold' :
                                'status-pdi'
            }">${paymentMethod}</span>
                </td>
                <td style="padding: 1rem; font-family: monospace;">${paymentRef}</td>
                <td style="padding: 1rem;">
                    <button class="btn btn-small btn-secondary" onclick="openVehicleDetail(${vehicle.id})">View</button>
                </td>
            </tr>
        `;
    }).join('');

    // Add total row with count
    tfoot.innerHTML = `
        <tr>
            <td colspan="4" style="padding: 1rem; text-align: right; font-weight: 700; font-size: 1.1rem;">
                Total (${filtered.length} payment${filtered.length !== 1 ? 's' : ''}):
            </td>
            <td style="padding: 1rem; text-align: right; font-weight: 700; font-size: 1.1rem; font-family: monospace; color: var(--accent);">$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td colspan="3"></td>
        </tr>
    `;
}

function updatePaymentYearFilter() {
    const yearFilter = document.getElementById('paymentYearFilter');
    if (!yearFilter) return;

    // Get unique years from payment dates
    const years = new Set();
    soldVehicles.forEach(v => {
        if (v.customer?.saleDate) {
            const year = new Date(v.customer.saleDate).getFullYear();
            years.add(year);
        }
    });

    // Sort years in descending order
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    // Keep the current selection
    const currentValue = yearFilter.value;

    // Populate the filter
    yearFilter.innerHTML = '<option value="">All Years</option>' +
        sortedYears.map(year => `<option value="${year}">${year}</option>`).join('');

    // Restore selection if it still exists
    if (currentValue && sortedYears.includes(parseInt(currentValue))) {
        yearFilter.value = currentValue;
    }
}

function renderPaymentAnalytics() {
    const container = document.getElementById('paymentAnalytics');
    if (!container) return;

    // Get all payments with sale data
    const allPayments = soldVehicles.filter(v =>
        v.customer?.saleDate && v.customer?.saleAmount
    );

    if (allPayments.length === 0) {
        container.innerHTML = '';
        return;
    }

    // Get current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Calculate current month stats
    const currentMonthPayments = allPayments.filter(v => {
        const saleDate = new Date(v.customer.saleDate);
        return saleDate.getFullYear() === currentYear && saleDate.getMonth() === currentMonth;
    });
    const currentMonthTotal = currentMonthPayments.reduce((sum, v) => sum + (parseFloat(v.customer.saleAmount) || 0), 0);
    const currentMonthCount = currentMonthPayments.length;

    // Calculate previous month stats
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthPayments = allPayments.filter(v => {
        const saleDate = new Date(v.customer.saleDate);
        return saleDate.getFullYear() === prevMonthYear && saleDate.getMonth() === prevMonth;
    });
    const prevMonthTotal = prevMonthPayments.reduce((sum, v) => sum + (parseFloat(v.customer.saleAmount) || 0), 0);
    const prevMonthCount = prevMonthPayments.length;

    // Calculate MoM percentage change
    const momRevenue = prevMonthTotal > 0 ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal * 100) : 0;
    const momCount = prevMonthCount > 0 ? ((currentMonthCount - prevMonthCount) / prevMonthCount * 100) : 0;

    // Calculate current year stats
    const currentYearPayments = allPayments.filter(v => {
        const saleDate = new Date(v.customer.saleDate);
        return saleDate.getFullYear() === currentYear;
    });
    const currentYearTotal = currentYearPayments.reduce((sum, v) => sum + (parseFloat(v.customer.saleAmount) || 0), 0);
    const currentYearCount = currentYearPayments.length;

    // Calculate previous year stats
    const prevYearPayments = allPayments.filter(v => {
        const saleDate = new Date(v.customer.saleDate);
        return saleDate.getFullYear() === currentYear - 1;
    });
    const prevYearTotal = prevYearPayments.reduce((sum, v) => sum + (parseFloat(v.customer.saleAmount) || 0), 0);
    const prevYearCount = prevYearPayments.length;

    // Calculate YoY percentage change
    const yoyRevenue = prevYearTotal > 0 ? ((currentYearTotal - prevYearTotal) / prevYearTotal * 100) : 0;
    const yoyCount = prevYearCount > 0 ? ((currentYearCount - prevYearCount) / prevYearCount * 100) : 0;

    // Month names
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Render analytics cards
    container.innerHTML = `
        <!-- Current Month Card -->
        <div style="background: rgba(51, 65, 85, 0.6); border: 1px solid var(--joy-divider); border-radius: var(--joy-radius-md); padding: 1.5rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <h3 style="font-size: 0.875rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
                    ${monthNames[currentMonth]} ${currentYear}
                </h3>
                <span style="font-size: 1.5rem;">📅</span>
            </div>
            <div style="font-size: 2rem; font-weight: 700; color: var(--joy-text-primary); margin-bottom: 0.5rem; font-family: monospace;">
                $${currentMonthTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style="font-size: 0.875rem; color: var(--joy-text-secondary); margin-bottom: 1rem;">
                ${currentMonthCount} payment${currentMonthCount !== 1 ? 's' : ''}
            </div>
            <div style="display: flex; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--joy-divider);">
                <div style="flex: 1;">
                    <div style="font-size: 0.75rem; color: var(--joy-text-secondary); margin-bottom: 0.25rem;">MoM Revenue</div>
                    <div style="font-size: 1.125rem; font-weight: 700; color: ${momRevenue >= 0 ? 'var(--joy-success-500)' : 'var(--joy-danger-500)'};">
                        ${momRevenue >= 0 ? '↑' : '↓'} ${Math.abs(momRevenue).toFixed(1)}%
                    </div>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 0.75rem; color: var(--joy-text-secondary); margin-bottom: 0.25rem;">MoM Count</div>
                    <div style="font-size: 1.125rem; font-weight: 700; color: ${momCount >= 0 ? 'var(--joy-success-500)' : 'var(--joy-danger-500)'};">
                        ${momCount >= 0 ? '↑' : '↓'} ${Math.abs(momCount).toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>

        <!-- Previous Month Card -->
        <div style="background: rgba(51, 65, 85, 0.6); border: 1px solid var(--joy-divider); border-radius: var(--joy-radius-md); padding: 1.5rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <h3 style="font-size: 0.875rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
                    ${monthNames[prevMonth]} ${prevMonthYear}
                </h3>
                <span style="font-size: 1.5rem;">📆</span>
            </div>
            <div style="font-size: 2rem; font-weight: 700; color: var(--joy-text-primary); margin-bottom: 0.5rem; font-family: monospace;">
                $${prevMonthTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style="font-size: 0.875rem; color: var(--joy-text-secondary);">
                ${prevMonthCount} payment${prevMonthCount !== 1 ? 's' : ''}
            </div>
        </div>

        <!-- Current Year Card -->
        <div style="background: rgba(51, 65, 85, 0.6); border: 1px solid var(--joy-divider); border-radius: var(--joy-radius-md); padding: 1.5rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <h3 style="font-size: 0.875rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
                    ${currentYear} YTD
                </h3>
                <span style="font-size: 1.5rem;">📊</span>
            </div>
            <div style="font-size: 2rem; font-weight: 700; color: var(--joy-text-primary); margin-bottom: 0.5rem; font-family: monospace;">
                $${currentYearTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style="font-size: 0.875rem; color: var(--joy-text-secondary); margin-bottom: 1rem;">
                ${currentYearCount} payment${currentYearCount !== 1 ? 's' : ''}
            </div>
            <div style="display: flex; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--joy-divider);">
                <div style="flex: 1;">
                    <div style="font-size: 0.75rem; color: var(--joy-text-secondary); margin-bottom: 0.25rem;">YoY Revenue</div>
                    <div style="font-size: 1.125rem; font-weight: 700; color: ${yoyRevenue >= 0 ? 'var(--joy-success-500)' : 'var(--joy-danger-500)'};">
                        ${yoyRevenue >= 0 ? '↑' : '↓'} ${Math.abs(yoyRevenue).toFixed(1)}%
                    </div>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 0.75rem; color: var(--joy-text-secondary); margin-bottom: 0.25rem;">YoY Count</div>
                    <div style="font-size: 1.125rem; font-weight: 700; color: ${yoyCount >= 0 ? 'var(--joy-success-500)' : 'var(--joy-danger-500)'};">
                        ${yoyCount >= 0 ? '↑' : '↓'} ${Math.abs(yoyCount).toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>

        <!-- Previous Year Card -->
        <div style="background: rgba(51, 65, 85, 0.6); border: 1px solid var(--joy-divider); border-radius: var(--joy-radius-md); padding: 1.5rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <h3 style="font-size: 0.875rem; font-weight: 600; color: var(--joy-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
                    ${currentYear - 1} Total
                </h3>
                <span style="font-size: 1.5rem;">📈</span>
            </div>
            <div style="font-size: 2rem; font-weight: 700; color: var(--joy-text-primary); margin-bottom: 0.5rem; font-family: monospace;">
                $${prevYearTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style="font-size: 0.875rem; color: var(--joy-text-secondary);">
                ${prevYearCount} payment${prevYearCount !== 1 ? 's' : ''}
            </div>
        </div>
    `;
}

function exportPayments() {
    // Get the currently filtered payments
    let filtered = soldVehicles.filter(v =>
        v.customer &&
        v.customer.saleDate &&
        (v.customer.paymentMethod || v.customer.paymentReference || v.customer.saleAmount)
    );

    // Apply same filters as renderPaymentsPage
    const monthFilter = document.getElementById('paymentMonthFilter')?.value;
    const yearFilter = document.getElementById('paymentYearFilter')?.value;
    const methodFilter = document.getElementById('paymentMethodFilter')?.value;
    const searchTerm = document.getElementById('paymentSearchInput')?.value.toLowerCase() || '';

    // Filter by month/year
    if (monthFilter || yearFilter) {
        filtered = filtered.filter(v => {
            const saleDate = new Date(v.customer.saleDate);
            if (yearFilter && saleDate.getFullYear().toString() !== yearFilter) return false;
            if (monthFilter && (saleDate.getMonth() + 1).toString() !== monthFilter) return false;
            return true;
        });
    }

    // Filter by payment method
    if (methodFilter) {
        filtered = filtered.filter(v => v.customer.paymentMethod === methodFilter);
    }

    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(v => {
            return v.stockNumber.toLowerCase().includes(searchTerm) ||
                v.vin.toLowerCase().includes(searchTerm) ||
                `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(searchTerm) ||
                (v.customer?.firstName || '').toLowerCase().includes(searchTerm) ||
                (v.customer?.lastName || '').toLowerCase().includes(searchTerm) ||
                (v.customer?.paymentReference || '').toLowerCase().includes(searchTerm);
        });
    }

    // Sort by sale date - newest first
    filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.customer.saleDate);
        const dateB = new Date(b.customer.saleDate);
        return dateB - dateA;
    });

    if (filtered.length === 0) {
        showNotification('No payments to export', 'warning');
        return;
    }

    // Create CSV content
    const headers = ['Stock #', 'Year', 'Make', 'Model', 'VIN', 'Customer Name', 'Sale Date', 'Sale Amount', 'Payment Method', 'Payment Reference'];

    const rows = filtered.map(v => {
        const customerName = `${v.customer.firstName || ''} ${v.customer.lastName || ''}`.trim();
        const saleDate = v.customer.saleDate ? new Date(v.customer.saleDate).toLocaleDateString() : '';
        const saleAmount = v.customer.saleAmount ? `$${parseFloat(v.customer.saleAmount).toFixed(2)}` : '';

        return [
            v.stockNumber,
            v.year,
            v.make,
            v.model,
            v.vin,
            customerName,
            saleDate,
            saleAmount,
            v.customer.paymentMethod || '',
            v.customer.paymentReference || ''
        ].map(field => `"${field}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    // Create filename with filter info
    let filename = 'payments';
    if (yearFilter && monthFilter) {
        const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        filename += `-${monthNames[parseInt(monthFilter)]}-${yearFilter}`;
    } else if (yearFilter) {
        filename += `-${yearFilter}`;
    } else if (monthFilter) {
        const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        filename += `-${monthNames[parseInt(monthFilter)]}`;
    }
    filename += '.csv';

    // Download the file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification(`Exported ${filtered.length} payment${filtered.length !== 1 ? 's' : ''}`, 'success');
}

// ==================== UTILITY FUNCTIONS ====================

// Utility function to fix in-stock dates for all in-transit vehicles
// Can be called from browser console or triggered by a button
async function fixInTransitDates() {
    const confirmed = await showConfirmation(
        'This will clear the in-stock date for ALL vehicles currently in "In-Transit" status. Continue?'
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE}/inventory/fix-intransit-dates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fix in-transit dates');
        }

        const result = await response.json();
        showNotification(result.message || 'Successfully fixed in-transit dates!', 'success');

        // Reload data to reflect changes
        await loadAllData();
        updateDashboard();
        renderCurrentPage();

    } catch (error) {
        console.error('Error fixing in-transit dates:', error);
        showNotification('Failed to fix in-transit dates: ' + error.message, 'error');
    }
}

// Make function available globally for console access
window.fixInTransitDates = fixInTransitDates;

// Batch clear in-stock dates for recently added vehicles
async function batchClearInStockDates() {
    const count = prompt('How many recently added vehicles should have their in-stock dates cleared?');

    if (!count || isNaN(count) || parseInt(count) <= 0) {
        showNotification('Please enter a valid number', 'error');
        return;
    }

    const numVehicles = parseInt(count);

    const confirmed = await showConfirmation(
        `This will clear the in-stock date for the last ${numVehicles} vehicle(s) added. Continue?`
    );

    if (!confirmed) return;

    try {
        // Get the most recently added vehicles
        const sortedVehicles = [...vehicles].sort((a, b) => {
            return new Date(b.dateAdded) - new Date(a.dateAdded);
        });

        const vehiclesToUpdate = sortedVehicles.slice(0, numVehicles);

        if (vehiclesToUpdate.length === 0) {
            showNotification('No vehicles found to update', 'warning');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        // Update each vehicle
        for (const vehicle of vehiclesToUpdate) {
            const updatedVehicle = { ...vehicle, inStockDate: null };

            try {
                const response = await fetch(`${API_BASE}/inventory/${vehicle.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(updatedVehicle)
                });

                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error('Error updating vehicle:', vehicle.stockNumber, error);
                errorCount++;
            }
        }

        // Reload data
        await loadAllData();
        updateDashboard();
        renderCurrentPage();

        if (errorCount === 0) {
            showNotification(`Successfully cleared in-stock dates for ${successCount} vehicle(s)`, 'success');
        } else {
            showNotification(`Updated ${successCount} vehicle(s), ${errorCount} error(s)`, 'warning');
        }

    } catch (error) {
        console.error('Error in batch update:', error);
        showNotification('Failed to clear in-stock dates: ' + error.message, 'error');
    }
}

// Make function available globally for console access
window.batchClearInStockDates = batchClearInStockDates;

// ==================== EXPORT FUNCTIONS ====================

let exportData = {
    items: [],
    type: '',
    selectedIds: new Set()
};

function exportInventory() {
    // Filter vehicles same as renderInventoryPage
    const nonTransitVehicles = vehicles.filter(v => v.status !== 'in-transit');
    const filtered = filterVehicles(nonTransitVehicles);

    if (filtered.length === 0) {
        showNotification('No vehicles to export', 'warning');
        return;
    }

    exportData.items = filtered;
    exportData.type = 'inventory';
    exportData.selectedIds.clear();

    openExportModal('Inventory');
}

function exportTradeIns() {
    if (tradeIns.length === 0) {
        showNotification('No trade-ins to export', 'warning');
        return;
    }

    exportData.items = tradeIns;
    exportData.type = 'tradeins';
    exportData.selectedIds.clear();

    openExportModal('Trade-Ins');
}

function exportInTransit() {
    const filtered = vehicles.filter(v => v.status === 'in-transit');

    if (filtered.length === 0) {
        showNotification('No in-transit vehicles to export', 'warning');
        return;
    }

    exportData.items = filtered;
    exportData.type = 'in-transit';
    exportData.selectedIds.clear();

    openExportModal('In-Transit Vehicles');
}

function exportPDI() {
    const filtered = vehicles.filter(v => v.status === 'pdi');

    if (filtered.length === 0) {
        showNotification('No PDI vehicles to export', 'warning');
        return;
    }

    exportData.items = filtered;
    exportData.type = 'pdi';
    exportData.selectedIds.clear();

    openExportModal('PDI Vehicles');
}

function exportPendingPickup() {
    const filtered = vehicles.filter(v => v.status === 'pending-pickup');

    if (filtered.length === 0) {
        showNotification('No pending pickup vehicles to export', 'warning');
        return;
    }

    exportData.items = filtered;
    exportData.type = 'pending-pickup';
    exportData.selectedIds.clear();

    openExportModal('Pending Pickup Vehicles');
}

function exportPickupScheduled() {
    const filtered = vehicles.filter(v => v.status === 'pickup-scheduled');

    if (filtered.length === 0) {
        showNotification('No pickup scheduled vehicles to export', 'warning');
        return;
    }

    exportData.items = filtered;
    exportData.type = 'pickup-scheduled';
    exportData.selectedIds.clear();

    openExportModal('Pickup Scheduled Vehicles');
}

function exportSold() {
    // Get the currently filtered vehicles
    let filtered = soldVehicles;

    // Apply same filters as renderSoldPage
    const startDate = document.getElementById('soldStartDateFilter')?.value;
    const endDate = document.getElementById('soldEndDateFilter')?.value;
    const monthFilter = document.getElementById('soldMonthFilter')?.value;
    const yearFilter = document.getElementById('soldYearFilter')?.value;

    // Date range filter takes priority over month/year
    if (startDate || endDate) {
        filtered = filtered.filter(v => {
            if (!v.customer?.saleDate) return false;
            const saleDate = new Date(v.customer.saleDate);
            saleDate.setHours(0, 0, 0, 0);

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (saleDate < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (saleDate > end) return false;
            }
            return true;
        });
    } else if (monthFilter || yearFilter) {
        filtered = filtered.filter(v => {
            if (!v.customer?.saleDate) return false;
            const saleDate = new Date(v.customer.saleDate);
            if (yearFilter && saleDate.getFullYear().toString() !== yearFilter) return false;
            if (monthFilter && (saleDate.getMonth() + 1).toString() !== monthFilter) return false;
            return true;
        });
    }

    const searchTerm = document.getElementById('soldSearchInput')?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(v => {
            return v.stockNumber.toLowerCase().includes(searchTerm) ||
                v.vin.toLowerCase().includes(searchTerm) ||
                `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(searchTerm) ||
                (v.customer?.firstName || '').toLowerCase().includes(searchTerm) ||
                (v.customer?.lastName || '').toLowerCase().includes(searchTerm);
        });
    }

    const makeFilter = document.getElementById('soldMakeFilter')?.value;
    if (makeFilter) {
        filtered = filtered.filter(v => v.make === makeFilter);
    }

    // Sort by sale date - most recent first (same as renderSoldPage)
    filtered = filtered.sort((a, b) => {
        const dateA = a.customer?.saleDate ? new Date(a.customer.saleDate) : new Date(0);
        const dateB = b.customer?.saleDate ? new Date(b.customer.saleDate) : new Date(0);
        return dateB - dateA; // Most recent first
    });

    if (filtered.length === 0) {
        showNotification('No sold vehicles to export', 'warning');
        return;
    }

    exportData.items = filtered;
    exportData.type = 'sold';
    exportData.selectedIds.clear();

    openExportModal('Sold Vehicles');
}

function openExportModal(category) {
    const modal = document.getElementById('exportModal');
    const title = document.getElementById('exportModalTitle');
    const itemsList = document.getElementById('exportItemsList');
    const itemCount = document.getElementById('exportItemCount');

    title.textContent = `Export ${category}`;
    itemCount.textContent = exportData.items.length;

    // Populate items list
    itemsList.innerHTML = exportData.items.map((item, index) => {
        const itemId = item.id;
        const displayText = exportData.type === 'tradeins'
            ? `${item.stockNumber} - ${item.year} ${item.make} ${item.model} (${item.vin})`
            : `${item.stockNumber} - ${item.year} ${item.make} ${item.model} - ${item.status}`;

        return `
            <div style="padding: 0.5rem; border-bottom: 1px solid var(--joy-divider); display: flex; align-items: center;">
                <label style="display: flex; align-items: center; cursor: pointer; width: 100%;">
                    <input type="checkbox"
                           class="export-item-checkbox"
                           data-item-id="${itemId}"
                           onchange="toggleExportItem(${itemId})"
                           style="margin-right: 0.75rem;">
                    <span style="font-size: 0.875rem; color: var(--joy-text-secondary);">${displayText}</span>
                </label>
            </div>
        `;
    }).join('');

    modal.style.display = 'flex';
}

function closeExportModal() {
    const modal = document.getElementById('exportModal');
    modal.style.display = 'none';
    exportData.selectedIds.clear();
}

function toggleExportItem(itemId) {
    if (exportData.selectedIds.has(itemId)) {
        exportData.selectedIds.delete(itemId);
    } else {
        exportData.selectedIds.add(itemId);
    }
    updateSelectAllCheckbox();
}

function toggleSelectAllExport() {
    const selectAllCheckbox = document.getElementById('selectAllExport');
    const checkboxes = document.querySelectorAll('.export-item-checkbox');

    if (selectAllCheckbox.checked) {
        checkboxes.forEach(cb => {
            cb.checked = true;
            exportData.selectedIds.add(parseInt(cb.dataset.itemId));
        });
    } else {
        checkboxes.forEach(cb => {
            cb.checked = false;
        });
        exportData.selectedIds.clear();
    }
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllExport');
    const checkboxes = document.querySelectorAll('.export-item-checkbox');
    const checkedCount = document.querySelectorAll('.export-item-checkbox:checked').length;

    selectAllCheckbox.checked = checkedCount === checkboxes.length && checkboxes.length > 0;
    selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
}

function exportSelected(format) {
    if (exportData.selectedIds.size === 0) {
        showNotification('Please select at least one item to export', 'warning');
        return;
    }

    // Filter selected items
    const selectedItems = exportData.items.filter(item => exportData.selectedIds.has(item.id));

    if (format === 'csv') {
        exportToCSV(selectedItems);
    } else if (format === 'xlsx') {
        exportToExcel(selectedItems);
    }

    closeExportModal();
}

function exportToCSV(items) {
    let headers, rows, filename;

    if (exportData.type === 'inventory' || exportData.type === 'in-transit' || exportData.type === 'pdi' ||
        exportData.type === 'pending-pickup' || exportData.type === 'pickup-scheduled') {
        headers = ['Stock #', 'Year', 'Make', 'Model', 'Trim', 'VIN', 'Color', 'Fleet Company', 'Operation Company', 'Customer Name', 'Status', 'In Stock Date'];

        rows = items.map(v => {
            const customerName = v.customer ? `${v.customer.firstName || ''} ${v.customer.lastName || ''}`.trim() : '';
            const inStockDate = v.inStockDate ? new Date(v.inStockDate).toLocaleDateString() : '';

            return [
                v.stockNumber,
                v.year,
                v.make,
                v.model,
                v.trim,
                v.vin,
                v.color,
                v.fleetCompany || '',
                v.operationCompany || '',
                customerName,
                v.status,
                inStockDate
            ].map(field => `"${field}"`).join(',');
        });

        filename = `${exportData.type}-export-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (exportData.type === 'sold') {
        headers = ['Stock #', 'Year', 'Make', 'Model', 'Trim', 'VIN', 'Color', 'Fleet Company', 'Operation Company', 'Customer Name', 'Sale Date', 'Sale Amount', 'Payment Method', 'Payment Reference'];

        rows = items.map(v => {
            const customerName = v.customer ? `${v.customer.firstName || ''} ${v.customer.lastName || ''}`.trim() : '';
            const soldDate = v.customer?.saleDate ? new Date(v.customer.saleDate).toLocaleDateString() : '';
            const saleAmount = v.customer?.saleAmount ? `$${v.customer.saleAmount.toFixed(2)}` : '';

            return [
                v.stockNumber,
                v.year,
                v.make,
                v.model,
                v.trim,
                v.vin,
                v.color,
                v.fleetCompany || '',
                v.operationCompany || '',
                customerName,
                soldDate,
                saleAmount,
                v.customer?.paymentMethod || '',
                v.customer?.paymentReference || ''
            ].map(field => `"${field}"`).join(',');
        });

        filename = `sold-vehicles-export-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (exportData.type === 'tradeins') {
        headers = ['Stock #', 'Year', 'Make', 'Model', 'VIN', 'Color', 'Mileage', 'Condition', 'Picked Up', 'Pickup Date'];

        rows = items.map(t => {
            const pickupDate = t.pickupDate ? new Date(t.pickupDate).toLocaleDateString() : '';

            return [
                t.stockNumber,
                t.year,
                t.make,
                t.model,
                t.vin,
                t.color,
                t.mileage || '',
                t.condition || '',
                t.pickedUp ? 'Yes' : 'No',
                pickupDate
            ].map(field => `"${field}"`).join(',');
        });

        filename = `tradeins-export-${new Date().toISOString().split('T')[0]}.csv`;
    }

    const csv = [headers.join(','), ...rows].join('\n');

    // Download the file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification(`Exported ${items.length} item${items.length !== 1 ? 's' : ''} to ${filename}`, 'success');
}

function exportToExcel(items) {
    let worksheetData, filename, sheetName;

    if (exportData.type === 'inventory' || exportData.type === 'in-transit' || exportData.type === 'pdi' ||
        exportData.type === 'pending-pickup' || exportData.type === 'pickup-scheduled') {
        worksheetData = items.map(v => {
            const customerName = v.customer ? `${v.customer.firstName || ''} ${v.customer.lastName || ''}`.trim() : '';
            const inStockDate = v.inStockDate ? new Date(v.inStockDate).toLocaleDateString() : '';

            return {
                'Stock #': v.stockNumber,
                'Year': v.year,
                'Make': v.make,
                'Model': v.model,
                'Trim': v.trim,
                'VIN': v.vin,
                'Color': v.color,
                'Fleet Company': v.fleetCompany || '',
                'Operation Company': v.operationCompany || '',
                'Customer Name': customerName,
                'Status': v.status,
                'In Stock Date': inStockDate
            };
        });

        filename = `${exportData.type}-export-${new Date().toISOString().split('T')[0]}.xlsx`;
        sheetName = exportData.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    } else if (exportData.type === 'sold') {
        worksheetData = items.map(v => {
            const customerName = v.customer ? `${v.customer.firstName || ''} ${v.customer.lastName || ''}`.trim() : '';
            const soldDate = v.customer?.saleDate ? new Date(v.customer.saleDate).toLocaleDateString() : '';
            const saleAmount = v.customer?.saleAmount ? v.customer.saleAmount : '';

            return {
                'Stock #': v.stockNumber,
                'Year': v.year,
                'Make': v.make,
                'Model': v.model,
                'Trim': v.trim,
                'VIN': v.vin,
                'Color': v.color,
                'Fleet Company': v.fleetCompany || '',
                'Operation Company': v.operationCompany || '',
                'Customer Name': customerName,
                'Sale Date': soldDate,
                'Sale Amount': saleAmount,
                'Payment Method': v.customer?.paymentMethod || '',
                'Payment Reference': v.customer?.paymentReference || ''
            };
        });

        filename = `sold-vehicles-export-${new Date().toISOString().split('T')[0]}.xlsx`;
        sheetName = 'Sold Vehicles';
    } else if (exportData.type === 'tradeins') {
        worksheetData = items.map(t => {
            const pickupDate = t.pickupDate ? new Date(t.pickupDate).toLocaleDateString() : '';

            return {
                'Stock #': t.stockNumber,
                'Year': t.year,
                'Make': t.make,
                'Model': t.model,
                'VIN': t.vin,
                'Color': t.color,
                'Mileage': t.mileage || '',
                'Condition': t.condition || '',
                'Picked Up': t.pickedUp ? 'Yes' : 'No',
                'Pickup Date': pickupDate
            };
        });

        filename = `tradeins-export-${new Date().toISOString().split('T')[0]}.xlsx`;
        sheetName = 'Trade-Ins';
    }

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Auto-size columns
    const cols = [];
    const headers = Object.keys(worksheetData[0] || {});
    headers.forEach(header => {
        const maxLength = Math.max(
            header.length,
            ...worksheetData.map(row => String(row[header] || '').length)
        );
        cols.push({ wch: Math.min(maxLength + 2, 50) });
    });
    worksheet['!cols'] = cols;

    // Download the file
    XLSX.writeFile(workbook, filename);

    showNotification(`Exported ${items.length} item${items.length !== 1 ? 's' : ''} to ${filename}`, 'success');
}
