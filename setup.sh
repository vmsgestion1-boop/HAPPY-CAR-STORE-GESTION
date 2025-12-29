#!/bin/bash

# VMS GESTION - SETUP AUTOMATISÉ
# Ce script configure l'environnement complet

set -e

echo "🚀 VMS GESTION - SETUP INITIAL"
echo "================================"

# 1. Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer : https://nodejs.org"
    exit 1
fi
echo "✅ Node.js : $(node --version)"

# 2. Installer les dépendances
echo ""
echo "📦 Installation des dépendances..."
npm install

# 3. Créer .env.local s'il n'existe pas
if [ ! -f .env.local ]; then
    echo ""
    echo "⚙️  Création de .env.local..."
    cp .env.example .env.local
    echo "⚠️  Veuillez remplir .env.local avec vos clés Supabase"
else
    echo "✅ .env.local existe déjà"
fi

# 4. Vérifier les variables d'env
echo ""
echo "🔍 Vérification des variables d'environnement..."
if ! grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
    echo "⚠️  NEXT_PUBLIC_SUPABASE_URL manquante dans .env.local"
fi
if ! grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
    echo "⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY manquante dans .env.local"
fi

# 5. Afficher les prochaines étapes
echo ""
echo "================================"
echo "✅ SETUP COMPLÉTÉ !"
echo "================================"
echo ""
echo "📝 Prochaines étapes :"
echo ""
echo "1. Configurer Supabase :"
echo "   → Aller sur https://supabase.com/dashboard"
echo "   → Créer un nouveau projet"
echo "   → Copier l'URL et les clés"
echo ""
echo "2. Remplir .env.local :"
echo "   → Éditer .env.local"
echo "   → Ajouter NEXT_PUBLIC_SUPABASE_URL"
echo "   → Ajouter NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   → Ajouter SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "3. Déployer le schéma SQL :"
echo "   → Supabase Dashboard > SQL Editor"
echo "   → Copier-coller backend/00_complete_schema_deployment.sql"
echo "   → Exécuter (RUN)"
echo ""
echo "4. Créer un utilisateur admin :"
echo "   → Voir QUICK_START.md"
echo ""
echo "5. Lancer l'application :"
echo "   → npm run dev"
echo "   → Ouvrir http://localhost:3000"
echo ""
echo "📖 Documentation : README.md"
echo "⚡ Démarrage rapide : QUICK_START.md"
echo ""
