/**
 * Export utilities for generating CSV and Excel files
 */

/**
 * Convert array of objects to CSV string
 */
export function toCSV(data, columns) {
    const headers = columns.map(c => c.label).join(',');
    const rows = data.map(item =>
        columns.map(c => {
            let value = c.getValue ? c.getValue(item) : item[c.key];
            if (value === null || value === undefined) value = '';
            // Escape quotes and wrap in quotes if contains comma
            value = String(value).replace(/"/g, '""');
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                value = `"${value}"`;
            }
            return value;
        }).join(',')
    );
    return [headers, ...rows].join('\n');
}

/**
 * Download data as CSV file
 */
export function downloadCSV(data, columns, filename) {
    const csv = toCSV(data, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Convert array of objects to Excel XML format (simple implementation)
 */
export function toExcelXML(data, columns, sheetName = 'Sheet1') {
    const header = columns.map(c =>
        `<Cell><Data ss:Type="String">${escapeXML(c.label)}</Data></Cell>`
    ).join('');

    const rows = data.map(item => {
        const cells = columns.map(c => {
            let value = c.getValue ? c.getValue(item) : item[c.key];
            if (value === null || value === undefined) value = '';
            const type = typeof value === 'number' ? 'Number' : 'String';
            return `<Cell><Data ss:Type="${type}">${escapeXML(String(value))}</Data></Cell>`;
        }).join('');
        return `<Row>${cells}</Row>`;
    }).join('');

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header"><Font ss:Bold="1"/></Style>
 </Styles>
 <Worksheet ss:Name="${escapeXML(sheetName)}">
  <Table>
   <Row ss:StyleID="header">${header}</Row>
   ${rows}
  </Table>
 </Worksheet>
</Workbook>`;
}

/**
 * Download data as Excel file
 */
export function downloadExcel(data, columns, filename, sheetName = 'Sheet1') {
    const xml = toExcelXML(data, columns, sheetName);
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function escapeXML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Column definitions for different data types
export const INVENTORY_COLUMNS = [
    { key: 'stockNumber', label: 'Stock #' },
    { key: 'vin', label: 'VIN' },
    { key: 'year', label: 'Year' },
    { key: 'make', label: 'Make' },
    { key: 'model', label: 'Model' },
    { key: 'trim', label: 'Trim' },
    { key: 'color', label: 'Color' },
    { key: 'status', label: 'Status' },
    { key: 'fleetCompany', label: 'Fleet Company' },
    { key: 'operationCompany', label: 'Operation Company' },
];

export const SOLD_COLUMNS = [
    { key: 'soldDate', label: 'Sold Date', getValue: (v) => v.soldDate ? new Date(v.soldDate).toLocaleDateString() : '' },
    { key: 'stockNumber', label: 'Stock #' },
    { key: 'vin', label: 'VIN' },
    { key: 'year', label: 'Year' },
    { key: 'make', label: 'Make' },
    { key: 'model', label: 'Model' },
    { key: 'customerName', label: 'Customer' },
    { key: 'fleetCompany', label: 'Fleet Company' },
    { key: 'salePrice', label: 'Sale Price', getValue: (v) => v.salePrice ? `$${parseFloat(v.salePrice).toLocaleString()}` : '' },
];

export const TRADEIN_COLUMNS = [
    { key: 'vin', label: 'VIN' },
    { key: 'year', label: 'Year' },
    { key: 'make', label: 'Make' },
    { key: 'model', label: 'Model' },
    { key: 'mileage', label: 'Mileage', getValue: (v) => v.mileage?.toLocaleString() || '' },
    { key: 'tradeValue', label: 'Trade Value', getValue: (v) => v.tradeValue ? `$${parseFloat(v.tradeValue).toLocaleString()}` : '' },
    { key: 'pickedUp', label: 'Status', getValue: (v) => v.pickedUp ? 'Picked Up' : 'Pending' },
    { key: 'associatedDeal', label: 'Associated Deal' },
];
