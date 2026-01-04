'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { fetchAccountBalances, fetchPayments, createPayment, fetchAccounts } from '@/lib/api';
import { useRequireAuth } from '@/lib/hooks';
import { Account, AccountBalance, Payment } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import clsx from 'clsx';

export default function FinancePage() {
    const { loading: authLoading } = useRequireAuth();
    const [balances, setBalances] = useState<AccountBalance[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        account_id: '',
        date_paiement: '',
        type_paiement: 'encaissement' as 'encaissement' | 'decaissement',
        montant: 0,
        mode_paiement: 'virement',
        reference: '',
        description: '',
    });

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        dateFrom: '',
        dateTo: '',
        type: 'all' // all, encaissement, decaissement
    });
    const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
    const [error, setError] = useState('');

    // Computed totals
    // Creances (Clients): Client owes us if solde_actuel < 0 (due to livraisons being -)
    const totalCreances = balances.filter(b => b.solde_actuel < 0 && b.type_compte === 'client').reduce((acc, curr) => acc + Math.abs(curr.solde_actuel), 0);
    // Dettes (Fournisseurs): We owe supplier if solde_actuel > 0 (due to receptions being +)
    const totalDettes = balances.filter(b => b.solde_actuel > 0 && b.type_compte === 'fournisseur').reduce((acc, curr) => acc + curr.solde_actuel, 0);

    // Filter Effect
    useEffect(() => {
        let res = payments;

        if (filters.dateFrom) res = res.filter(p => p.date_paiement >= filters.dateFrom);
        if (filters.dateTo) res = res.filter(p => p.date_paiement <= filters.dateTo);
        if (filters.type !== 'all') res = res.filter(p => p.type_paiement === filters.type);
        if (filters.search) {
            const lower = filters.search.toLowerCase();
            const accIds = accounts.filter(a => a.nom_compte.toLowerCase().includes(lower)).map(a => a.id);
            res = res.filter(p =>
                accIds.includes(p.account_id) ||
                (p.description && p.description.toLowerCase().includes(lower)) ||
                (p.reference && p.reference.toLowerCase().includes(lower))
            );
        }

        setFilteredPayments(res);
    }, [filters, payments, accounts]);

    useEffect(() => {
        if (!authLoading) {
            loadData();
        }
    }, [authLoading]);

    async function loadData() {
        try {
            const [bals, pays, accs] = await Promise.all([
                fetchAccountBalances(),
                fetchPayments(),
                fetchAccounts()
            ]);
            setBalances(bals);
            setPayments(pays);
            setFilteredPayments(pays);
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
            await createPayment(formData);
            setFormData({
                account_id: '',
                date_paiement: new Date().toISOString().split('T')[0],
                type_paiement: 'encaissement',
                montant: 0,
                mode_paiement: 'virement',
                reference: '',
                description: '',
            });
            setShowForm(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save payment');
        }
    }

    function handleSettle(balance: AccountBalance) {
        const amount = Math.abs(balance.solde_actuel);
        const type = balance.type_compte === 'client' ? 'encaissement' : 'decaissement';

        setFormData({
            account_id: balance.account_id,
            date_paiement: new Date().toISOString().split('T')[0],
            type_paiement: type,
            montant: amount,
            mode_paiement: 'especes',
            reference: 'Règlement Solde',
            description: `Règlement total du solde pour ${balance.nom_compte}`,
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (authLoading || loading) {
        return <div className="min-h-screen flex items-center justify-center">⏳ Chargement...</div>;
    }

    return (
        <div>
            <Navigation />

            <main className="flex-1 container-modern py-8">
                <PageHeader
                    title="Gestion Financière"
                    subtitle="Suivi de trésorerie, créances clients et dettes fournisseurs"
                    icon="💰"
                    action={{
                        label: '➕ Enregistrer un Paiement',
                        onClick: () => setShowForm(!showForm),
                    }}
                />

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Card variant="gradient" className="from-green-500 to-emerald-600">
                        <h3 className="text-lg font-medium text-white/90 mb-2">Créances Clients (À recevoir)</h3>
                        <p className="text-4xl font-bold text-white">{formatCurrency(totalCreances)}</p>
                    </Card>
                    <Card variant="gradient" className="from-red-500 to-rose-600">
                        <h3 className="text-lg font-medium text-white/90 mb-2">Dettes Fournisseurs (À payer)</h3>
                        <p className="text-4xl font-bold text-white">{formatCurrency(totalDettes)}</p>
                    </Card>
                </div>

                {error && (
                    <div className="mb-6 bg-red-100 border border-red-200 text-red-800 p-4 rounded-xl">
                        ⚠️ {error}
                    </div>
                )}

                {showForm && (
                    <Card title="Nouveau Paiement / Règlement" className="card-modern mb-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Select
                                    label="Type de Mouvement"
                                    value={formData.type_paiement}
                                    onChange={(e) => setFormData({ ...formData, type_paiement: e.target.value as any })}
                                    options={[
                                        { value: 'encaissement', label: '📥 Encaissement (Entrée d\'argent)' },
                                        { value: 'decaissement', label: '📤 Décaissement (Sortie d\'argent)' },
                                    ]}
                                    required
                                />
                                <Select
                                    label="Compte Tiers"
                                    value={formData.account_id}
                                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                                    options={accounts.map((a) => ({ value: a.id, label: `${a.code_compte} - ${a.nom_compte}` }))}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Input
                                    label="Date"
                                    type="date"
                                    value={formData.date_paiement}
                                    onChange={(e) => setFormData({ ...formData, date_paiement: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Montant (DA)"
                                    type="number"
                                    step="0.01"
                                    value={formData.montant}
                                    onChange={(e) => setFormData({ ...formData, montant: parseFloat(e.target.value) })}
                                    required
                                />
                                <Select
                                    label="Mode de Paiement"
                                    value={formData.mode_paiement}
                                    onChange={(e) => setFormData({ ...formData, mode_paiement: e.target.value })}
                                    options={[
                                        { value: 'virement', label: 'Virement Bancaire' },
                                        { value: 'cheque', label: 'Chèque' },
                                        { value: 'especes', label: 'Espèces' },
                                        { value: 'carte', label: 'Carte Bancaire' },
                                    ]}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                    label="Référence (N° Chèque/Virement)"
                                    value={formData.reference}
                                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                />
                                <Input
                                    label="Description / Libellé"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button type="submit" variant="primary">Enregistrer</Button>
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                            </div>
                        </form>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Payments List */}
                    <Card title="Historique des Paiements" className="card-modern">
                        {/* Filters Toolbar */}
                        <div className="flex flex-wrap gap-2 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-200">
                            <Input type="date" className="w-auto h-9" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} />
                            <Input type="date" className="w-auto h-9" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} />
                            <Select
                                value={filters.type}
                                onChange={e => setFilters({ ...filters, type: e.target.value })}
                                options={[{ value: 'all', label: 'Tout' }, { value: 'encaissement', label: 'Encaissement' }, { value: 'decaissement', label: 'Décaissement' }]}
                                className="w-auto h-9"
                            />
                            <Input
                                placeholder="Recherche..."
                                className="w-40 h-9"
                                value={filters.search}
                                onChange={e => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>

                        {filteredPayments.length === 0 ? (
                            <p className="text-gray-500 italic">Aucun paiement enregistré.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th className="px-2">Date</th>
                                            <th className="px-2">Tiers</th>
                                            <th className="px-2">Type</th>
                                            <th className="px-2 text-right">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPayments.slice(0, 50).map((p) => {
                                            const acc = accounts.find(a => a.id === p.account_id);
                                            return (
                                                <tr key={p.id} className="hover:bg-gray-50">
                                                    <td className="px-2 py-2">{formatDate(p.date_paiement)}</td>
                                                    <td className="px-2 py-2 truncate max-w-[120px]">{acc?.nom_compte || '-'}</td>
                                                    <td className="px-2 py-2">
                                                        <Badge variant={p.type_paiement === 'encaissement' ? 'success' : 'warning'} size="sm">
                                                            {p.type_paiement === 'encaissement' ? 'Encaissement' : 'Décaissement'}
                                                        </Badge>
                                                    </td>
                                                    <td className={clsx("px-2 py-2 text-right font-bold", p.type_paiement === 'encaissement' ? 'text-green-600' : 'text-red-600')}>
                                                        {p.type_paiement === 'encaissement' ? '+' : '-'}{formatCurrency(p.montant)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Balances List */}
                    <Card title="Soldes des Tiers" className="card-modern">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="px-2">Compte</th>
                                        <th className="px-2">Type</th>
                                        <th className="px-2 text-right">Solde</th>
                                        <th className="px-2 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {balances.filter(b => Math.abs(b.solde_actuel) > 0.01).map((b) => {
                                        const isClient = b.type_compte === 'client';
                                        const isDebt = isClient ? b.solde_actuel < 0 : b.solde_actuel > 0;
                                        return (
                                            <tr key={b.account_id} className="hover:bg-gray-50">
                                                <td className="px-2 py-2 font-medium">{b.nom_compte}</td>
                                                <td className="px-2 py-2 capitalize text-gray-500">{b.type_compte}</td>
                                                <td className={clsx("px-2 py-2 text-right font-bold", isDebt ? 'text-red-600' : 'text-green-600')}>
                                                    {formatCurrency(Math.abs(b.solde_actuel))}
                                                    <span className="text-[10px] ml-1 opacity-50">
                                                        {isDebt ? '(À payer/recevoir)' : '(Crédit)'}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant={isDebt ? "primary" : "outline"}
                                                        onClick={() => handleSettle(b)}
                                                        className="h-7 text-[10px] px-2"
                                                    >
                                                        {isDebt ? '💰 Solder' : '💸 Ajuster'}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
