const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 1. GENERATE EQUIPMENT REGISTER SHEET (100 Rows)
const categories = ['Analyzer', 'Microscope', 'Centrifuge', 'Incubator', 'Autoclave', 'Refrigerator'];
const units = ['Pcs', 'Units', 'Set'];
const statuses = ['Working', 'Under Maintenance', 'Repairing', 'Out of Service'];
const brands = ['Roche', 'BD Biosciences', 'Beckman Coulter', 'Sysmex', 'Bio-Rad', 'Eppendorf'];

const equipmentRecords = [];
for (let i = 1; i <= 105; i++) {
    const category = categories[i % categories.length];
    const unit = units[i % units.length];
    const status = statuses[i % statuses.length];
    const brand = brands[i % brands.length];
    const quantity = Math.floor(Math.random() * 5) + 1;
    const purchasePrice = Math.floor(Math.random() * 500000) + 10000;
    
    // Purchase Date (random date in the past: 2022 – 2024)
    const year = 2022 + (i % 3);  // yields 2022, 2023, 2024 — all in the past
    const month = String((i % 12) + 1).padStart(2, '0');
    const day = String((i % 28) + 1).padStart(2, '0');
    const purchaseDate = `${year}-${month}-${day}`;

    equipmentRecords.push({
        name: `${brand} ${category} Model X-${i}`,
        code: `EQ-SEED-${String(i).padStart(3, '0')}`,
        category,
        unit,
        brand,
        model: `X-${i}`,
        quantity,
        purchasePrice,
        purchaseDate,
        status,
        image: `https://images.unsplash.com/photo-1579154261294-114f26938651?auto=format&fit=crop&q=80&w=200`
    });
}

const eqSheet = XLSX.utils.json_to_sheet(equipmentRecords);
const eqBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(eqBook, eqSheet, "Equipment");
const eqPath = path.join(__dirname, "Lab_Equipment_100_Rows.xlsx");
XLSX.writeFile(eqBook, eqPath);
console.log(`Successfully generated Lab Equipment Register Excel at: ${eqPath}`);


// 2. GENERATE INVENTORY CATALOG SHEET (100 Rows)
const invCategories = ['Reagent', 'Test Kit', 'Consumable', 'Glassware', 'Chemical', 'General Item'];
const invUnits = ['Piece', 'Box', 'Bottle', 'Pack', 'Kit', 'Tube', 'Strip'];
const itemNames = [
    'Buffer Solution PH 7.0', 'Pregnancy Test Strips', 'Centrifuge Tubes 15ml', 'Pipette Tips 200ul',
    'Ethanol 99%', 'Rapid Dengue NS1 Kit', 'Cover Slips 22x22mm', 'Dettol Disinfectant 500ml',
    'Microscope Slides Glass', 'Staining Reagent Kit'
];

const inventoryRecords = [];
for (let i = 1; i <= 105; i++) {
    const category = invCategories[i % invCategories.length];
    const unit = invUnits[i % invUnits.length];
    const brand = brands[i % brands.length];
    const quantity = Math.floor(Math.random() * 200) + 10;
    const purchasePrice = Math.floor(Math.random() * 2000) + 50;
    const mrp = Math.floor(purchasePrice * 1.25); // mrp is greater than purchase price
    const reorderLevel = Math.floor(Math.random() * 30) + 10;
    
    // MFG & EXP Dates
    const mYear = 2025;
    const eYear = 2027;
    const month = String((i % 12) + 1).padStart(2, '0');
    const day = String((i % 28) + 1).padStart(2, '0');
    
    const manufacturingDate = `${mYear}-${month}-${day}`;
    const expiryDate = `${eYear}-${month}-${day}`;

    const baseName = itemNames[i % itemNames.length];

    inventoryRecords.push({
        name: `${brand} ${baseName} Pack B-${i}`,
        code: `INV-SEED-${String(i).padStart(3, '0')}`,
        category,
        unit,
        brand,
        quantity,
        purchasePrice,
        mrp,
        reorderLevel,
        batchNumber: `BATCH-LN-${1000 + i}`,
        manufacturingDate,
        expiryDate,
        description: `High-quality ${category} seed item sourced from ${brand}`,
        notes: `Store under standard laboratory conditions. Expiry monitored by automated alert system.`
    });
}

const invSheet = XLSX.utils.json_to_sheet(inventoryRecords);
const invBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(invBook, invSheet, "Inventory");
const invPath = path.join(__dirname, "Lab_Inventory_100_Rows.xlsx");
XLSX.writeFile(invBook, invPath);
console.log(`Successfully generated Lab Inventory Catalog Excel at: ${invPath}`);
