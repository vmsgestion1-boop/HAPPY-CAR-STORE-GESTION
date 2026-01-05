'use client';

import { jsPDF } from 'jspdf';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button, Input, Select } from '@/components/ui';
import { fetchOperations, createOperation, updateOperation, deleteOperation, fetchAccounts, createAccount, fetchCompanySettings, fetchPayments, createPayment } from '@/lib/api';
import { useRequireAuth, useRole } from '@/lib/hooks';
import { Account, Reception, CompanySettings, Payment } from '@/lib/types';
import { formatDate, formatCurrency, formatCurrencySafe } from '@/lib/utils';
import clsx from 'clsx';
import _ from 'lodash';

export default function LivraisonsPage() {
  const { loading: authLoading } = useRequireAuth();
  const { isManager, loading: roleLoading } = useRole();
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

  // Payment State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [maxPayment, setMaxPayment] = useState(0);
  const [paymentFormData, setPaymentFormData] = useState({
    account_id: '',
    date_paiement: new Date().toISOString().split('T')[0],
    type_paiement: 'encaissement' as const,
    montant: 0,
    mode_paiement: 'especes',
    reference: '',
    description: '',
    operation_id: '',
  });

  // Inline Creation State
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ nom_compte: '', code_compte: '' });

  // Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetailsOp, setSelectedDetailsOp] = useState<Reception | null>(null);

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
      const [ops, accs, settings, pays] = await Promise.all([
        fetchOperations(),
        fetchAccounts(),
        fetchCompanySettings(),
        fetchPayments()
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
      setPayments(pays);
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

  const handleQuickPayment = (op: Reception) => {
    const opPayments = payments.filter(p => p.operation_id === op.id);
    const totalPaid = _.sumBy(opPayments, 'montant');
    const remaining = Math.max(0, op.montant - totalPaid);

    setPaymentFormData({
      account_id: op.account_id,
      date_paiement: new Date().toISOString().split('T')[0],
      type_paiement: 'encaissement',
      montant: remaining,
      mode_paiement: 'especes',
      reference: `Paiement BL ${op.numero_chassis?.substring(0, 10) || op.id.substring(0, 8)}`,
      description: `Paiement pour livraison ${op.marque} ${op.modele} ${op.numero_chassis || ''}`,
      operation_id: op.id,
    });
    setMaxPayment(remaining);
    setShowPaymentModal(true);
  };

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (paymentFormData.montant <= 0) {
      alert("Le montant doit être supérieur à 0");
      return;
    }
    if (paymentFormData.montant > maxPayment + 0.01) { // small tolerance for float
      alert("Le montant dépasse le solde du bon");
      return;
    }

    try {
      setLoading(true);
      await createPayment(paymentFormData);
      setShowPaymentModal(false);
      await loadData();
      alert("Paiement enregistré avec succès");
    } catch (err) {
      alert("Erreur lors de l'enregistrement du paiement");
    } finally {
      setLoading(false);
    }
  }


  // PDF Generation Function
  const generateDeliveryNote = (op: Reception) => {
    const account = accounts.find(a => a.id === op.account_id);
    const doc = new jsPDF();

    // Header
    doc.setFontSize(26);
    doc.setTextColor(50, 50, 50);
    doc.text('BON DE LIVRAISON', 15, 22);

    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(`N° Ops: ${op.id.substring(0, 8).toUpperCase()}`, 15, 32);
    doc.text(`Date: ${formatDate(op.date_operation)}`, 15, 38);

    // Company Info (Right aligned)
    const company = {
      name: 'SARL HAPPY CAR STORE',
      address: 'CHERARBA EUCALYPTUS',
      city: 'Alger',
      country: 'Algérie',
      phone: '+213 770 935 445',
      email: 'contact@vms-autos.dz',
      capital: '20 000 000.00 DA',
      rc: '16/00-1234567B16',
      nif: '001616123456789',
      nis: '001216012345678',
      ai: '001234567890123'
    };

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name, 195, 22, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(company.address, 195, 29, { align: 'right' });
    doc.text(`${company.city}, ${company.country}`, 195, 35, { align: 'right' });
    doc.text(`Tel: ${company.phone}`, 195, 41, { align: 'right' });
    doc.text(`Email: ${company.email}`, 195, 47, { align: 'right' });
    doc.text(`RC: ${company.rc} | Capital: ${company.capital}`, 195, 53, { align: 'right' });
    doc.text(`NIF: ${company.nif} | NIS: ${company.nis}`, 195, 59, { align: 'right' });
    doc.text(`AI: ${company.ai}`, 195, 65, { align: 'right' });

    // Client Info Container
    const clientBoxY = 75;
    doc.setFillColor(248, 250, 252); // Light Slate color for modern feel
    doc.roundedRect(15, clientBoxY, 180, 45, 4, 4, 'F');

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text('CLIENT:', 25, clientBoxY + 12);

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(account?.nom_compte || 'Client Inconnu', 25, clientBoxY + 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Code: ${account?.code_compte || '-'}`, 25, clientBoxY + 32);

    // Client Legal Info inside Box
    if (account?.nif) doc.text(`NIF: ${account.nif}`, 25, clientBoxY + 38);
    if (account?.rc) doc.text(`RC: ${account.rc}`, 100, clientBoxY + 38);
    if (account?.nis) doc.text(`NIS: ${account.nis}`, 25, clientBoxY + 44);
    if (account?.ai) doc.text(`AI: ${account.ai}`, 100, clientBoxY + 44);

    // Vehicle Details Table
    const startY = 130;
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
    doc.setFontSize(11);
    doc.text(formatCurrencySafe(op.montant), 190, startY + 22, { align: 'right' });

    doc.line(15, startY + 30, 195, startY + 30);

    // Total Section
    const totalPaid = _.sumBy(payments.filter(p => p.operation_id === op.id), 'montant');
    const remaining = Math.max(0, op.montant - totalPaid);
    const summaryY = startY + 50; // Increased spacing

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Montant Total BL:', 110, summaryY);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrencySafe(op.montant), 195, summaryY, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Déjà Versé:', 110, summaryY + 12);
    doc.setTextColor(34, 197, 94); // Green-600
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrencySafe(totalPaid), 195, summaryY + 12, { align: 'right' });

    // Net à Payer (Solde)
    const soldeY = summaryY + 28;
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLDE A REGLER:', 110, soldeY);

    doc.setFontSize(16);
    if (remaining > 0) {
      doc.setTextColor(220, 38, 38); // Red-600
    } else {
      doc.setTextColor(34, 197, 94); // Green-600
    }
    doc.text(formatCurrencySafe(remaining), 195, soldeY, { align: 'right' });

    // Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Ce document tient lieu de preuve de livraison.', 15, 270);
    doc.text(`Généré le ${formatDate(new Date())}`, 15, 275);

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

  if (authLoading || loading || roleLoading) return <div className="min-h-screen flex items-center justify-center">⏳ Chargement...</div>;

  return (
    <div>
      <Navigation />
      <main className="flex-1 max-w-[98%] mx-auto px-4 py-8">
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

              {/* Pricing Display (Read Only) - Only for Managers */}
              {isManager && (
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
              )}

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

        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card title="💸 Enregistrer un Paiement" className="w-full max-w-lg shadow-2xl border-primary-200">
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg text-sm border border-blue-100 flex justify-between items-center">
                  <div>
                    <span className="text-blue-600 block text-xs">Solde à payer</span>
                    <span className="font-bold text-lg text-blue-900">{formatCurrency(maxPayment)}</span>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPaymentFormData({ ...paymentFormData, montant: maxPayment })}>Solder</Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Date"
                    type="date"
                    value={paymentFormData.date_paiement}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, date_paiement: e.target.value })}
                    required
                  />
                  <Input
                    label="Montant (DA)"
                    type="number"
                    step="0.01"
                    max={maxPayment}
                    value={paymentFormData.montant}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, montant: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                <Select
                  label="Mode de Paiement"
                  value={paymentFormData.mode_paiement}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, mode_paiement: e.target.value })}
                  options={[
                    { value: 'virement', label: 'Virement Bancaire' },
                    { value: 'cheque', label: 'Chèque' },
                    { value: 'especes', label: 'Espèces' },
                  ]}
                  required
                />

                <Input
                  label="Référence / Libellé"
                  value={paymentFormData.reference}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
                />

                <div className="flex gap-3 pt-4 border-t">
                  <Button type="submit" variant="primary" className="flex-1 shadow-lg shadow-primary-200">Enregistrer</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowPaymentModal(false)}>Annuler</Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {showDetailsModal && selectedDetailsOp && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card title={`Détails des paiements : ${selectedDetailsOp.marque} ${selectedDetailsOp.modele}`} subtitle={`VIN: ${selectedDetailsOp.numero_chassis}`} className="w-full max-w-2xl card-modern">
              <div className="mb-6 bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-slate-200">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Vente</span>
                  <span className="font-bold text-xl text-slate-900">{formatCurrency(selectedDetailsOp.montant)}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Reste à payer</span>
                  <span className={clsx("font-bold text-xl", (selectedDetailsOp.montant - _.sumBy(payments.filter(p => p.operation_id === selectedDetailsOp.id), 'montant')) > 0 ? "text-red-600" : "text-green-600")}>
                    {formatCurrency(Math.max(0, selectedDetailsOp.montant - _.sumBy(payments.filter(p => p.operation_id === selectedDetailsOp.id), 'montant')))}
                  </span>
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto mb-6 border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Référence</th>
                      <th className="px-4 py-3 text-left">Mode</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.filter(p => p.operation_id === selectedDetailsOp.id).length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">Aucun paiement enregistré pour ce bon.</td></tr>
                    ) : (
                      payments.filter(p => p.operation_id === selectedDetailsOp.id).map(p => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">{formatDate(p.date_paiement)}</td>
                          <td className="px-4 py-3 text-slate-600">{p.reference || '-'}</td>
                          <td className="px-4 py-3 capitalize text-slate-600">{p.mode_paiement}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">+{formatCurrency(p.montant)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button variant="primary" onClick={() => setShowDetailsModal(false)} className="px-8 shadow-lg shadow-primary-100">Fermer</Button>
              </div>
            </Card>
          </div>
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="[&_th]:px-2">
                    <th>Date</th>
                    <th>Client</th>
                    <th>Véhicule</th>
                    <th>VIN</th>
                    {isManager && <th className="text-right">Prix Base</th>}
                    {isManager && <th className="text-center bg-green-50">Commission</th>}
                    <th className="text-right">Total Vente</th>
                    <th className="text-right">Déjà Payé</th>
                    <th className="text-right">Solde</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:px-2">
                  {filteredLivraisons.map((op) => {
                    const account = accounts.find((a) => a.id === op.account_id);
                    const commission = op.commission || ((op.prix_unitaire || 0) - (op.prix_achat || 0));
                    const opPayments = payments.filter(p => p.operation_id === op.id);
                    const totalPaid = _.sumBy(opPayments, 'montant');
                    const remaining = Math.max(0, op.montant - totalPaid);
                    return (
                      <tr key={op.id}>
                        <td className="font-medium">{formatDate(op.date_operation)}</td>
                        <td>{account?.nom_compte}</td>
                        <td className="font-semibold">{op.marque} {op.modele}</td>
                        <td className="font-mono text-xs">{op.numero_chassis}</td>
                        {isManager && <td className="text-right text-gray-500">{formatCurrency(op.prix_achat || 0)}</td>}
                        {isManager && (
                          <td className="text-center bg-green-50/30">
                            <span className="font-bold text-green-700">+{formatCurrency(commission)}</span>
                          </td>
                        )}
                        <td className="text-right font-bold">{formatCurrency(op.montant)}</td>
                        <td className="text-right text-green-600 font-medium">
                          {totalPaid > 0 && `+${formatCurrency(totalPaid)}`}
                        </td>
                        <td className={clsx("text-right font-bold", remaining > 0 ? "text-red-600" : "text-green-600")}>
                          {formatCurrency(remaining)}
                        </td>
                        <td className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Button size="sm" variant="outline" onClick={() => { setSelectedDetailsOp(op); setShowDetailsModal(true); }} title="Détails des paiements">ℹ️</Button>
                            {remaining > 0 && (
                              <Button size="sm" variant="success" onClick={() => handleQuickPayment(op)} title="Enregistrer un paiement">💸</Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => generateDeliveryNote(op)} title="Imprimer BL">🖨️</Button>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(op)} title="Modifier">✏️</Button>
                            {isManager && (
                              <Button size="sm" variant="danger" onClick={() => { if (confirm('Supprimer?')) deleteOperation(op.id).then(loadData); }}>×</Button>
                            )}
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
