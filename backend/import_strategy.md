# ÉTAPE 6 — IMPORT EXCEL (ONE-SHOT)

## 1. Stratégie d'Import
L'import se fera via un script Node.js qui lit le fichier Excel et utilise l'API Supabase (`supabase-js`) pour insérer les données.
Cela permet de valider les données avant insertion et de bénéficier du typage.

## 2. Mapping Excel → DB

### Onglets (Hypothèse basée sur les tables cibles)

#### 1. Comptes
Supposons un onglet "COMPTES" ou une liste distincte.
- Excel `Code` -> DB `accounts.code_compte`
- Excel `Nom` -> DB `accounts.nom_compte`
- Excel `Type` -> DB `accounts.type_compte`
- Excel `Solde Initial` -> DB `accounts.solde_initial`

#### 2. Mouvements (Journal)
Supposons un journal ou des onglets par compte.
- Excel `Date` -> DB `...date_operation`
- Excel `Type` -> Détermine table cible (`receptions_livraisons` ou `charges`)
- Excel `Libellé/Desc` -> DB `description` (charges) ou mapping auto
- Excel `Quantité` -> DB `quantite`
- Excel `Prix` -> DB `prix_unitaire`

## 3. Script d'Import (Concept)
Ce script sera à placer dans le dossier du projet Frontend (une fois créé) ou exécuté indépendamment.

```typescript
// scripts/import_vms.ts
// Prerequisites: npm install exceljs @supabase/supabase-js dotenv

import QuickChart from 'exceljs'; // Fake import name, usually 'exceljs'
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function importExcel(filePath: string) {
  const workbook = new QuickChart.Workbook();
  await workbook.xlsx.readFile(filePath);

  // 1. IMPORT ACCOUNTS
  const sheetComptes = workbook.getWorksheet('COMPTES');
  if (sheetComptes) {
    sheetComptes.eachRow(async (row, rowNumber) => {
      if (rowNumber === 1) return; // Header
      // ... Logic to extract values
      // const { data, error } = await supabase.from('accounts').insert({...});
    });
  }

  // 2. IMPORT TRANSACTIONS
  // ... Logic to parse other sheets
}

// To run: ts-node scripts/import_vms.ts
```

> **Note**: Comme je n'ai pas le fichier Excel, je fournis ce "squelette" adaptable. Le script réel nécessitera les noms précis des colonnes du fichier XLSX.
