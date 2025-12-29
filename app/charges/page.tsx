'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button, Input, Select } from '@/components/ui';
import { fetchCharges, createCharge, deleteCharge, fetchAccounts } from '@/lib/api';
import { useRequireAuth } from '@/lib/hooks';
import { Account, Charge } from '@/lib/types';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function ChargesPage() {
  const { loading: authLoading } = useRequireAuth();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    account_id: '',
    date_charge: '',
    description: '',
    montant: 0,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading]);

  async function loadData() {
    try {
      const [chgs, accs] = await Promise.all([fetchCharges(), fetchAccounts()]);
      setCharges(chgs);
      setAccounts(accs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCharge(formData);
      setFormData({ account_id: '', date_charge: '', description: '', montant: 0 });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save charge');
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
          title="Gestion des Charges"
          subtitle="Suivi des dépenses et charges fournisseurs"
          icon="💰"
          action={{
            label: '➕ Nouvelle Charge',
            onClick: () => setShowForm(!showForm),
          }}
        />

        {error && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-800 p-4 rounded-xl font-medium">
            ⚠️ {error}
          </div>
        )}

        {showForm && (
          <Card
            title="Enregistrer une Charge"
            subtitle="Détails de la dépense"
            className="card-modern mb-8"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Compte Associé"
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  options={accounts.map((a) => ({ value: a.id, label: `${a.code_compte} - ${a.nom_compte}` }))}
                  required
                />
                <Input
                  label="Date"
                  type="date"
                  value={formData.date_charge}
                  onChange={(e) => setFormData({ ...formData, date_charge: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Facture d'électricité"
                  required
                />
                <Input
                  label="Montant (€)"
                  type="number"
                  step="0.01"
                  value={formData.montant}
                  onChange={(e) => setFormData({ ...formData, montant: parseFloat(e.target.value) })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" variant="danger" size="lg">
                  💸 Enregistrer la charge
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setShowForm(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="card-modern">
          {charges.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">💰 Aucune charge enregistrée</p>
              <Button variant="secondary" onClick={() => setShowForm(true)}>
                ➕ Créer une charge
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Compte</th>
                    <th>Description</th>
                    <th className="text-right">Montant</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((charge) => {
                    const account = accounts.find((a) => a.id === charge.account_id);
                    return (
                      <tr key={charge.id}>
                        <td className="font-medium">{formatDate(charge.date_charge)}</td>
                        <td>{account?.nom_compte}</td>
                        <td className="text-gray-600">{charge.description}</td>
                        <td className="text-right font-semibold text-red-600">
                          -{formatCurrency(charge.montant)}
                        </td>
                        <td className="text-center">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              if (confirm('Êtes-vous sûr ?')) {
                                deleteCharge(charge.id).then(() => loadData());
                              }
                            }}
                          >
                            🗑️ Supprimer
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {charges.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Total: <span className="font-semibold text-gray-900">{charges.length} charge(s)</span>
              </p>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
