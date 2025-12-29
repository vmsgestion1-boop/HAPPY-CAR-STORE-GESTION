# VMS Gestion - Application Web de Gestion

Remplacement complet et sécurisé du fichier Excel `VMS_GESTION.xlsx` par une application web moderne basée sur **Next.js** et **Supabase**.

## 🎯 Objectifs

✅ **Centralisation des données** - Fin de la dispersion Excel  
✅ **Calculs automatiques** - Soldes, relevés, statistiques en temps réel  
✅ **Sécurité** - Authentification, RLS, audit complet  
✅ **Multi-utilisateurs** - Rôles : Admin, Manager, Viewer  
✅ **Scalabilité** - Prêt pour production  
✅ **Exports** - PDF et Excel depuis les relevés  

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│           FRONTEND (Next.js 14 / React)             │
│  Dashboard | Comptes | Opérations | Charges | Relevés │
└────────────────────┬────────────────────────────────┘
                     │ (Supabase Client)
┌────────────────────▼────────────────────────────────┐
│          SUPABASE (Backend-as-a-Service)            │
├─────────────────────────────────────────────────────┤
│ ✅ PostgreSQL           - 5 tables + 1 audit        │
│ ✅ Auth (email/pwd)     - Rôles (admin, manager)    │
│ ✅ RLS Policies         - Sécurité par rôle         │
│ ✅ SQL Views            - account_balances          │
│ ✅ RPC Functions        - Calculs métier            │
│ ✅ Triggers             - Sync transactions         │
│ ✅ Storage              - PDFs, Excels              │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Frontend** | Next.js 14, React 18, TypeScript, TailwindCSS |
| **Backend** | Supabase (PostgreSQL, Auth, RLS) |
| **ORM/DB** | Supabase JS Client |
| **Tables** | Tanstack Table (optionnel) |
| **Exports** | jsPDF, XLSX (Excel) |
| **Dates** | date-fns |
| **Styles** | TailwindCSS 3.3 |

---

## 🗄 Modèle de Données

### Tables Principales

#### `accounts` - Comptes clients/fournisseurs
```sql
id UUID PRIMARY KEY
code_compte TEXT UNIQUE
nom_compte TEXT
type_compte ENUM (client | fournisseur | interne)
solde_initial NUMERIC
actif BOOLEAN
created_at TIMESTAMPTZ
```

#### `receptions_livraisons` - Mouvements de stock
```sql
id UUID PRIMARY KEY
account_id UUID -> accounts
date_operation TIMESTAMPTZ
type_operation (reception | livraison)
quantite NUMERIC
prix_unitaire NUMERIC
montant GENERATED (quantite * prix_unitaire)
```

#### `charges` - Dépenses
```sql
id UUID PRIMARY KEY
account_id UUID -> accounts
date_charge TIMESTAMPTZ
description TEXT
montant NUMERIC
```

#### `transactions` - Journal unifié (auto-peuplé par triggers)
```sql
id UUID PRIMARY KEY
account_id UUID -> accounts
date_operation TIMESTAMPTZ
type (charge | reception | livraison)
reference_id UUID
montant NUMERIC (+ ou -)
```

#### `audit_logs` - Piste d'audit
```sql
id UUID PRIMARY KEY
table_name VARCHAR(100)
operation (INSERT | UPDATE | DELETE)
record_id UUID
old_values JSONB
new_values JSONB
changed_by UUID
changed_at TIMESTAMPTZ
```

### Views & RPC

- **`account_balances`** - Soldes actuels (dynamique)
- **`calculate_account_balance(account_id)`** - Solde d'un compte
- **`get_account_statement(account_id, date_from, date_to)`** - Relevé de compte
- **`get_dashboard_summary()`** - Stats globales

---

## 🚀 Installation & Setup

### Prérequis

- Node.js 18+ / npm
- Compte Supabase (https://supabase.com)
- PostgreSQL 13+ (fourni par Supabase)

### 1️⃣ Cloner & Installer

```bash
# Cloner le projet
git clone <repo-url>
cd vms_gestion

# Installer les dépendances
npm install

# Ou avec pnpm
pnpm install
```

### 2️⃣ Configuration Supabase

#### Créer un projet Supabase

1. Aller sur https://supabase.com/dashboard
2. Créer un nouveau projet
3. Copier l'URL et la clé publique

#### Déployer le schéma SQL

1. Aller dans **SQL Editor**
2. Créer une nouvelle query
3. Copier le contenu de `backend/00_complete_schema_deployment.sql`
4. Exécuter (⏯️ Run)

### 3️⃣ Variables d'Environnement

Créer un fichier `.env.local` à la racine du projet :

```bash
cp .env.example .env.local
```

Remplir les variables :

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=vms-gestion-files
```

> ⚠️ **IMPORTANT** : Les clés `NEXT_PUBLIC_*` sont publiques. La `SERVICE_ROLE_KEY` ne doit jamais être exposée côté frontend.

### 4️⃣ Créer un Utilisateur Admin

```sql
-- Dans SQL Editor de Supabase
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at) 
VALUES (
  'admin@example.com',
  crypt('admin123456', gen_salt('bf')),
  now()
);

-- Ajouter le rôle admin en user_metadata
UPDATE auth.users 
SET raw_app_meta_data = jsonb_build_object('role', 'admin')
WHERE email = 'admin@example.com';
```

### 5️⃣ Importer les Données Excel (Optionnel)

```bash
# Placer VMS_GESTION.xlsx dans la racine du projet

# Exécuter l'import
npm run import VMS_GESTION.xlsx

# Vérifier le rapport d'import
cat import_report.json
```

### 6️⃣ Lancer l'Application

```bash
# Mode développement
npm run dev

# Ouvrir http://localhost:3000
# Se connecter avec : admin@example.com / admin123456
```

---

## 📖 Pages de l'Application

| Page | URL | Rôles | Fonction |
|------|-----|-------|----------|
| 🔐 Login | `/login` | Public | Authentification |
| 📊 Dashboard | `/dashboard` | Tous | Statistiques globales |
| 👥 Comptes | `/accounts` | Admin, Manager | CRUD comptes |
| 📥 Réceptions | `/receptions` | Admin, Manager | Ajouter réceptions |
| 📤 Livraisons | `/livraisons` | Admin, Manager | Ajouter livraisons |
| 💰 Charges | `/charges` | Admin, Manager | Ajouter charges |
| 📋 Relevés | `/statements` | Tous | Relevés + exports |
| ⚙️ Admin | `/admin` | Admin | Gestion syst. |

---

## 🔒 Sécurité & Autorisations (RLS)

Chaque table a des **Row Level Security Policies** :

### Admin
- ✅ Accès total en lecture/écriture/suppression
- ✅ Accès aux logs d'audit
- ✅ Gestion des utilisateurs

### Manager
- ✅ CRUD comptes, opérations, charges
- ✅ Lecture seule : logs d'audit
- ❌ Suppression comptes
- ❌ Gestion utilisateurs

### Viewer
- ✅ Lecture seule (tous les tableaux)
- ✅ Accès aux relevés
- ❌ Aucune création/modification

```sql
-- Exemple : Politiques RLS pour 'accounts'
CREATE POLICY "accounts_read" ON accounts FOR SELECT USING (TRUE);
CREATE POLICY "accounts_write" ON accounts FOR INSERT 
  WITH CHECK (auth.get_user_role() IN ('admin', 'manager'));
```

---

## 🧮 Logique Métier

### Formule de Solde

```
SOLDE_ACTUEL = SOLDE_INITIAL + RECEPTIONS - LIVRAISONS - CHARGES
```

Implémentée via :
1. **Triggers** - Populate `transactions` après INSERT/UPDATE/DELETE
2. **Vue SQL** - `account_balances` recalcule en temps réel
3. **RPC** - `calculate_account_balance()` pour le frontend

### Exemple : Une Réception de 100 units @ 50€

```sql
INSERT INTO receptions_livraisons (account_id, date, type, quantite, prix_unitaire)
VALUES (account_1, '2025-01-01', 'reception', 100, 50);

-- DÉCLENCHE : Trigger 'trg_sync_rl'
-- INSÈRE dans transactions : montant = +5000

-- Résultat dans account_balances :
-- solde_actuel = solde_initial + 5000
```

---

## 📊 Exports

### PDF (Relevé de Compte)

```typescript
// Utilise jsPDF
// Inclut : entête, tableau, métadonnées
// Nom : releve_[CODE]_[DATE].pdf
```

### Excel (Relevé de Compte)

```typescript
// Utilise XLSX
// Inclut : colonnes Date, Type, Montant, Solde
// Nom : releve_[CODE]_[DATE].xlsx
```

---

## 🐛 Dépannage

### "Missing Supabase credentials"
✅ Vérifier `.env.local` contient `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### "RLS policy error"
✅ Vérifier que l'utilisateur a le rôle correct dans `auth.users.raw_app_meta_data`

### "Import failed"
✅ Vérifier format Excel (colonnes correctes, dates valides)
✅ Vérifier fichier `.env.local` avec `SUPABASE_SERVICE_ROLE_KEY`

### "Transactions pas peuplées"
✅ Vérifier triggers : `SELECT * FROM pg_trigger WHERE tgname LIKE 'trg%';`

---

## 🚢 Déploiement en Production

### Vercel (Recommandé)

```bash
# Pousser vers GitHub
git push origin main

# Sur Vercel Dashboard :
# 1. Importer le repo
# 2. Ajouter variables d'env (.env.local)
# 3. Deploy
```

### Configurrations

```bash
# Vercel env variables (dans Vercel Dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (secret)
```

---

## 📞 Support & Maintenance

### Monitoring

- **Logs Supabase** : Dashboard > Logs
- **Audit Trail** : Query table `public.audit_logs`
- **Erreurs Frontend** : Console navigateur + Sentry (optionnel)

### Backups

- Supabase effectue des backups automatiques quotidiens
- Exporter manuellement : Dashboard > Database > Backups

### Mises à Jour

```bash
# Mettre à jour les dépendances
npm update

# Lancer les tests
npm run type-check
npm run lint
```

---

## 📄 Licence

MIT

---

## ✅ Checklist Production

- [ ] Variables d'env configurées (.env.local + Vercel)
- [ ] RLS policies activées et testées
- [ ] Utilisateurs créés avec rôles
- [ ] Import Excel effectué ou données manuelles entrées
- [ ] Triggers validés (logs audit peuplés)
- [ ] Exports PDF/Excel testés
- [ ] Tests de sécurité (login, permissions)
- [ ] Backup Supabase activé
- [ ] Monitoring en place
- [ ] Documentation mise à jour

---

**Application prête pour production !** 🎉
