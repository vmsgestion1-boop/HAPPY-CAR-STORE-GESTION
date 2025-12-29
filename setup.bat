@echo off
REM VMS GESTION - SETUP AUTOMATISÉ (Windows)
REM Ce script configure l'environnement complet

setlocal enabledelayedexpansion

echo.
echo 🚀 VMS GESTION - SETUP INITIAL
echo ================================

REM 1. Vérifier Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installé. Veuillez l'installer : https://nodejs.org
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js : %NODE_VERSION%

REM 2. Installer les dépendances
echo.
echo 📦 Installation des dépendances...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Erreur lors de l'installation des dépendances
    exit /b 1
)

REM 3. Créer .env.local s'il n'existe pas
if not exist ".env.local" (
    echo.
    echo ⚙️  Création de .env.local...
    copy .env.example .env.local
    echo ⚠️  Veuillez remplir .env.local avec vos clés Supabase
) else (
    echo ✅ .env.local existe déjà
)

REM 4. Afficher les prochaines étapes
echo.
echo ================================
echo ✅ SETUP COMPLÉTÉ !
echo ================================
echo.
echo 📝 Prochaines étapes :
echo.
echo 1. Configurer Supabase :
echo    → Aller sur https://supabase.com/dashboard
echo    → Créer un nouveau projet
echo    → Copier l'URL et les clés
echo.
echo 2. Remplir .env.local :
echo    → Éditer .env.local
echo    → Ajouter NEXT_PUBLIC_SUPABASE_URL
echo    → Ajouter NEXT_PUBLIC_SUPABASE_ANON_KEY
echo    → Ajouter SUPABASE_SERVICE_ROLE_KEY
echo.
echo 3. Déployer le schéma SQL :
echo    → Supabase Dashboard %% SQL Editor
echo    → Copier-coller backend/00_complete_schema_deployment.sql
echo    → Exécuter (RUN)
echo.
echo 4. Créer un utilisateur admin :
echo    → Voir QUICK_START.md
echo.
echo 5. Lancer l'application :
echo    → npm run dev
echo    → Ouvrir http://localhost:3000
echo.
echo 📖 Documentation : README.md
echo ⚡ Démarrage rapide : QUICK_START.md
echo.

pause
