'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { fetchOperations, fetchPayments, fetchAccounts, fetchVehicleDefinitions } from '@/lib/api';
import { useRequireAuth } from '@/lib/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Account, Reception, Payment } from '@/lib/types';

// Unified type for display
interface JournalEntry {
    id: string;
    date: string;
    originalType: string; // reception, livraison, encaissement, decaissement
    displayType: string;
    accountId: string;
    accountName: string;
    description: string;
    montant: number; // The main value
    commission?: number; // Only for sales
    isCredit: boolean; // Money IN / Positive Impact
}

export default function JournalPage() {
    const { loading: authLoading } = useRequireAuth();

    // Raw Data
    const [operations, setOperations] = useState<Reception[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);

    // Unified Data
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);

    // Filters
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        accountId: '',
        search: '', // Matches description (Vehicle, Ref, etc)
        type: 'all', // all, reception, livraison, paiement
    });

    // Loading & Error
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!authLoading) loadData();
    }, [authLoading]);

    async function loadData() {
        try {
            setLoading(true);
            const [ops, pays, accs] = await Promise.all([
                fetchOperations(),
                fetchPayments(),
                fetchAccounts()
            ]);

            setOperations(ops as Reception[]);
            setPayments(pays as Payment[]);
            setAccounts(accs);

            mergeAndProcessData(ops as Reception[], pays as Payment[], accs);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }

    function mergeAndProcessData(ops: Reception[], pays: Payment[], accs: Account[]) {
        const accMap = new Map(accs.map(a => [a.id, a.nom_compte]));
        const merged: JournalEntry[] = [];

        // Process Operations
        ops.forEach(op => {
            merged.push({
                id: op.id,
                date: op.date_operation,
                originalType: op.type_operation,
                displayType: op.type_operation === 'reception' ? 'Réception Stock' : 'Vente Véhicule',
                accountId: op.account_id,
                accountName: accMap.get(op.account_id) || 'Inconnu',
                description: `${op.marque} ${op.modele} - VIN: ${op.numero_chassis}`,
                montant: op.montant || 0,
                commission: op.commission || 0,
                isCredit: op.type_operation === 'livraison', // Sales brings money in (theoretically)
            });
        });

        // Process Payments
        pays.forEach(p => {
            // Warning: 'type_paiement' might be 'encaissement' or 'decaissement'
            // Need to check specific API response structure or use any, assuming similar to types.ts
            const isEncaissement = p.type_paiement === 'encaissement';
            merged.push({
                id: p.id,
                date: p.date_paiement,
                originalType: p.type_paiement,
                displayType: isEncaissement ? 'Encaissement' : 'Décaissement',
                accountId: p.account_id,
                accountName: accMap.get(p.account_id) || 'Inconnu',
                description: p.description || p.reference || 'Paiement',
                montant: p.montant || 0,
                commission: 0,
                isCredit: isEncaissement,
            });
        });

        // Sort Descending Date
        merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setEntries(merged);
        setFilteredEntries(merged);
    }

    // Filter Logic
    useEffect(() => {
        let res = entries;

        if (filters.dateFrom) {
            res = res.filter(e => e.date >= filters.dateFrom);
        }
        if (filters.dateTo) {
            res = res.filter(e => e.date <= filters.dateTo);
        }
        if (filters.accountId) {
            res = res.filter(e => e.accountId === filters.accountId);
        }
        if (filters.search) {
            const lower = filters.search.toLowerCase();
            res = res.filter(e =>
                e.description.toLowerCase().includes(lower) ||
                e.accountName.toLowerCase().includes(lower) ||
                (formatCurrency(e.montant)).includes(lower)
            );
        }
        if (filters.type !== 'all') {
            if (filters.type === 'paiement') {
                res = res.filter(e => e.originalType.includes('caiss'));
            } else {
                res = res.filter(e => e.originalType === filters.type);
            }
        }

        setFilteredEntries(res);
    }, [filters, entries]);

    // Totals Calculation based on FILTERED data
    const totals = {
        receptions: filteredEntries
            .filter(e => e.originalType === 'reception')
            .reduce((sum, e) => sum + e.montant, 0),
        sales: filteredEntries
            .filter(e => e.originalType === 'livraison')
            .reduce((sum, e) => sum + e.montant, 0),
        commissions: filteredEntries
            .reduce((sum, e) => sum + (e.commission || 0), 0),
        encaissements: filteredEntries
            .filter(e => e.originalType === 'encaissement')
            .reduce((sum, e) => sum + e.montant, 0),
        decaissements: filteredEntries
            .filter(e => e.originalType === 'decaissement')
            .reduce((sum, e) => sum + e.montant, 0),
    };

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center">⏳ Chargement...</div>;

    return (
        <div>
            <Navigation />
            <main className="flex-1 container-modern py-8">
                <PageHeader
                    title="Journal Global"
                    subtitle="Vue d'ensemble chronologique de toutes les opérations et paiements"
                    icon="📑"
                />

                {/* Filters */}
                <Card className="card-modern mb-8 !p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Date Début</label>
                            <Input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Date Fin</label>
                            <Input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Compte</label>
                            <Select
                                value={filters.accountId}
                                onChange={e => setFilters({ ...filters, accountId: e.target.value })}
                                options={[
                                    { value: '', label: 'Tous les comptes' },
                                    ...accounts.map(a => ({ value: a.id, label: a.nom_compte }))
                                ]}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
                            <Select
                                value={filters.type}
                                onChange={e => setFilters({ ...filters, type: e.target.value })}
                                options={[
                                    { value: 'all', label: 'Tout voir' },
                                    { value: 'reception', label: 'Réceptions' },
                                    { value: 'livraison', label: 'Ventes' },
                                    { value: 'paiement', label: 'Paiements' },
                                ]}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Recherche</label>
                            <Input placeholder="Véhicule, VIN, réf..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setFilters({ dateFrom: '', dateTo: '', accountId: '', search: '', type: 'all' })}>
                            🗑️ Réinitialiser filtres
                        </Button>
                    </div>
                </Card>

                {/* Totals Summary Cards (Sticky-ish effect?) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-semibold">Total Réceptions</p>
                        <p className="text-xl font-bold text-indigo-600">{formatCurrency(totals.receptions)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-semibold">Total Ventes</p>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(totals.sales)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm ring-1 ring-green-100">
                        <p className="text-xs text-green-700 uppercase font-bold">Total Commissions</p>
                        <p className="text-xl font-bold text-green-600">+{formatCurrency(totals.commissions)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-semibold">Encaissements</p>
                        <p className="text-xl font-bold text-emerald-600">+{formatCurrency(totals.encaissements)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-semibold">Décaissements</p>
                        <p className="text-xl font-bold text-red-600">-{formatCurrency(totals.decaissements)}</p>
                    </div>
                </div>

                {/* Data Table */}
                <Card className="card-modern">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Compte</th>
                                    <th>Description / Véhicule</th>
                                    <th className="text-right">Montant</th>
                                    <th className="text-right">Commission</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">Aucune donnée trouvée pour ces filtres.</td></tr>
                                ) : (
                                    filteredEntries.map(entry => (
                                        <tr key={`${entry.originalType}-${entry.id}`} className="hover:bg-gray-50">
                                            <td className="whitespace-nowrap font-mono text-sm">{formatDate(entry.date)}</td>
                                            <td>
                                                <Badge variant={
                                                    entry.originalType === 'reception' ? 'info' :
                                                        entry.originalType === 'livraison' ? 'success' :
                                                            entry.originalType === 'encaissement' ? 'primary' : 'warning'
                                                }>
                                                    {entry.displayType}
                                                </Badge>
                                            </td>
                                            <td className="font-medium text-gray-700">{entry.accountName}</td>
                                            <td className="text-sm text-gray-600">{entry.description}</td>
                                            <td className={`text-right font-mono font-semibold ${entry.originalType === 'reception' || entry.originalType === 'decaissement' ? 'text-red-600' : 'text-emerald-600'
                                                }`}>
                                                {entry.originalType === 'reception' || entry.originalType === 'decaissement' ? '-' : '+'}
                                                {formatCurrency(entry.montant)}
                                            </td>
                                            <td className="text-right text-sm">
                                                {entry.commission ? <span className="text-green-600 font-bold">+{formatCurrency(entry.commission)}</span> : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-gray-100 text-right text-gray-500 text-sm">
                        {filteredEntries.length} lignes affichées
                    </div>
                </Card>

            </main>
        </div>
    );
}
