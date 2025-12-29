'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { fetchAccounts, createAccount, updateAccount, deleteAccount } from '@/lib/api';
import { useRequireAuth } from '@/lib/hooks';
import { Account } from '@/lib/types';

export default function AccountsPage() {
  const { loading: authLoading } = useRequireAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    code_compte: string;
    nom_compte: string;
    type_compte: 'client' | 'fournisseur' | 'interne';
    solde_initial: number;
  }>({
    code_compte: '',
    nom_compte: '',
    type_compte: 'client',
    solde_initial: 0,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      loadAccounts();
    }
  }, [authLoading]);

  async function loadAccounts() {
    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (editingId) {
        await updateAccount(editingId, formData);
      } else {
        await createAccount(formData as any);
      }
      setFormData({ code_compte: '', nom_compte: '', type_compte: 'client', solde_initial: 0 });
      setEditingId(null);
      setShowForm(false);
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    // Safety Check: Check if account has operations
    // Note: We need a way to check this. For now, we'll try to delete and catch FK error.
    // Ideally, we'd have an API `checkAccountUsage(id)`.
    // Let's implement the 'Catch Error' strategy which is reliability without extra API overhead for now.

    if (confirm('Êtes-vous sûr de vouloir supprimer ce compte ?')) {
      try {
        await deleteAccount(id);
        await loadAccounts();
      } catch (err: any) {
        // Check for Postgres Foreign Key Violation (Code 23503)
        // Supabase error object usually contains 'code'
        if (err?.code === '23503' || err?.message?.includes('violates foreign key constraint')) {
          setError('Impossible de supprimer ce compte car il est lié à des opérations (Réceptions, Livraisons, Paiements).');
        } else {
          setError(err instanceof Error ? err.message : 'Échec de la suppression');
        }
      }
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
          title="Gestion des Comptes"
          subtitle="Gérez et suivez tous vos comptes clients, fournisseurs et internes"
          icon="👥"
          action={{
            label: '➕ Nouveau Compte',
            onClick: () => {
              setEditingId(null);
              setFormData({ code_compte: '', nom_compte: '', type_compte: 'client', solde_initial: 0 });
              setShowForm(!showForm);
            },
          }}
        />

        {error && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-800 p-4 rounded-xl font-medium">
            ⚠️ {error}
          </div>
        )}

        {showForm && (
          <Card
            title={editingId ? 'Modifier le Compte' : 'Créer un Nouveau Compte'}
            subtitle="Remplissez les informations du compte"
            className="card-modern mb-8"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Code Compte"
                  value={formData.code_compte}
                  onChange={(e) => setFormData({ ...formData, code_compte: e.target.value })}
                  placeholder="ex: C001"
                  required
                />
                <Input
                  label="Nom du Compte"
                  value={formData.nom_compte}
                  onChange={(e) => setFormData({ ...formData, nom_compte: e.target.value })}
                  placeholder="ex: Acme Corp"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Type de Compte"
                  value={formData.type_compte}
                  onChange={(e) => setFormData({ ...formData, type_compte: e.target.value as any })}
                  options={[
                    { value: 'client', label: '👤 Client' },
                    { value: 'fournisseur', label: '🏢 Fournisseur' },
                    { value: 'interne', label: '🏦 Interne' },
                  ]}
                />
                <Input
                  label="Solde Initial (€)"
                  type="number"
                  step="0.01"
                  value={formData.solde_initial}
                  onChange={(e) => setFormData({ ...formData, solde_initial: parseFloat(e.target.value) })}
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" variant="primary" size="lg" loading={isSubmitting} disabled={isSubmitting}>
                  {editingId ? '✅ Mettre à jour' : '✅ Créer le compte'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={isSubmitting}
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ code_compte: '', nom_compte: '', type_compte: 'client', solde_initial: 0 });
                    setEditingId(null);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Accounts Table */}
        <Card className="card-modern">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Nom du Compte</th>
                  <th>Type</th>
                  <th className="text-right">Solde Initial</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      Aucun compte trouvé. Créez un nouveau compte pour commencer.
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id}>
                      <td className="font-semibold text-primary-600">{account.code_compte}</td>
                      <td className="font-medium">{account.nom_compte}</td>
                      <td>
                        <Badge
                          variant={
                            account.type_compte === 'client'
                              ? 'primary'
                              : account.type_compte === 'fournisseur'
                                ? 'secondary'
                                : 'info'
                          }
                          size="sm"
                        >
                          {account.type_compte === 'client'
                            ? '👤 Client'
                            : account.type_compte === 'fournisseur'
                              ? '🏢 Fournisseur'
                              : '🏦 Interne'}
                        </Badge>
                      </td>
                      <td className="text-right font-semibold">{account.solde_initial.toFixed(2)} €</td>
                      <td className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setFormData({
                                code_compte: account.code_compte,
                                nom_compte: account.nom_compte,
                                type_compte: account.type_compte,
                                solde_initial: account.solde_initial,
                              });
                              setEditingId(account.id);
                              setShowForm(true);
                            }}
                          >
                            ✏️ Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(account.id)}
                          >
                            🗑️ Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {accounts.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100 text-sm text-gray-600">
              <p>Total: <span className="font-semibold text-gray-900">{accounts.length} compte(s)</span></p>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
