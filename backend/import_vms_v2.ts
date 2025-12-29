#!/usr/bin/env ts-node
/**
 * VMS GESTION - Excel Import Script
 * Imports accounts, operations, and charges from VMS_GESTION.xlsx to Supabase
 * 
 * Usage: ts-node import_vms_v2.ts [path-to-excel-file]
 * 
 * Requirements:
 *   - npm install exceljs @supabase/supabase-js dotenv
 *   - .env file with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - Excel file with sheets: COMPTES, JOURNAL (or similar)
 */

import { createClient } from '@supabase/supabase-js';
import * as ExcelJS from 'exceljs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Configuration
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file.');
  console.error('   Expected: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EXCEL_FILE = process.argv[2] || 'VMS_GESTION.xlsx';

// Import Report Structure
interface ImportReport {
  timestamp: string;
  file: string;
  status: 'success' | 'partial' | 'error';
  summary: {
    accounts_imported: number;
    accounts_updated: number;
    accounts_errors: number;
    operations_imported: number;
    operations_errors: number;
    charges_imported: number;
    charges_errors: number;
  };
  errors: string[];
  warnings: string[];
}

const report: ImportReport = {
  timestamp: new Date().toISOString(),
  file: EXCEL_FILE,
  status: 'success',
  summary: {
    accounts_imported: 0,
    accounts_updated: 0,
    accounts_errors: 0,
    operations_imported: 0,
    operations_errors: 0,
    charges_imported: 0,
    charges_errors: 0,
  },
  errors: [],
  warnings: [],
};

// Validation helpers
function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateDate(dateStr: string): { valid: boolean; date?: Date } {
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? { valid: false } : { valid: true, date: parsed };
}

function validateNumeric(value: any): { valid: boolean; value?: number } {
  const num = parseFloat(value);
  return isNaN(num) ? { valid: false } : { valid: true, value: num };
}

// Main import function
async function importData() {
  console.log('\n🚀 VMS GESTION - EXCEL IMPORT STARTED');
  console.log(`📂 File: ${EXCEL_FILE}`);
  console.log('='.repeat(60));

  // Check if file exists
  if (!fs.existsSync(EXCEL_FILE)) {
    const error = `❌ File not found: ${EXCEL_FILE}. Make sure the file exists in the current directory.`;
    console.error(error);
    report.errors.push(error);
    report.status = 'error';
    saveReport();
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.readFile(EXCEL_FILE);
  } catch (error) {
    const errorMsg = `❌ Error reading Excel file: ${error}`;
    console.error(errorMsg);
    report.errors.push(errorMsg);
    report.status = 'error';
    saveReport();
    process.exit(1);
  }

  console.log(`✅ Excel file loaded. Sheets: ${workbook.worksheets.map(s => s.name).join(', ')}`);

  // ---------------------------------------------------------
  // 1. IMPORT ACCOUNTS
  // ---------------------------------------------------------
  console.log('\n🔹 STEP 1: Importing Accounts...');
  await importAccounts(workbook);

  // ---------------------------------------------------------
  // 2. IMPORT OPERATIONS (Receptions / Livraisons)
  // ---------------------------------------------------------
  console.log('\n🔹 STEP 2: Importing Operations (Receptions/Livraisons)...');
  await importOperations(workbook);

  // ---------------------------------------------------------
  // 3. IMPORT CHARGES
  // ---------------------------------------------------------
  console.log('\n🔹 STEP 3: Importing Charges...');
  await importCharges(workbook);

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Accounts Imported: ${report.summary.accounts_imported}`);
  console.log(`⚠️  Accounts Updated: ${report.summary.accounts_updated}`);
  console.log(`❌ Accounts Errors: ${report.summary.accounts_errors}`);
  console.log(`✅ Operations Imported: ${report.summary.operations_imported}`);
  console.log(`❌ Operations Errors: ${report.summary.operations_errors}`);
  console.log(`✅ Charges Imported: ${report.summary.charges_imported}`);
  console.log(`❌ Charges Errors: ${report.summary.charges_errors}`);

  if (report.errors.length > 0) {
    report.status = report.summary.accounts_errors > 0 ? 'partial' : 'success';
    console.log(`\n⚠️  Warnings (${report.warnings.length}):`);
    report.warnings.forEach(w => console.log(`   - ${w}`));
  }

  if (report.errors.length > 0) {
    console.log(`\n❌ Errors (${report.errors.length}):`);
    report.errors.slice(0, 10).forEach(e => console.log(`   - ${e}`));
    if (report.errors.length > 10) {
      console.log(`   ... and ${report.errors.length - 10} more errors (see report file)`);
    }
  }

  console.log('\n💾 Saving import report...');
  saveReport();

  console.log(`\n🏁 Import finished with status: ${report.status}`);
  console.log(`📄 Full report saved to: import_report.json`);
  process.exit(report.status === 'error' ? 1 : 0);
}

// Import Accounts
async function importAccounts(workbook: ExcelJS.Workbook) {
  const sheet = workbook.getWorksheet('COMPTES') || workbook.getWorksheet('Comptes') || workbook.getWorksheet('ACCOUNTS');

  if (!sheet) {
    const warning = '⚠️  Sheet "COMPTES" not found. Skipping accounts import.';
    console.warn(warning);
    report.warnings.push(warning);
    return;
  }

  const accounts: any[] = [];
  let rowCount = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    rowCount++;
    try {
      const code = String(row.getCell(1).value || '').trim();
      const name = String(row.getCell(2).value || '').trim();
      const type = String(row.getCell(3).value || 'client').trim().toLowerCase();
      const balance = parseFloat(String(row.getCell(4).value || '0'));

      // Validation
      if (!code) {
        throw new Error('Code compte is empty');
      }
      if (!name) {
        throw new Error('Nom compte is empty');
      }
      if (!['client', 'fournisseur', 'interne'].includes(type)) {
        throw new Error(`Invalid type_compte: ${type}. Must be client, fournisseur, or interne`);
      }
      if (isNaN(balance)) {
        throw new Error(`Invalid solde_initial: ${balance}`);
      }

      accounts.push({
        code_compte: code,
        nom_compte: name,
        type_compte: type,
        solde_initial: balance,
        actif: true,
      });
    } catch (error) {
      const msg = `Row ${rowNumber}: ${error instanceof Error ? error.message : String(error)}`;
      report.errors.push(`Accounts - ${msg}`);
      report.summary.accounts_errors++;
    }
  });

  console.log(`   Found ${accounts.length} accounts (${report.summary.accounts_errors} errors)`);

  if (accounts.length > 0) {
    const { data, error } = await supabase
      .from('accounts')
      .upsert(accounts, { onConflict: 'code_compte' });

    if (error) {
      const msg = `Error upserting accounts: ${error.message}`;
      report.errors.push(msg);
      report.status = 'partial';
      console.error(`   ❌ ${msg}`);
    } else {
      report.summary.accounts_imported = accounts.length;
      console.log(`   ✅ ${accounts.length} accounts imported/updated.`);
    }
  }
}

// Import Operations (Receptions / Livraisons)
async function importOperations(workbook: ExcelJS.Workbook) {
  const sheet = workbook.getWorksheet('JOURNAL') || workbook.getWorksheet('Journal') || workbook.getWorksheet('OPERATIONS');

  if (!sheet) {
    const warning = '⚠️  Sheet "JOURNAL" not found. Skipping operations import.';
    console.warn(warning);
    report.warnings.push(warning);
    return;
  }

  // Fetch accounts for mapping
  const { data: dbAccounts, error: accountsError } = await supabase.from('accounts').select('id, code_compte');

  if (accountsError) {
    const msg = `Error fetching accounts: ${accountsError.message}`;
    report.errors.push(msg);
    console.error(`   ❌ ${msg}`);
    return;
  }

  const accountMap = new Map((dbAccounts || []).map((a: any) => [a.code_compte, a.id]));

  const operations: any[] = [];
  let rowCount = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    rowCount++;
    try {
      const dateStr = String(row.getCell(1).value || '');
      const codeCompte = String(row.getCell(2).value || '').trim();
      const type = String(row.getCell(3).value || '').trim().toLowerCase();
      const qte = parseFloat(String(row.getCell(5).value || '0'));
      const price = parseFloat(String(row.getCell(6).value || '0'));

      // Validation
      const dateValidation = validateDate(dateStr);
      if (!dateValidation.valid) {
        throw new Error(`Invalid date: ${dateStr}`);
      }

      if (!codeCompte) {
        throw new Error('Code compte is empty');
      }

      if (!['reception', 'livraison'].includes(type)) {
        throw new Error(`Invalid operation type: ${type}`);
      }

      const accountId = accountMap.get(codeCompte);
      if (!accountId) {
        throw new Error(`Account not found for code: ${codeCompte}`);
      }

      if (isNaN(qte) || qte <= 0) {
        throw new Error(`Invalid quantite: ${qte}`);
      }

      if (isNaN(price) || price < 0) {
        throw new Error(`Invalid prix_unitaire: ${price}`);
      }

      operations.push({
        account_id: accountId,
        date_operation: dateValidation.date!.toISOString(),
        type_operation: type,
        quantite: qte,
        prix_unitaire: price,
      });
    } catch (error) {
      const msg = `Row ${rowNumber}: ${error instanceof Error ? error.message : String(error)}`;
      report.errors.push(`Operations - ${msg}`);
      report.summary.operations_errors++;
    }
  });

  console.log(`   Found ${operations.length} operations (${report.summary.operations_errors} errors)`);

  if (operations.length > 0) {
    const { error } = await supabase.from('receptions_livraisons').insert(operations);

    if (error) {
      const msg = `Error inserting operations: ${error.message}`;
      report.errors.push(msg);
      report.status = 'partial';
      console.error(`   ❌ ${msg}`);
    } else {
      report.summary.operations_imported = operations.length;
      console.log(`   ✅ ${operations.length} receptions/livraisons imported.`);
    }
  }
}

// Import Charges
async function importCharges(workbook: ExcelJS.Workbook) {
  const sheet = workbook.getWorksheet('CHARGES') || workbook.getWorksheet('Charges');

  if (!sheet) {
    const warning = '⚠️  Sheet "CHARGES" not found. Skipping charges import.';
    console.warn(warning);
    report.warnings.push(warning);
    return;
  }

  // Fetch accounts for mapping
  const { data: dbAccounts, error: accountsError } = await supabase.from('accounts').select('id, code_compte');

  if (accountsError) {
    const msg = `Error fetching accounts: ${accountsError.message}`;
    report.errors.push(msg);
    console.error(`   ❌ ${msg}`);
    return;
  }

  const accountMap = new Map((dbAccounts || []).map((a: any) => [a.code_compte, a.id]));

  const charges: any[] = [];
  let rowCount = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    rowCount++;
    try {
      const dateStr = String(row.getCell(1).value || '');
      const codeCompte = String(row.getCell(2).value || '').trim();
      const description = String(row.getCell(3).value || 'Charge importée').trim();
      const amount = parseFloat(String(row.getCell(4).value || '0'));

      // Validation
      const dateValidation = validateDate(dateStr);
      if (!dateValidation.valid) {
        throw new Error(`Invalid date: ${dateStr}`);
      }

      if (!codeCompte) {
        throw new Error('Code compte is empty');
      }

      const accountId = accountMap.get(codeCompte);
      if (!accountId) {
        throw new Error(`Account not found for code: ${codeCompte}`);
      }

      if (isNaN(amount) || amount <= 0) {
        throw new Error(`Invalid montant: ${amount}`);
      }

      charges.push({
        account_id: accountId,
        date_charge: dateValidation.date!.toISOString(),
        description,
        montant: Math.abs(amount),
      });
    } catch (error) {
      const msg = `Row ${rowNumber}: ${error instanceof Error ? error.message : String(error)}`;
      report.errors.push(`Charges - ${msg}`);
      report.summary.charges_errors++;
    }
  });

  console.log(`   Found ${charges.length} charges (${report.summary.charges_errors} errors)`);

  if (charges.length > 0) {
    const { error } = await supabase.from('charges').insert(charges);

    if (error) {
      const msg = `Error inserting charges: ${error.message}`;
      report.errors.push(msg);
      report.status = 'partial';
      console.error(`   ❌ ${msg}`);
    } else {
      report.summary.charges_imported = charges.length;
      console.log(`   ✅ ${charges.length} charges imported.`);
    }
  }
}

// Save import report
function saveReport() {
  fs.writeFileSync('import_report.json', JSON.stringify(report, null, 2));
}

// Run import
importData().catch((error) => {
  console.error('❌ Fatal error:', error);
  report.errors.push(`Fatal error: ${error.message}`);
  report.status = 'error';
  saveReport();
  process.exit(1);
});
