# 🚀 DÉMARRAGE RAPIDE - VMS GESTION

## 5 minutes pour démarrer

### 1. Supabase Setup (3 min)

```bash
# Aller sur https://supabase.com/dashboard
# Créer un nouveau projet "vms-gestion"
# Attendre que la DB soit initialisée

# Dans "SQL Editor", copier-coller et exécuter :
# backend/00_complete_schema_deployment.sql
```

### 2. Variables d'Env (1 min)

```bash
# Créer .env.local à la racine
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF
```

Trouver les clés :
- Supabase Dashboard > Settings > API > Project URL & Keys

### 3. Créer Admin User (1 min)

Dans Supabase > SQL Editor :

```sql
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at) 
VALUES ('admin@test.com', crypt('admin123456', gen_salt('bf')), now());

UPDATE auth.users 
SET raw_app_meta_data = jsonb_build_object('role', 'admin')
WHERE email = 'admin@test.com';
```

### 4. Démarrer l'App (0 min)

```bash
npm install
npm run dev

# Ouvrir http://localhost:3000
# Login : admin@test.com / admin123456
```

---

## 📊 Importer Excel

```bash
# Placer VMS_GESTION.xlsx dans la racine

# Lancer l'import
npm run import VMS_GESTION.xlsx

# Vérifier le rapport
cat import_report.json
```

Le fichier Excel doit avoir ces sheets :
- **COMPTES** : colonnes `Code | Nom | Type | Solde Initial`
- **JOURNAL** : colonnes `Date | Code | Type | Qté | Prix | ...`
- **CHARGES** : colonnes `Date | Code | Description | Montant`

---

## ✅ Points de Vérification

```bash
# 1. Vérifier la DB
curl https://your-project.supabase.co/rest/v1/accounts \
  -H "Authorization: Bearer your-anon-key"

# 2. Vérifier le login
# Essayer de se connecter à http://localhost:3000/login

# 3. Vérifier les calculs
# Créer un compte, une réception → voir le solde se mettre à jour

# 4. Vérifier les exports
# Aller sur /statements → télécharger PDF/Excel
```

---

## 🆘 Erreurs Communes

| Erreur | Solution |
|--------|----------|
| `Missing Supabase credentials` | Vérifier `.env.local` |
| `RLS policy error` | Ajouter le rôle à l'utilisateur (voir SQL ci-dessus) |
| `Import failed` | Vérifier le format du fichier Excel |
| `Page blanche` | Ouvrir DevTools > Console pour les erreurs |

---

## 📚 Docs Complètes

Voir [README.md](./README.md) pour la documentation complète.

---

**Prêt ? Commençons ! 🎉**
