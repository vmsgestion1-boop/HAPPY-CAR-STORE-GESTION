'use client';

import { jsPDF } from 'jspdf';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button, Input, Select } from '@/components/ui';
import { fetchOperations, createOperation, updateOperation, deleteOperation, fetchAccounts, createAccount, fetchCompanySettings } from '@/lib/api';
import { useRequireAuth } from '@/lib/hooks';
import { Account, Reception, CompanySettings } from '@/lib/types';
import { formatDate, formatCurrency, formatCurrencySafe } from '@/lib/utils';
import _ from 'lodash';

export default function LivraisonsPage() {
  const { loading: authLoading } = useRequireAuth();
  const [livraisons, setLivraisons] = useState<Reception[]>([]);
  const [filteredLivraisons, setFilteredLivraisons] = useState<Reception[]>([]); // New state
  const [stock, setStock] = useState<Reception[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Inline Creation State
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ nom_compte: '', code_compte: '' });

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
  // It seems Sale Price is Fixed to the Cost Price (Total Cost from Reception).

  useEffect(() => {
    // If stock selected, auto-fill prices
    // Calculations done in handleVehicleSelect
  }, []);

  async function loadData() {
    try {
      const [ops, accs, settings] = await Promise.all([
        fetchOperations(),
        fetchAccounts(),
        fetchCompanySettings()
      ]);

      const livs = ops.filter((op) => op.type_operation === 'livraison');
      const receptions = ops.filter((op) => op.type_operation === 'reception');

      const soldVins = new Set(livs.map(l => l.numero_chassis).filter(Boolean));
      const availableStock = receptions.filter(r => !r.numero_chassis || !soldVins.has(r.numero_chassis));

      // Extract Unique Models for First Dropdown
      const models = Array.from(new Set(availableStock.map(r => `${r.marque} ${r.modele}`))).sort();

      setLivraisons(livs);
      setFilteredLivraisons(livs); // Init
      setStock(availableStock);
      setAvailableModels(models);
      setAccounts(accs);
      setCompanySettings(settings);
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
        prix_unitaire: vehicle.montant || 0,
        prix_achat: vehicle.prix_achat || 0,
        commission: vehicle.commission || 0,
        marque: vehicle.marque || '',
        modele: vehicle.modele || ''
      }));
    }
  };

  const handleEdit = (op: Reception) => {
    setEditingId(op.id);
    setFormData({
      account_id: op.account_id,
      date_operation: op.date_operation,
      type_operation: 'livraison',
      quantite: op.quantite,
      prix_unitaire: op.prix_unitaire || 0,
      prix_achat: op.prix_achat || 0,
      commission: op.commission || 0,
      marque: op.marque || '',
      modele: op.modele || '',
      numero_chassis: op.numero_chassis || '',
    });
    setSelectedModel(`${op.marque} ${op.modele}`);
    setFilteredStock(stock.filter(s => s.numero_chassis === op.numero_chassis || s.id === op.id));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function handleQuickAccount(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await createAccount({
        nom_compte: newAccount.nom_compte,
        code_compte: newAccount.code_compte,
        type_compte: 'client',
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


  // PDF Generation Function
  const generateDeliveryNote = (op: Reception) => {
    const account = accounts.find(a => a.id === op.account_id);
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('BON DE LIVRAISON', 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`N° Ops: ${op.id.substring(0, 8).toUpperCase()}`, 20, 30);
    doc.text(`Date: ${formatDate(op.date_operation)}`, 20, 35);

    // Company Info
    const company = companySettings || {
      name: 'VMS AUTOMOBILES',
      address: 'Zone Industrielle',
      city: 'Alger',
      country: 'Algérie',
      phone: '+213 555 00 00 00',
      email: 'contact@vms.dz',
      capital: '10 000 000 DA',
      rc: '16/00-0000000',
      nif: '0000000000',
      nis: '0000000000',
      ai: '0000000000'
    };

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(company.name, 195, 20, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(company.address, 195, 26, { align: 'right' });
    doc.text(`${company.city}, ${company.country}`, 195, 31, { align: 'right' });
    doc.text(`Tel: ${company.phone}`, 195, 36, { align: 'right' });
    doc.text(`Email: ${company.email}`, 195, 41, { align: 'right' });
    doc.text(`RC: ${company.rc} | Capital: ${company.capital || '-'}`, 195, 46, { align: 'right' });
    doc.text(`NIF: ${company.nif} | NIS: ${company.nis}`, 195, 51, { align: 'right' });
    doc.text(`AI: ${company.ai}`, 195, 56, { align: 'right' });

    // Client Info
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(20, 50, 170, 35, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('CLIENT:', 30, 60);
    doc.setFontSize(14);
    doc.text(account?.nom_compte || 'Client Inconnu', 30, 68);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Code: ${account?.code_compte || '-'}`, 30, 75);

    // Client Legal Info
    if (account?.nif) doc.text(`NIF: ${account.nif}`, 30, 80);
    if (account?.rc) doc.text(`RC: ${account.rc}`, 80, 80);
    if (account?.nis) doc.text(`NIS: ${account.nis}`, 30, 85);
    if (account?.ai) doc.text(`AI: ${account.ai}`, 80, 85);

    // Vehicle Details Table
    const startY = 100;
    doc.line(20, startY, 190, startY); // Top line
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('DESIGNATION', 25, startY + 8);
    doc.text('VIN / CHASSIS', 100, startY + 8);
    doc.text('PRIX (DA)', 160, startY + 8);
    doc.line(20, startY + 12, 190, startY + 12); // Header bottom line

    // Row
    doc.setFontSize(12);
    doc.text(`${op.marque} ${op.modele}`, 25, startY + 22);
    doc.setFontSize(10);
    doc.setFont('courier');
    doc.text(op.numero_chassis || '-', 100, startY + 22);
    doc.setFont('helvetica', 'bold');

    // Use PDF-safe formatter
    doc.text(formatCurrencySafe(op.montant), 160, startY + 22);

    doc.line(20, startY + 30, 190, startY + 30); // Row bottom

    // Total
    doc.setFontSize(14);
    doc.text('TOTAL NET A PAYER:', 100, 150);
    doc.setFontSize(16);
    doc.setTextColor(40, 100, 200); // Blue

    // Use PDF-safe formatter
    doc.text(formatCurrencySafe(op.montant), 160, 150);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Ce document tient lieu de preuve de livraison.', 20, 270);
    doc.text(`Genere le ${formatDate(new Date())}`, 20, 275);

    // Save
    doc.save(`BL_${op.marque}_${op.numero_chassis}.pdf`);
  };

  // Filter Effect
  useEffect(() => {
    let res = livraisons;

    if (dateFrom) res = res.filter(l => l.date_operation >= dateFrom);
    if (dateTo) res = res.filter(l => l.date_operation <= dateTo);

    if (search) {
      const lower = search.toLowerCase();
      const accIds = accounts.filter(a => a.nom_compte.toLowerCase().includes(lower)).map(a => a.id);
      res = res.filter(l =>
        l.marque?.toLowerCase().includes(lower) ||
        l.modele?.toLowerCase().includes(lower) ||
        l.numero_chassis?.toLowerCase().includes(lower) ||
        accIds.includes(l.account_id)
      );
    }

    setFilteredLivraisons(res);
  }, [search, dateFrom, dateTo, livraisons, accounts]);

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
      if (editingId) {
        await updateOperation(editingId, {
          account_id: formData.account_id,
          date_operation: formData.date_operation,
          quantite: formData.quantite,
          prix_unitaire: formData.prix_unitaire,
          prix_achat: formData.prix_achat,
          commission: formData.commission,
          marque: formData.marque,
          modele: formData.modele,
          numero_chassis: formData.numero_chassis,
        });
      } else {
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
        });
      }
      // Reset
      setShowForm(false);
      setEditingId(null);
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
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de l\'enregistrement');
      console.error('Livraison Error:', err);
      if (err?.details) setError(`${err.message} - Détails: ${err.details} - Hint: ${err.hint}`);
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
          action={{
            label: showForm ? 'Annuler' : '➕ Nouvelle Vente',
            onClick: () => {
              if (showForm) {
                setEditingId(null);
                setFormData({
                  account_id: '', date_operation: '', type_operation: 'livraison', quantite: 1,
                  prix_unitaire: 0, prix_achat: 0, commission: 0, marque: '', modele: '', numero_chassis: ''
                });
                setSelectedModel('');
              }
              setShowForm(!showForm);
            }
          }}
        />

        {error && <div className="mb-6 bg-red-100 border border-red-200 text-red-800 p-4 rounded-xl">⚠️ {error}</div>}

        {showForm && (
          <Card title={editingId ? "Modifier la Vente" : "Enregistrer une Vente"} className="card-modern mb-8 border-success-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Select
                        label="Client"
                        value={formData.account_id}
                        onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                        options={[
                          { value: '', label: 'Sélectionner un client' },
                          ...accounts.filter(a => a.type_compte === 'client').map((a) => ({ value: a.id, label: a.nom_compte }))
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
                        <Input placeholder="Nom Client" value={newAccount.nom_compte} onChange={e => setNewAccount({ ...newAccount, nom_compte: e.target.value })} />
                        <Input placeholder="Code" value={newAccount.code_compte} onChange={e => setNewAccount({ ...newAccount, code_compte: e.target.value })} />
                      </div>
                      <Button size="sm" variant="success" className="w-full" onClick={handleQuickAccount}>Créer Client</Button>
                    </div>
                  )}
                </div>
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
                  {editingId ? '✅ Enregistrer Modifications' : '✅ Valider Vente'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => {
                  setEditingId(null);
                  setShowForm(false);
                }} disabled={isSubmitting}>Annuler</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Livraisons List */}
        <Card title="Historique des Ventes" className="card-modern">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-200">
            <Input type="date" className="w-auto h-9" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <Input type="date" className="w-auto h-9" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <Input
              placeholder="Recherche (Client, Véhicule, VIN)..."
              className="w-64 h-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="ml-auto flex items-center text-sm text-gray-500">
              {filteredLivraisons.length} vente(s)
            </div>
          </div>

          {filteredLivraisons.length === 0 ? (
            <div className="text-center py-12"><p className="text-gray-500">Aucune vente trouvée.</p></div>
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
                  {filteredLivraisons.map((op) => {
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
                          <div className="flex gap-2 justify-center">
                            <Button size="sm" variant="outline" onClick={() => generateDeliveryNote(op)} title="Imprimer BL">🖨️</Button>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(op)} title="Modifier">✏️</Button>
                            <Button size="sm" variant="danger" onClick={() => { if (confirm('Supprimer?')) deleteOperation(op.id).then(loadData); }}>×</Button>
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
