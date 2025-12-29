'use client';

import { useRequireAuth } from '@/lib/hooks';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button } from '@/components/ui';

export default function AdminPage() {
  const { loading: authLoading } = useRequireAuth();

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">⏳ Chargement...</div>;
  }

  return (
    <div>
      <Navigation />

      <main className="flex-1 container-modern py-8">
        <PageHeader
          title="Administration"
          subtitle="Outils de gestion et maintenance"
          icon="⚙️"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Gestion des Utilisateurs" subtitle="Via Supabase" className="card-modern h-full">
            <div className="space-y-4">
              <p className="text-gray-600">
                La gestion des utilisateurs (création, droits d'accès, mots de passe) se fait directement via le tableau de bord Supabase.
              </p>
              <div className="pt-2">
                <Button variant="primary" onClick={() => window.open('https://supabase.com/dashboard', '_blank')}>
                  Accéder à Supabase Dashboard →
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Logs d'Audit" subtitle="Traçabilité" className="card-modern h-full">
            <div className="space-y-4">
              <p className="text-gray-600">
                Les logs d'audit enregistrent toutes les modifications de données (créations, modifications, suppressions).
              </p>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-sm text-blue-900 font-medium">
                ℹ️ Les logs sont consultables via la vue SQL : <code className="bg-white px-2 py-1 rounded border border-blue-100 mx-1">public.audit_logs</code>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8">
          <Card title="Maintenance Système" subtitle="Opérations sensibles" className="card-modern border-l-4 border-l-yellow-500">
            <div className="bg-yellow-50/50 p-6 rounded-xl border border-yellow-100">
              <h3 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                ⚠️ Zone de Danger
              </h3>
              <p className="text-sm text-yellow-800 mb-4">
                Les opérations suivantes ne peuvent être effectuées que par un administrateur ayant les droits "Super Admin" :
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <li className="flex items-center gap-2 text-yellow-900 bg-white p-3 rounded-lg border border-yellow-200 shadow-sm">
                  🛑 Suppression définitive de comptes
                </li>
                <li className="flex items-center gap-2 text-yellow-900 bg-white p-3 rounded-lg border border-yellow-200 shadow-sm">
                  🔐 Modification des permissions
                </li>
                <li className="flex items-center gap-2 text-yellow-900 bg-white p-3 rounded-lg border border-yellow-200 shadow-sm">
                  🧹 Purge des logs d'audit
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
