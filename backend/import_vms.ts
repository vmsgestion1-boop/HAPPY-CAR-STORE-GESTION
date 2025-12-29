import { createClient } from '@supabase/supabase-js';
import * as ExcelJS from 'exceljs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EXCEL_FILE = 'VMS_GESTION.xlsx';

async function importData() {
  console.log(`📂 Reading Excel file: ${EXCEL_FILE}...`);
  const workbook = new ExcelJS.Workbook();
  
  try {
    await workbook.xlsx.readFile(EXCEL_FILE);
  } catch (error) {
    console.error(`❌ Error reading file: ${error}. Make sure '${EXCEL_FILE}' is in the current directory.`);
    process.exit(1);
  }

  // ---------------------------------------------------------
  // 1. IMPORT ACCOUNTS
  // ---------------------------------------------------------
  const accountsSheet = workbook.getWorksheet('COMPTES'); // ADAPT THIS NAME
  if (!accountsSheet) {
    console.warn('⚠️ Worksheet "COMPTES" not found. Skipping accounts import.');
  } else {
    console.log('🔹 Importing Accounts...');
    const accounts: any[] = [];
    
    accountsSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      // ADAPT COLUMNS INDICES
      const code = row.getCell(1).text; 
      const name = row.getCell(2).text;
      const type = row.getCell(3).text || 'client';
      const balance = parseFloat(row.getCell(4).text) || 0;

      if (code && name) {
        accounts.push({
          code_compte: code,
          nom_compte: name,
          type_compte: type.toLowerCase(),
          solde_initial: balance,
          actif: true
        });
      }
    });

    if (accounts.length > 0) {
      const { error } = await supabase.from('accounts').upsert(accounts, { onConflict: 'code_compte' });
      if (error) console.error('❌ Error inserting accounts:', error);
      else console.log(`✅ ${accounts.length} accounts imported/updated.`);
    }
  }

  // ---------------------------------------------------------
  // 2. IMPORT TRANSACTIONS (Receptions / Livraisons)
  // ---------------------------------------------------------
  // Assuming a generic journal sheet or multiple sheets. Example for one sheet:
  const journalSheet = workbook.getWorksheet('JOURNAL'); 
  if (!journalSheet) {
    console.warn('⚠️ Worksheet "JOURNAL" not found. Skipping operations import.');
  } else {
    console.log('🔹 Importing Operations...');
    // Fetch accounts to map ID
    const { data: dbAccounts } = await supabase.from('accounts').select('id, code_compte');
    const accountMap = new Map(dbAccounts?.map(a => [a.code_compte, a.id]));

    const operations: any[] = [];
    const charges: any[] = [];

    journalSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const dateStr = row.getCell(1).text;
      const codeCompte = row.getCell(2).text;
      const type = row.getCell(3).text.toLowerCase(); // reception, livraison, charge
      const desc = row.getCell(4).text;
      const qte = parseFloat(row.getCell(5).text) || 0;
      const price = parseFloat(row.getCell(6).text) || 0;
      const amount = parseFloat(row.getCell(7).text) || 0;

      const accountId = accountMap.get(codeCompte);
      if (!accountId) {
        console.warn(`⚠️ Account not found for code: ${codeCompte}`);
        return;
      }

      if (type === 'charge') {
        charges.push({
          account_id: accountId,
          date_charge: new Date(dateStr),
          description: desc || 'Charge importée',
          montant: Math.abs(amount) // Ensure positive, trigger handles sign
        });
      } else if (type === 'reception' || type === 'livraison') {
        operations.push({
          account_id: accountId,
          date_operation: new Date(dateStr),
          type_operation: type,
          quantite: qte,
          prix_unitaire: price
          // montant is generated
        });
      }
    });

    if (operations.length > 0) {
      const { error } = await supabase.from('receptions_livraisons').insert(operations);
      if (error) console.error('❌ Error inserting operations:', error);
      else console.log(`✅ ${operations.length} receptions/livraisons imported.`);
    }

    if (charges.length > 0) {
      const { error } = await supabase.from('charges').insert(charges);
      if (error) console.error('❌ Error inserting charges:', error);
      else console.log(`✅ ${charges.length} charges imported.`);
    }
  }

  console.log('🏁 Import finished.');
}

importData();
