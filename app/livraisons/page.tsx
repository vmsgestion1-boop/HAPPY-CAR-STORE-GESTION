'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button, Input, Select } from '@/components/ui';
import { fetchOperations, createOperation, deleteOperation, fetchAccounts } from '@/lib/api';
import { useRequireAuth } from '@/lib/hooks';
import { Account, Reception } from '@/lib/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import _ from 'lodash';

export default function LivraisonsPage() {
  const { loading: authLoading } = useRequireAuth();
  const [operations, setOperations] = useState<Reception[]>([]);
  const [stock, setStock] = useState<Reception[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Selection Logic
  const [selectedModel, setSelectedModel] = useState(''); // "Marque Model"
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [filteredStock, setFilteredStock] = useState<Reception[]>([]);

  const [formData, setFormData] = useState({
    account_id: '',
    date_operation: '',
    type_operation: 'livraison' as const,
    quantite: 1,
    prix_unitaire: 0,
    prix_achat: 0,
    commission: 0,
    marque: '',
    modele: '',
    numero_chassis: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading]);

  // Pricing Logic: Total Price = Purchase Price (Total from Reception)
  // Wait, user said: "PRIX DCHAT = PRIX DE VENTE"
  // This implies the Sale Price IS the Reception Price?
  // Or "PRIX DCHAT = PRIX ACHAT DE BASE + COMMISSION" ? 
  // User last said: "PRIX D ACHAT = PRIX ACHAT DE BASE + COMMISSION" (on Reception)
  // And on Delivery: "PRIX DCHAT = PRIX DE VENTE POUR CALUCULER LES COMMISSIONS"
  // It seems Sale Price is Fixed to the Cost Price (Total Cost from Reception)?
  // Let's assume Sale Price = Reception Total Price (Cost + Commission).

  useEffect(() => {
    // If stock selected, auto-fill prices
    // Calculations done in handleVehicleSelect
  }, []);

  async function loadData() {
    try {
      const [ops, accs] = await Promise.all([fetchOperations(), fetchAccounts()]);

      const livraisons = ops.filter((op) => op.type_operation === 'livraison');
      const receptions = ops.filter((op) => op.type_operation === 'reception');

      const soldVins = new Set(livraisons.map(l => l.numero_chassis).filter(Boolean));
      const availableStock = receptions.filter(r => !r.numero_chassis || !soldVins.has(r.numero_chassis));

      // Extract Unique Models for First Dropdown
      const models = Array.from(new Set(availableStock.map(r => `${r.marque} ${r.modele}`))).sort();

      setOperations(livraisons);
      setStock(availableStock);
      setAvailableModels(models);
      setAccounts(accs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  // Step 1: Filter Stock by Model
  const handleModelSelect = (modelName: string) => {
    setSelectedModel(modelName);
    const filtered = stock.filter(r => `${r.marque} ${r.modele}` === modelName);
    setFilteredStock(filtered);

    // Reset selections
    setFormData(prev => ({
      ...prev,
      marque: modelName.split(' ')[0] || '',
      modele: modelName.split(' ').slice(1).join(' ') || '',
      numero_chassis: '',
      prix_achat: 0,
      prix_unitaire: 0,
      commission: 0
    }));
  };

  // Step 2: Select Specific VIN
  const handleVehicleSelect = (receptionId: string) => {
    const vehicle = stock.find(s => s.id === receptionId);
    if (vehicle) {
      setFormData(prev => ({
        ...prev,
        numero_chassis: vehicle.numero_chassis || '',
        // Logic: 
        // Selling Price = Reception Price (which included Commission)
        // Cost Price = Base Price (Reception Price - Commission)
        prix_unitaire: vehicle.montant || 0, // Sell at the Total Price
        prix_achat: vehicle.prix_achat || 0, // Base Cost
        commission: vehicle.commission || 0 // The commission gained
      }));
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.account_id) {
      setError('Veuillez sélectionner un client.');
      return;
    }
    if (!formData.date_operation) {
      setError('Veuillez sélectionner une date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createOperation({
        account_id: formData.account_id,
        date_operation: formData.date_operation,
        type_operation: 'livraison',
        quantite: formData.quantite,
        prix_unitaire: formData.prix_unitaire,
        prix_achat: formData.prix_achat,
        commission: formData.commission,
        marque: formData.marque,
        modele: formData.modele,
        numero_chassis: formData.numero_chassis,
        // montant: is generated by DB
      });
      // Reset
      setShowForm(false);
      setSelectedModel('');
      setFilteredStock([]);
      setFormData({
        account_id: '',
        date_operation: '',
        type_operation: 'livraison',
        quantite: 1,
        prix_unitaire: 0,
        prix_achat: 0,
        commission: 0,
        marque: '',
        modele: '',
        numero_chassis: '',
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save operation');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center">⏳ Chargement...</div>;

  return (
    <div>
      <Navigation />
      <main className="flex-1 container-modern py-8">
        <PageHeader
          title="Gestion des Livraisons"
          subtitle="Vente de véhicules et suivi des commissions"
          icon="📤"
          action={{ label: '➕ Nouvelle Vente', onClick: () => setShowForm(!showForm) }}
        />

        {error && <div className="mb-6 bg-red-100 border border-red-200 text-red-800 p-4 rounded-xl">⚠️ {error}</div>}

        {showForm && (
          <Card title="Enregistrer une Vente" className="card-modern mb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Client"
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  options={accounts.map((a) => ({ value: a.id, label: a.nom_compte }))}
                  required
                />
                <Input
                  label="Date de Vente"
                  type="date"
                  value={formData.date_operation}
                  onChange={(e) => setFormData({ ...formData, date_operation: e.target.value })}
                  required
                />
              </div>

              {/* Advanced Stock Selection */}
              <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-4">🚙 Sélection du Véhicule</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Step 1: Model */}
                  <Select
                    label="1. Choisir le Modèle"
                    value={selectedModel}
                    onChange={(e) => handleModelSelect(e.target.value)}
                    options={[
                      { value: '', label: '-- Modèles en Stock --' },
                      ...availableModels.map(m => ({ value: m, label: m }))
                    ]}
                  />

                  {/* Step 2: VIN */}
                  <Select
                    label="2. Choisir le N° Châssis (VIN)"
                    value={filteredStock.find(s => s.numero_chassis === formData.numero_chassis)?.id || ''}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                    options={[
                      { value: '', label: '-- Sélectionner VIN --' },
                      ...filteredStock.map(v => ({
                        value: v.id,
                        label: `${v.numero_chassis} (Prix: ${formatCurrency(v.montant)})`
                      }))
                    ]}
                    disabled={!selectedModel}
                  />
                </div>
              </div>

              {/* Pricing Display (Read Only) */}
              <div className="p-5 bg-green-50/50 rounded-xl border border-green-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Prix Achat Base</label>
                    <div className="text-xl font-mono text-gray-700">{formatCurrency(formData.prix_achat)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-600 mb-1">Commission</label>
                    <div className="text-xl font-bold text-green-700">+{formatCurrency(formData.commission)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Prix de Vente Total</label>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(formData.prix_unitaire)}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="success" size="lg" loading={isSubmitting} disabled={isSubmitting}>
                  ✅ Valider Vente
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)} disabled={isSubmitting}>Annuler</Button>
              </div>
            </form>
          </Card>
        )}

        {/* List */}
        <Card className="card-modern">
          {operations.length === 0 ? (
            <div className="text-center py-12"><p className="text-gray-500">Aucune vente.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Véhicule</th>
                    <th>VIN</th>
                    <th className="text-right">Prix Base</th>
                    <th className="text-center bg-green-50">Commission</th>
                    <th className="text-right">Total Vente</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op) => {
                    const account = accounts.find((a) => a.id === op.account_id);
                    const commission = op.commission || ((op.prix_unitaire || 0) - (op.prix_achat || 0));
                    return (
                      <tr key={op.id}>
                        <td className="font-medium">{formatDate(op.date_operation)}</td>
                        <td>{account?.nom_compte}</td>
                        <td className="font-semibold">{op.marque} {op.modele}</td>
                        <td className="font-mono text-xs">{op.numero_chassis}</td>
                        <td className="text-right text-gray-500">{formatCurrency(op.prix_achat || 0)}</td>
                        <td className="text-center bg-green-50/30">
                          <span className="font-bold text-green-700">+{formatCurrency(commission)}</span>
                        </td>
                        <td className="text-right font-bold">{formatCurrency(op.montant)}</td>
                        <td className="text-center">
                          <Button size="sm" variant="danger" onClick={() => { if (confirm('Supprimer?')) deleteOperation(op.id).then(loadData); }}>×</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
