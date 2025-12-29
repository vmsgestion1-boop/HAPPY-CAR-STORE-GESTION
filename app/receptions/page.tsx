'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { fetchOperations, createOperation, updateOperation, deleteOperation, fetchAccounts, createAccount, fetchVehicleDefinitions, createVehicleDefinition } from '@/lib/api';
import { useRequireAuth } from '@/lib/hooks';
import { Account, Reception, VehicleDefinition } from '@/lib/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { clsx } from 'clsx';

export default function ReceptionsPage() {
  const { loading: authLoading } = useRequireAuth();
  const [receptions, setReceptions] = useState<Reception[]>([]);
  const [filteredReceptions, setFilteredReceptions] = useState<Reception[]>([]); // New state
  const [livraisons, setLivraisons] = useState<Reception[]>([]); // To check for sold status
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vehicleDefs, setVehicleDefs] = useState<VehicleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Inline Creation States
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ nom_compte: '', code_compte: '' });
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ marque: '', modele: '', prix_achat_defaut: 0 });

  const [formData, setFormData] = useState({
    account_id: '',
    date_operation: '',
    type_operation: 'reception' as const,
    quantite: 1,
    prix_total_achat: 0, // Used for input: Total User Pays
    commission: 0,
    prix_base: 0, // Calculated: Total - Commission
    marque: '',
    modele: '',
  });

  const [vins, setVins] = useState<string[]>(['']);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading]);

  // VIN generation
  useEffect(() => {
    const qty = Math.max(1, Math.floor(formData.quantite));
    setVins(prev => {
      if (qty === prev.length) return prev;
      if (qty > prev.length) return [...prev, ...Array(qty - prev.length).fill('')];
      return prev.slice(0, qty);
    });
  }, [formData.quantite]);

  // Pricing Logic: Base Price = Total Price - Commission
  useEffect(() => {
    const total = formData.prix_total_achat || 0;
    const comm = formData.commission || 0;
    setFormData(prev => ({ ...prev, prix_base: total - comm }));
  }, [formData.prix_total_achat, formData.commission]);

  // Filter Effect
  useEffect(() => {
    let res = receptions;

    if (dateFrom) res = res.filter(r => r.date_operation >= dateFrom);
    if (dateTo) res = res.filter(r => r.date_operation <= dateTo);

    if (search) {
      const lower = search.toLowerCase();
      const accIds = accounts.filter(a => a.nom_compte.toLowerCase().includes(lower)).map(a => a.id);
      res = res.filter(r =>
        r.marque?.toLowerCase().includes(lower) ||
        r.modele?.toLowerCase().includes(lower) ||
        r.numero_chassis?.toLowerCase().includes(lower) ||
        accIds.includes(r.account_id)
      );
    }

    setFilteredReceptions(res);
  }, [search, dateFrom, dateTo, receptions, accounts]);

  async function loadData() {
    try {
      const [ops, accs, defs] = await Promise.all([
        fetchOperations(),
        fetchAccounts(),
        fetchVehicleDefinitions()
      ]);
      const recs = ops.filter((op) => op.type_operation === 'reception');
      const livs = ops.filter((op) => op.type_operation === 'livraison'); // Store deliveries
      setReceptions(recs);
      setFilteredReceptions(recs); // Init filtered
      setLivraisons(livs);
      setAccounts(accs.filter(a => a.type_compte === 'fournisseur')); // Filter only Payers
      setVehicleDefs(defs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const handleVehicleSelect = (defId: string) => {
    const def = vehicleDefs.find(d => d.id === defId);
    if (def) {
      setFormData(prev => ({
        ...prev,
        marque: def.marque,
        modele: def.modele,
        prix_total_achat: def.prix_achat_defaut || 0
      }));
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (editingId) {
        await updateOperation(editingId, {
          account_id: formData.account_id,
          date_operation: formData.date_operation,
          marque: formData.marque,
          modele: formData.modele,
          numero_chassis: vins[0],
          prix_unitaire: isNaN(Number(formData.prix_total_achat)) ? 0 : Number(formData.prix_total_achat),
          prix_achat: isNaN(Number(formData.prix_base)) ? 0 : Number(formData.prix_base),
          commission: isNaN(Number(formData.commission)) ? 0 : Number(formData.commission),
        });
      } else {
        const promises = vins.map(vin =>
          createOperation({
            account_id: formData.account_id,
            date_operation: formData.date_operation,
            type_operation: 'reception',
            marque: formData.marque,
            modele: formData.modele,
            quantite: 1,
            numero_chassis: vin,
            prix_unitaire: isNaN(Number(formData.prix_total_achat)) ? 0 : Number(formData.prix_total_achat),
            prix_achat: isNaN(Number(formData.prix_base)) ? 0 : Number(formData.prix_base),
            commission: isNaN(Number(formData.commission)) ? 0 : Number(formData.commission),
          })
        );
        await Promise.all(promises);
      }

      setFormData({
        account_id: '',
        date_operation: '',
        type_operation: 'reception',
        quantite: 1,
        prix_total_achat: 0,
        commission: 0,
        prix_base: 0,
        marque: '',
        modele: '',
      });
      setVins(['']);
      setEditingId(null);
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur inconnue est survenue');
      console.error('Submission Error:', err);
      // @ts-ignore
      if (err?.details) setError(`${err.message} - Détails: ${err.details} - Hint: ${err.hint}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleVinChange = (index: number, value: string) => {
    const newVins = [...vins];
    newVins[index] = value;
    setVins(newVins);
  };

  const handleEdit = (op: Reception) => {
    setEditingId(op.id);
    setFormData({
      account_id: op.account_id,
      date_operation: op.date_operation,
      type_operation: 'reception',
      quantite: 1,
      prix_total_achat: op.prix_unitaire || 0,
      commission: op.commission || 0,
      prix_base: op.prix_achat || 0,
      marque: op.marque || '',
      modele: op.modele || '',
    });
    setVins([op.numero_chassis || '']);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function handleQuickAccount(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await createAccount({
        nom_compte: newAccount.nom_compte,
        code_compte: newAccount.code_compte,
        type_compte: 'fournisseur',
        solde_initial: 0,
        actif: true
      });
      await loadData();
      setFormData(prev => ({ ...prev, account_id: created.id }));
      setShowAccountForm(false);
      setNewAccount({ nom_compte: '', code_compte: '' });
    } catch (err) {
      alert("Erreur lors de la création du compte");
    }
  }

  async function handleQuickVehicle(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await createVehicleDefinition(newVehicle);
      await loadData();
      handleVehicleSelect(created.id);
      setShowVehicleForm(false);
      setNewVehicle({ marque: '', modele: '', prix_achat_defaut: 0 });
    } catch (err) {
      alert("Erreur lors de la création du modèle");
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
          title="Gestion des Réceptions (Stock)"
          subtitle="Enregistrement des véhicules entrants"
          icon="📥"
          action={{
            label: showForm ? 'Annuler' : '➕ Nouvelle Réception',
            onClick: () => {
              if (showForm) {
                setEditingId(null);
                setFormData({
                  account_id: '', date_operation: '', type_operation: 'reception', quantite: 1,
                  prix_total_achat: 0, commission: 0, prix_base: 0, marque: '', modele: ''
                });
                setVins(['']);
              }
              setShowForm(!showForm);
            }
          }}
        />

        {error && (
          <div className="mb-6 bg-red-100 border border-red-200 text-red-800 p-4 rounded-xl font-mono text-sm whitespace-pre-wrap">
            ⚠️ ERREUR TECHNIQUE : {error}
          </div>
        )}

        {showForm && (
          <Card title={editingId ? "Modifier la Réception" : "Entrée en Stock"} subtitle={editingId ? "Mise à jour d'un véhicule existant" : "Définition du lot de véhicules"} className="card-modern mb-8 border-primary-200">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Step 1: Supplier & Vehicle Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Select
                        label="Fournisseur"
                        value={formData.account_id}
                        onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                        options={[
                          { value: '', label: 'Sélectionner un fournisseur' },
                          ...accounts.map(a => ({ value: a.id, label: `${a.nom_compte} (${a.code_compte})` }))
                        ]}
                        required
                      />
                    </div>
                    <Button type="button" variant="outline" className="mb-1" onClick={() => setShowAccountForm(!showAccountForm)}>
                      {showAccountForm ? '✕' : '➕'}
                    </Button>
                  </div>
                  {showAccountForm && (
                    <div className="mt-2 p-3 bg-white border rounded-lg shadow-sm space-y-3 animate-in fade-in slide-in-from-top-1">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Nom" value={newAccount.nom_compte} onChange={e => setNewAccount({ ...newAccount, nom_compte: e.target.value })} />
                        <Input placeholder="Code" value={newAccount.code_compte} onChange={e => setNewAccount({ ...newAccount, code_compte: e.target.value })} />
                      </div>
                      <Button size="sm" variant="primary" className="w-full" onClick={handleQuickAccount}>Créer Compte</Button>
                    </div>
                  )}
                </div>
                <Input
                  label="Date de Réception"
                  type="date"
                  value={formData.date_operation}
                  onChange={(e) => setFormData({ ...formData, date_operation: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Select
                        label="Modèle Véhicule"
                        value={vehicleDefs.find(d => d.marque === formData.marque && d.modele === formData.modele)?.id || ''}
                        onChange={(e) => handleVehicleSelect(e.target.value)}
                        options={[
                          { value: '', label: 'Choisir dans le catalogue' },
                          ...vehicleDefs.map(d => ({ value: d.id, label: `${d.marque} ${d.modele}` }))
                        ]}
                        required
                      />
                    </div>
                    <Button type="button" variant="outline" className="mb-1" onClick={() => setShowVehicleForm(!showVehicleForm)}>
                      {showVehicleForm ? '✕' : '➕'}
                    </Button>
                  </div>
                  {showVehicleForm && (
                    <div className="mt-2 p-3 bg-white border rounded-lg shadow-sm space-y-3 animate-in fade-in slide-in-from-top-1">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Marque" value={newVehicle.marque} onChange={e => setNewVehicle({ ...newVehicle, marque: e.target.value })} />
                        <Input placeholder="Modèle" value={newVehicle.modele} onChange={e => setNewVehicle({ ...newVehicle, modele: e.target.value })} />
                      </div>
                      <Input type="number" placeholder="Prix D'achat Défaut" value={newVehicle.prix_achat_defaut} onChange={e => setNewVehicle({ ...newVehicle, prix_achat_defaut: parseFloat(e.target.value) })} />
                      <Button size="sm" variant="primary" className="w-full" onClick={handleQuickVehicle}>Créer Modèle</Button>
                    </div>
                  )}
                </div>
                <Input
                  label="Quantité (Nb de Châssis)"
                  type="number"
                  min="1"
                  value={formData.quantite}
                  onChange={(e) => setFormData({ ...formData, quantite: parseInt(e.target.value) })}
                  required
                  disabled={!!editingId}
                />
              </div>

              {/* Step 2: Pricing */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <h3 className="text-sm font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  <span>💰 Configuration des Prix</span>
                  <span className="text-xs font-normal text-blue-600">(Par véhicule)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input
                    label="Prix d'Achat Brût (DA)"
                    type="number"
                    value={formData.prix_total_achat}
                    onChange={(e) => setFormData({ ...formData, prix_total_achat: parseFloat(e.target.value) })}
                    placeholder="0.00"
                    required
                  />
                  <Input
                    label="Commission (DA)"
                    type="number"
                    value={formData.commission}
                    onChange={(e) => setFormData({ ...formData, commission: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Prix de Revient (Calculé)</label>
                    <div className="text-xl font-bold text-gray-900 h-10 flex items-center">
                      {formatCurrency(formData.prix_base)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: VIN Entry */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Numéros de Châssis (VINs)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {vins.map((vin, index) => (
                    <div key={index} className="relative">
                      <Input
                        placeholder={`Châssis #${index + 1}`}
                        value={vin}
                        onChange={(e) => handleVinChange(index, e.target.value)}
                        className="font-mono text-sm uppercase"
                        required
                      />
                      <span className="absolute right-3 top-8 text-[10px] text-gray-400 font-mono">
                        {vin.length}/17
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button type="submit" variant="primary" size="lg" loading={isSubmitting} disabled={isSubmitting}>
                  {editingId ? '✅ Enregistrer les Modifications' : '✅ Valider la Réception'}
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={() => {
                  setEditingId(null);
                  setShowForm(false);
                }}>
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Receptions List */}
        <Card title="Historique des Réceptions" className="card-modern">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-200">
            <Input type="date" className="w-auto h-9" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <Input type="date" className="w-auto h-9" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <Input
              placeholder="Recherche (Fournisseur, Véhicule, VIN)..."
              className="w-64 h-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="ml-auto flex items-center text-sm text-gray-500">
              {filteredReceptions.length} réception(s)
            </div>
          </div>

          {/* List Table */}
          {filteredReceptions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucune réception trouvée.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Fournisseur</th>
                    <th>Véhicule</th>
                    <th>VIN</th>
                    <th className="text-right">Prix HT</th>
                    <th className="text-right">Commission</th>
                    <th className="text-right">Total</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceptions.map((op) => {
                    const account = accounts.find((a) => a.id === op.account_id);
                    const isSold = livraisons.some(l => l.numero_chassis === op.numero_chassis);

                    return (
                      <tr key={op.id}>
                        <td className="font-medium">{formatDate(op.date_operation)}</td>
                        <td>{account?.nom_compte || '---'}</td>
                        <td className="font-semibold">{op.marque} {op.modele}</td>
                        <td className="font-mono text-xs">{op.numero_chassis}</td>
                        <td className="text-right text-gray-500">{formatCurrency(op.prix_achat || 0)}</td>
                        <td className="text-right text-green-600 font-medium">+{formatCurrency(op.commission || 0)}</td>
                        <td className="text-right font-bold">{formatCurrency(op.montant || 0)}</td>
                        <td className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Badge variant={isSold ? 'success' : 'info'}>
                              {isSold ? 'Vendu' : 'En Stock'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(op)}
                              title="Modifier"
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={async () => {
                                if (isSold) {
                                  alert('Impossible de supprimer : véhicule déjà vendu.');
                                  return;
                                }
                                if (confirm('Supprimer cette réception ?')) {
                                  try {
                                    await deleteOperation(op.id);
                                    await loadData();
                                  } catch (e) {
                                    alert('Erreur lors de la suppression');
                                  }
                                }
                              }}
                            >
                              🗑️
                            </Button>
                          </div>
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
