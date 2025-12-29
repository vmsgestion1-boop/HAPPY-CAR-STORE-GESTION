# 📑 INDEX DU PROJET VMS GESTION

## 🗂️ Structure Complète

### 📂 `backend/` - Backend SQL & Import

| Fichier | Description | Lignes |
|---------|-------------|--------|
| `00_complete_schema_deployment.sql` | **SQL COMPLET** - Tables, RLS, Views, RPC, Triggers, Audit | 900+ |
| `import_vms_v2.ts` | Import Excel avec validation robuste | 400+ |
| `01_rls.sql` | RLS Policies (inclus dans 00_*) | 127 |
| `02_business_logic.sql` | Views & RPC (inclus dans 00_*) | 134 |
| `03_triggers.sql` | Triggers (inclus dans 00_*) | 106 |
| `import_strategy.md` | Docs stratégie d'import | - |

### 📂 `app/` - Frontend Next.js 14

#### Pages

| Page | Fichier | Rôles | Fonction |
|------|---------|-------|----------|
| Login | `login/page.tsx` | Public | Authentification |
| Dashboard | `dashboard/page.tsx` | Tous | Tableau de bord |
| Comptes | `accounts/page.tsx` | Admin, Manager | CRUD Comptes |
| Réceptions | `receptions/page.tsx` | Admin, Manager | CRUD Réceptions |
| Livraisons | `livraisons/page.tsx` | Admin, Manager | CRUD Livraisons |
| Charges | `charges/page.tsx` | Admin, Manager | CRUD Charges |
| Relevés | `statements/page.tsx` | Tous | Relevés + exports |
| Admin | `admin/page.tsx` | Admin | Gestion système |

#### Fichiers Globaux

| Fichier | Description |
|---------|-------------|
| `layout.tsx` | Layout principal (RootLayout) |
| `globals.css` | Styles globaux + TailwindCSS |

### 📂 `components/` - Composants Réutilisables

| Fichier | Description |
|---------|-------------|
| `ui.tsx` | Card, Button, Badge, Input, Select |
| `navigation.tsx` | Barre de navigation principale |

### 📂 `lib/` - Utilitaires & Logique

| Fichier | Description |
|---------|-------------|
| `supabase.ts` | Client Supabase configuré |
| `api.ts` | Fonctions API (fetch, CRUD) |
| `types.ts` | Types TypeScript (Account, Transaction, etc.) |
| `utils.ts` | Utilitaires (format currency, date, etc.) |
| `hooks.ts` | Hooks React (useRequireAuth, useUser) |

### 📂 Config Files

| Fichier | Description |
|---------|-------------|
| `package.json` | Dépendances + scripts |
| `tsconfig.json` | Configuration TypeScript |
| `next.config.ts` | Configuration Next.js |
| `tailwind.config.ts` | Configuration TailwindCSS |
| `.env.example` | Template variables d'environnement |
| `.gitignore` | Fichiers ignorés git |

### 📂 Documentation

| Fichier | Description | Audience |
|---------|-------------|----------|
| `README.md` | 📖 Documentation complète | Tous |
| `QUICK_START.md` | ⚡ Démarrage en 5 min | Débutants |
| `DEPLOYMENT.md` | 📋 Vue d'ensemble du projet | Développeurs |
| `setup.sh` | Script setup Linux/Mac | DevOps |
| `setup.bat` | Script setup Windows | DevOps |

---

## 🔍 Navigation par Use Case

### 👤 Je suis **Administrateur**

1. Lire : [README.md](README.md) - Section "Installation & Setup"
2. Lire : [QUICK_START.md](QUICK_START.md) - Section "Supabase Setup"
3. Action : Exécuter `backend/00_complete_schema_deployment.sql`
4. Action : Créer utilisateurs avec rôles
5. Action : Importer Excel (optionnel)
6. Action : Lancer avec `npm run dev`

### 👨‍💻 Je suis **Développeur Frontend**

1. Lire : [lib/types.ts](lib/types.ts) - Types disponibles
2. Lire : [lib/api.ts](lib/api.ts) - Fonctions API
3. Explorer : Pages dans [app/](app/) - Exemples d'utilisation
4. Utiliser : Composants [components/ui.tsx](components/ui.tsx)
5. Modifier : Pages pour ajouter fonctionnalités

### 🗄️ Je suis **Data Engineer / DBA**

1. Lire : [backend/00_complete_schema_deployment.sql](backend/00_complete_schema_deployment.sql) - Schéma complet
2. Sections du SQL :
   - Section 1 : Extensions
   - Section 2 : Tables & Indexes
   - Section 3 : RLS Policies
   - Section 4 : Views
   - Section 5 : RPC Functions
   - Section 6 : Triggers
   - Section 7 : Audit Logging
3. Modifier : RLS policies si besoin
4. Ajouter : Nouvelles views/RPC
5. Monitorer : [lib/types.ts](lib/types.ts) pour les nouvelles structures

### 📥 Je dois **Importer les Données**

1. Préparer : Fichier Excel `VMS_GESTION.xlsx`
   - Sheet "COMPTES" : Code, Nom, Type, Solde Initial
   - Sheet "JOURNAL" : Date, Code, Type, Qté, Prix, ...
   - Sheet "CHARGES" : Date, Code, Description, Montant
2. Exécuter : `npm run import VMS_GESTION.xlsx`
3. Vérifier : Rapport `import_report.json`
4. Corriger : Erreurs si besoin
5. Réexécuter : Until report status = "success"

### 🚀 Je dois **Déployer en Production**

1. Lire : [README.md](README.md) - Section "Déploiement en Production"
2. Vérifier : [README.md](README.md#-checklist-production) - Checklist
3. Pousser : Code vers GitHub
4. Configurer : Vercel Dashboard
5. Ajouter : Variables d'env
6. Déployer : Via Vercel CLI ou Dashboard

---

## 📊 Dépendances Principales

```json
{
  "react": "^18.2.0",
  "next": "^14.0.0",
  "@supabase/supabase-js": "^2.38.0",
  "tailwindcss": "^3.3.0",
  "@tanstack/react-table": "^8.10.0",
  "jspdf": "^2.5.1",
  "xlsx": "^0.18.5",
  "date-fns": "^2.30.0"
}
```

---

## 🔐 Rôles & Permissions

### Admin
- ✅ Lire tous les tableaux
- ✅ Créer/Modifier/Supprimer comptes
- ✅ Créer/Modifier/Supprimer opérations
- ✅ Créer/Modifier/Supprimer charges
- ✅ Accès logs d'audit
- ✅ Gestion utilisateurs

### Manager
- ✅ Lire tous les tableaux
- ✅ Créer/Modifier comptes
- ✅ Créer/Modifier opérations
- ✅ Créer/Modifier charges
- ❌ Supprimer comptes
- ❌ Accès logs d'audit

### Viewer
- ✅ Lire tous les tableaux
- ✅ Voir relevés & exports
- ❌ Créer/Modifier/Supprimer

---

## 🚦 Flux de Donnéess

```
1. USER
   ↓ (login)
   
2. FRONTEND (Next.js)
   - Affiche pages
   - Appels API Supabase
   ↓ (supabase.from(), rpc())
   
3. BACKEND (Supabase)
   - RLS Policies (sécurité)
   - Tables (données)
   - Views (requêtes complexes)
   - RPC (logique métier)
   - Triggers (sync transactions)
   - Audit (logging)
   ↓ (JSON results)
   
4. FRONTEND
   - Affiche résultats
   - Format (currency, date)
   - Exports (PDF, Excel)
   ↓ (affichage user)
   
5. USER
   - Voit les données
   - Interagit
```

---

## 📈 Évolution Possible

### Court Terme
- [ ] Ajouter pagination aux tables
- [ ] Filtres avancés
- [ ] Graphiques Recharts (dashboard)
- [ ] Notifications email

### Moyen Terme
- [ ] Intégration API bancaire
- [ ] Synchronisation temps réel (WebSockets)
- [ ] Rapports personnalisés
- [ ] Gestion des droits fine-grained

### Long Terme
- [ ] Mobile app (React Native)
- [ ] API GraphQL
- [ ] Data warehouse (Analytics)
- [ ] Machine Learning (Prédictions)

---

## ✅ Checklist de Référence

### Avant de démarrer
- [ ] Node.js 18+ installé
- [ ] Compte Supabase créé
- [ ] Code cloné

### Setup
- [ ] `.env.local` rempli
- [ ] SQL déployé
- [ ] Admin user créé
- [ ] Dependencies : `npm install`

### Test local
- [ ] `npm run dev`
- [ ] Login fonctionne
- [ ] Créer compte fonctionne
- [ ] Voir solde se mettre à jour
- [ ] Exports PDF/Excel fonctionnent

### Production
- [ ] Checklist [README.md](README.md#-checklist-production)
- [ ] Vercel configuré
- [ ] Vars d'env ajoutées
- [ ] Domaine personnalisé (optionnel)
- [ ] HTTPS activé (auto Vercel)
- [ ] Monitoring en place

---

## 🆘 Dépannage Rapide

| Problème | Solution |
|----------|----------|
| Erreur `NEXT_PUBLIC_SUPABASE_URL` | Vérifier `.env.local` |
| RLS policy error | Ajouter rôle à l'utilisateur |
| Import Excel fails | Vérifier format des feuilles |
| Page blanche | Console > onglet Network & Console |
| Balances incorrects | Triggers OK ? → Vérifier `transactions` table |

---

**📍 Vous êtes perdu ?** → Commencez par [QUICK_START.md](QUICK_START.md) ! 🚀
