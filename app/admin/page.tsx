'use client';

import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/lib/hooks';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button, Input } from '@/components/ui';
import { fetchCompanySettings, updateCompanySettings } from '@/lib/api';
import { CompanySettings } from '@/lib/types';

export default function AdminPage() {
  const { loading: authLoading } = useRequireAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading) {
      loadSettings();
    }
  }, [authLoading]);

  async function loadSettings() {
    try {
      const data = await fetchCompanySettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setIsSubmitting(true);
    setMessage('');

    try {
      await updateCompanySettings(settings);
      setMessage('✅ Paramètres mis à jour avec succès');
    } catch (err) {
      console.error(err);
      setMessage('❌ Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">⏳ Chargement...</div>;
  }

  return (
    <div>
      <Navigation />

      <main className="flex-1 container-modern py-8">
        <PageHeader
          title="Administration"
          subtitle="Configuration de la société et maintenance"
          icon="⚙️"
        />

        <div className="grid grid-cols-1 gap-6">
          {/* Company Settings Form */}
          <Card title="Information Société" subtitle="Ces informations apparaissent sur les factures et documents" className="card-modern">
            {settings ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nom de la Société"
                    value={settings.name}
                    onChange={e => setSettings({ ...settings, name: e.target.value })}
                  />
                  <Input
                    label="Capital Social"
                    value={settings.capital}
                    onChange={e => setSettings({ ...settings, capital: e.target.value })}
                  />
                  <Input
                    label="Adresse"
                    value={settings.address}
                    onChange={e => setSettings({ ...settings, address: e.target.value })}
                  />
                  <Input
                    label="Ville"
                    value={settings.city}
                    onChange={e => setSettings({ ...settings, city: e.target.value })}
                  />
                  <Input
                    label="Pays"
                    value={settings.country}
                    onChange={e => setSettings({ ...settings, country: e.target.value })}
                  />
                  <Input
                    label="Téléphone"
                    value={settings.phone}
                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                  />
                  <Input
                    label="Email"
                    value={settings.email}
                    onChange={e => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>

                <h4 className="font-semibold text-gray-700 mt-4 border-b pb-2">Identifiants Légaux</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="NIF"
                    value={settings.nif}
                    onChange={e => setSettings({ ...settings, nif: e.target.value })}
                  />
                  <Input
                    label="RC"
                    value={settings.rc}
                    onChange={e => setSettings({ ...settings, rc: e.target.value })}
                  />
                  <Input
                    label="NIS"
                    value={settings.nis}
                    onChange={e => setSettings({ ...settings, nis: e.target.value })}
                  />
                  <Input
                    label="AI"
                    value={settings.ai}
                    onChange={e => setSettings({ ...settings, ai: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button type="submit" variant="primary" loading={isSubmitting}>
                    💾 Enregistrer les modifications
                  </Button>
                  {message && <span className={message.startsWith('✅') ? 'text-green-600' : 'text-red-600'}>{message}</span>}
                </div>
              </form>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Impossible de charger les paramètres. Vérifiez la migration de la base de données (backend/migration_v8_company_settings.sql).
              </div>
            )}
          </Card>

          <Card title="Gestion des Utilisateurs" subtitle="Via Supabase" className="card-modern">
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                Gérez les accès utilisateurs, mots de passe et rôles directement sur Supabase.
              </p>
              <Button variant="outline" onClick={() => window.open('https://supabase.com/dashboard', '_blank')}>
                Supabase Dashboard →
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-8">
          <Card title="Maintenance Système" subtitle="Zone de Danger" className="card-modern border-l-4 border-l-red-500">
            <div className="bg-red-50 p-4 rounded text-red-800">
              Les opérations de suppression définitive sont irréversibles.
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
