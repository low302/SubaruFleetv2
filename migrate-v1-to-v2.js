#!/usr/bin/env node
/**
 * SubaruFleetInventory Migration Script
 * 
 * Migrates data from v1 to v2 SQLite databases.
 * 
 * Usage:
 *   node migrate-v1-to-v2.js --v1-db <path> --v2-db <path> [options]
 * 
 * Options:
 *   --v1-db <path>       Path to v1 SQLite database (required)
 *   --v2-db <path>       Path to v2 SQLite database (required)
 *   --v1-docs <path>     Path to v1 documents folder (optional)
 *   --v2-docs <path>     Path to v2 documents folder (optional)
 *   --dry-run            Preview changes without modifying v2 database
 *   --duplicates <mode>  How to handle duplicates: 'skip' (default) or 'overwrite'
 *   --help               Show this help message
 * 
 * Example:
 *   node migrate-v1-to-v2.js \
 *     --v1-db /app/v1/data/fleet-inventory.db \
 *     --v2-db /app/v2/data/fleet-inventory.db \
 *     --v1-docs /app/v1/data/documents \
 *     --v2-docs /app/v2/data/documents \
 *     --dry-run
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        v1Db: null,
        v2Db: null,
        v1Docs: null,
        v2Docs: null,
        dryRun: false,
        duplicates: 'skip'
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--v1-db':
                config.v1Db = args[++i];
                break;
            case '--v2-db':
                config.v2Db = args[++i];
                break;
            case '--v1-docs':
                config.v1Docs = args[++i];
                break;
            case '--v2-docs':
                config.v2Docs = args[++i];
                break;
            case '--dry-run':
                config.dryRun = true;
                break;
            case '--duplicates':
                config.duplicates = args[++i];
                if (!['skip', 'overwrite'].includes(config.duplicates)) {
                    console.error('Error: --duplicates must be "skip" or "overwrite"');
                    process.exit(1);
                }
                break;
            case '--help':
                showHelp();
                process.exit(0);
        }
    }

    return config;
}

function showHelp() {
    console.log(`
SubaruFleetInventory Migration Script
=====================================

Migrates data from v1 to v2 SQLite databases.

Usage:
  node migrate-v1-to-v2.js --v1-db <path> --v2-db <path> [options]

Options:
  --v1-db <path>       Path to v1 SQLite database (required)
  --v2-db <path>       Path to v2 SQLite database (required)
  --v1-docs <path>     Path to v1 documents folder (optional)
  --v2-docs <path>     Path to v2 documents folder (optional)
  --dry-run            Preview changes without modifying v2 database
  --duplicates <mode>  How to handle duplicates: 'skip' (default) or 'overwrite'
  --help               Show this help message

Example:
  node migrate-v1-to-v2.js \\
    --v1-db /path/to/v1/data/fleet-inventory.db \\
    --v2-db /path/to/v2/data/fleet-inventory.db \\
    --v1-docs /path/to/v1/data/documents \\
    --v2-docs /path/to/v2/data/documents

Docker Example:
  # Stop both containers first, then run on the host:
  node migrate-v1-to-v2.js \\
    --v1-db ./v1-data/fleet-inventory.db \\
    --v2-db ./v2-data/fleet-inventory.db
`);
}

// Database helper functions
function openDatabase(dbPath, mode = sqlite3.OPEN_READONLY) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, mode, (err) => {
            if (err) reject(err);
            else resolve(db);
        });
    });
}

function closeDatabase(db) {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

// Migration results tracking
const results = {
    tradeIns: { read: 0, imported: 0, skipped: 0, errors: [] },
    inventory: { read: 0, imported: 0, skipped: 0, errors: [] },
    soldVehicles: { read: 0, imported: 0, skipped: 0, errors: [] },
    documents: { read: 0, imported: 0, skipped: 0, copied: 0, errors: [] }
};

// Check if VIN exists in a table
async function vinExists(db, table, vin) {
    const row = await dbGet(db, `SELECT id FROM ${table} WHERE vin = ?`, [vin]);
    return !!row;
}

// Check if document exists
async function documentExists(db, id) {
    const row = await dbGet(db, `SELECT id FROM documents WHERE id = ?`, [id]);
    return !!row;
}

// Delete by VIN
async function deleteByVin(db, table, vin, dryRun) {
    if (dryRun) return;
    await dbRun(db, `DELETE FROM ${table} WHERE vin = ?`, [vin]);
}

// Delete document by ID
async function deleteDocumentById(db, id, dryRun) {
    if (dryRun) return;
    await dbRun(db, `DELETE FROM documents WHERE id = ?`, [id]);
}

// Migrate trade-ins
async function migrateTradeIns(v1Db, v2Db, config) {
    console.log('\n📦 Migrating Trade-Ins...');

    const tradeIns = await dbAll(v1Db, 'SELECT * FROM trade_ins');
    results.tradeIns.read = tradeIns.length;
    console.log(`   Found ${tradeIns.length} trade-ins in v1`);

    for (const tradeIn of tradeIns) {
        try {
            const exists = await vinExists(v2Db, 'trade_ins', tradeIn.vin);

            if (exists) {
                if (config.duplicates === 'skip') {
                    results.tradeIns.skipped++;
                    continue;
                } else {
                    await deleteByVin(v2Db, 'trade_ins', tradeIn.vin, config.dryRun);
                }
            }

            if (!config.dryRun) {
                await dbRun(v2Db, `
                    INSERT INTO trade_ins 
                    (id, stockNumber, vin, year, make, model, trim, color, mileage, notes, pickedUp, pickedUpDate, dateAdded, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    tradeIn.id,
                    tradeIn.stockNumber || null,
                    tradeIn.vin,
                    tradeIn.year,
                    tradeIn.make,
                    tradeIn.model,
                    tradeIn.trim || '',
                    tradeIn.color,
                    tradeIn.mileage || null,
                    tradeIn.notes || '',
                    tradeIn.pickedUp || 0,
                    tradeIn.pickedUpDate || null,
                    tradeIn.dateAdded || new Date().toISOString(),
                    tradeIn.created_at || new Date().toISOString(),
                    tradeIn.updated_at || new Date().toISOString()
                ]);
            }
            results.tradeIns.imported++;
        } catch (err) {
            results.tradeIns.errors.push({ vin: tradeIn.vin, error: err.message });
        }
    }

    console.log(`   ✅ Imported: ${results.tradeIns.imported}, Skipped: ${results.tradeIns.skipped}, Errors: ${results.tradeIns.errors.length}`);
}

// Migrate inventory
async function migrateInventory(v1Db, v2Db, config) {
    console.log('\n🚗 Migrating Inventory...');

    const vehicles = await dbAll(v1Db, 'SELECT * FROM inventory');
    results.inventory.read = vehicles.length;
    console.log(`   Found ${vehicles.length} vehicles in v1 inventory`);

    for (const vehicle of vehicles) {
        try {
            const exists = await vinExists(v2Db, 'inventory', vehicle.vin);

            if (exists) {
                if (config.duplicates === 'skip') {
                    results.inventory.skipped++;
                    continue;
                } else {
                    await deleteByVin(v2Db, 'inventory', vehicle.vin, config.dryRun);
                }
            }

            if (!config.dryRun) {
                await dbRun(v2Db, `
                    INSERT INTO inventory 
                    (id, stockNumber, vin, year, make, model, trim, color, fleetCompany, operationCompany, 
                     status, dateAdded, inStockDate, customer, documents, pickupDate, pickupTime, 
                     pickupNotes, tradeInId, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    vehicle.id,
                    vehicle.stockNumber,
                    vehicle.vin,
                    vehicle.year,
                    vehicle.make,
                    vehicle.model,
                    vehicle.trim,
                    vehicle.color,
                    vehicle.fleetCompany || '',
                    vehicle.operationCompany || '',
                    vehicle.status,
                    vehicle.dateAdded,
                    vehicle.inStockDate || null,
                    vehicle.customer || null,
                    vehicle.documents || '[]',
                    vehicle.pickupDate || null,
                    vehicle.pickupTime || null,
                    vehicle.pickupNotes || null,
                    vehicle.tradeInId || null,
                    vehicle.created_at || new Date().toISOString(),
                    vehicle.updated_at || new Date().toISOString()
                ]);
            }
            results.inventory.imported++;
        } catch (err) {
            results.inventory.errors.push({ vin: vehicle.vin, error: err.message });
        }
    }

    console.log(`   ✅ Imported: ${results.inventory.imported}, Skipped: ${results.inventory.skipped}, Errors: ${results.inventory.errors.length}`);
}

// Migrate sold vehicles
async function migrateSoldVehicles(v1Db, v2Db, config) {
    console.log('\n💰 Migrating Sold Vehicles...');

    const vehicles = await dbAll(v1Db, 'SELECT * FROM sold_vehicles');
    results.soldVehicles.read = vehicles.length;
    console.log(`   Found ${vehicles.length} sold vehicles in v1`);

    for (const vehicle of vehicles) {
        try {
            const exists = await vinExists(v2Db, 'sold_vehicles', vehicle.vin);

            if (exists) {
                if (config.duplicates === 'skip') {
                    results.soldVehicles.skipped++;
                    continue;
                } else {
                    await deleteByVin(v2Db, 'sold_vehicles', vehicle.vin, config.dryRun);
                }
            }

            if (!config.dryRun) {
                await dbRun(v2Db, `
                    INSERT INTO sold_vehicles 
                    (id, stockNumber, vin, year, make, model, trim, color, fleetCompany, operationCompany,
                     status, dateAdded, inStockDate, customer, documents, tradeInId, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    vehicle.id,
                    vehicle.stockNumber,
                    vehicle.vin,
                    vehicle.year,
                    vehicle.make,
                    vehicle.model,
                    vehicle.trim,
                    vehicle.color,
                    vehicle.fleetCompany || '',
                    vehicle.operationCompany || '',
                    vehicle.status || 'sold',
                    vehicle.dateAdded,
                    vehicle.inStockDate || null,
                    vehicle.customer || null,
                    vehicle.documents || '[]',
                    vehicle.tradeInId || null,
                    vehicle.created_at || new Date().toISOString()
                ]);
            }
            results.soldVehicles.imported++;
        } catch (err) {
            results.soldVehicles.errors.push({ vin: vehicle.vin, error: err.message });
        }
    }

    console.log(`   ✅ Imported: ${results.soldVehicles.imported}, Skipped: ${results.soldVehicles.skipped}, Errors: ${results.soldVehicles.errors.length}`);
}

// Migrate documents
async function migrateDocuments(v1Db, v2Db, config) {
    console.log('\n📄 Migrating Documents...');

    const documents = await dbAll(v1Db, 'SELECT * FROM documents');
    results.documents.read = documents.length;
    console.log(`   Found ${documents.length} document records in v1`);

    for (const doc of documents) {
        try {
            const exists = await documentExists(v2Db, doc.id);

            if (exists) {
                if (config.duplicates === 'skip') {
                    results.documents.skipped++;
                    continue;
                } else {
                    await deleteDocumentById(v2Db, doc.id, config.dryRun);
                }
            }

            // Update file path for v2 if docs directories are provided
            let newFilePath = doc.filePath;
            if (config.v1Docs && config.v2Docs) {
                const fileName = path.basename(doc.filePath);
                newFilePath = path.join(config.v2Docs, fileName);

                // Copy file if it exists
                const v1FilePath = path.join(config.v1Docs, fileName);
                if (fs.existsSync(v1FilePath) && !config.dryRun) {
                    fs.copyFileSync(v1FilePath, newFilePath);
                    results.documents.copied++;
                }
            }

            if (!config.dryRun) {
                await dbRun(v2Db, `
                    INSERT INTO documents 
                    (id, vehicleId, fileName, filePath, fileSize, uploadDate, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    doc.id,
                    doc.vehicleId,
                    doc.fileName,
                    newFilePath,
                    doc.fileSize,
                    doc.uploadDate,
                    doc.created_at || new Date().toISOString()
                ]);
            }
            results.documents.imported++;
        } catch (err) {
            results.documents.errors.push({ id: doc.id, error: err.message });
        }
    }

    console.log(`   ✅ Imported: ${results.documents.imported}, Skipped: ${results.documents.skipped}, Files Copied: ${results.documents.copied}, Errors: ${results.documents.errors.length}`);
}

// Print final summary
function printSummary(config) {
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));

    if (config.dryRun) {
        console.log('⚠️  DRY RUN - No changes were made to the v2 database\n');
    }

    console.log('Trade-Ins:');
    console.log(`  Read from v1: ${results.tradeIns.read}`);
    console.log(`  Would import: ${results.tradeIns.imported}`);
    console.log(`  Skipped (duplicates): ${results.tradeIns.skipped}`);

    console.log('\nInventory:');
    console.log(`  Read from v1: ${results.inventory.read}`);
    console.log(`  Would import: ${results.inventory.imported}`);
    console.log(`  Skipped (duplicates): ${results.inventory.skipped}`);

    console.log('\nSold Vehicles:');
    console.log(`  Read from v1: ${results.soldVehicles.read}`);
    console.log(`  Would import: ${results.soldVehicles.imported}`);
    console.log(`  Skipped (duplicates): ${results.soldVehicles.skipped}`);

    console.log('\nDocuments:');
    console.log(`  Read from v1: ${results.documents.read}`);
    console.log(`  Would import: ${results.documents.imported}`);
    console.log(`  Skipped (duplicates): ${results.documents.skipped}`);
    if (config.v1Docs && config.v2Docs) {
        console.log(`  Files copied: ${results.documents.copied}`);
    }

    const totalRead = results.tradeIns.read + results.inventory.read + results.soldVehicles.read + results.documents.read;
    const totalImported = results.tradeIns.imported + results.inventory.imported + results.soldVehicles.imported + results.documents.imported;
    const totalSkipped = results.tradeIns.skipped + results.inventory.skipped + results.soldVehicles.skipped + results.documents.skipped;
    const totalErrors = results.tradeIns.errors.length + results.inventory.errors.length + results.soldVehicles.errors.length + results.documents.errors.length;

    console.log('\n' + '-'.repeat(60));
    console.log(`TOTALS: ${totalRead} read, ${totalImported} imported, ${totalSkipped} skipped, ${totalErrors} errors`);
    console.log('='.repeat(60));

    // Print errors if any
    if (totalErrors > 0) {
        console.log('\n⚠️  ERRORS:');
        for (const err of results.tradeIns.errors) {
            console.log(`  Trade-In VIN ${err.vin}: ${err.error}`);
        }
        for (const err of results.inventory.errors) {
            console.log(`  Inventory VIN ${err.vin}: ${err.error}`);
        }
        for (const err of results.soldVehicles.errors) {
            console.log(`  Sold Vehicle VIN ${err.vin}: ${err.error}`);
        }
        for (const err of results.documents.errors) {
            console.log(`  Document ID ${err.id}: ${err.error}`);
        }
    }

    if (!config.dryRun && totalImported > 0) {
        console.log('\n✅ Migration completed successfully!');
    } else if (config.dryRun) {
        console.log('\n💡 Run without --dry-run to perform the actual migration.');
    }
}

// Main function
async function main() {
    const config = parseArgs();

    // Validate required arguments
    if (!config.v1Db || !config.v2Db) {
        console.error('Error: --v1-db and --v2-db are required');
        console.log('Run with --help for usage information');
        process.exit(1);
    }

    // Check if database files exist
    if (!fs.existsSync(config.v1Db)) {
        console.error(`Error: v1 database not found: ${config.v1Db}`);
        process.exit(1);
    }

    if (!fs.existsSync(config.v2Db)) {
        console.error(`Error: v2 database not found: ${config.v2Db}`);
        process.exit(1);
    }

    console.log('='.repeat(60));
    console.log('SubaruFleetInventory Migration Script');
    console.log('='.repeat(60));
    console.log(`v1 Database: ${config.v1Db}`);
    console.log(`v2 Database: ${config.v2Db}`);
    if (config.v1Docs) console.log(`v1 Documents: ${config.v1Docs}`);
    if (config.v2Docs) console.log(`v2 Documents: ${config.v2Docs}`);
    console.log(`Duplicate handling: ${config.duplicates}`);
    console.log(`Dry run: ${config.dryRun ? 'Yes' : 'No'}`);

    let v1Db, v2Db;

    try {
        // Open databases
        console.log('\n📂 Opening databases...');
        v1Db = await openDatabase(config.v1Db, sqlite3.OPEN_READONLY);
        v2Db = await openDatabase(config.v2Db, sqlite3.OPEN_READWRITE);
        console.log('   Databases opened successfully');

        // Run migrations in order (trade-ins first since inventory may reference them)
        await migrateTradeIns(v1Db, v2Db, config);
        await migrateInventory(v1Db, v2Db, config);
        await migrateSoldVehicles(v1Db, v2Db, config);
        await migrateDocuments(v1Db, v2Db, config);

        // Print summary
        printSummary(config);

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        // Close databases
        if (v1Db) await closeDatabase(v1Db);
        if (v2Db) await closeDatabase(v2Db);
    }
}

// Run the migration
main();
