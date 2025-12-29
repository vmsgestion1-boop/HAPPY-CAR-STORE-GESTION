'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/hooks';
import { fetchOperations } from '@/lib/api';
import { Reception as Operation } from '@/lib/types';
import { Navigation } from '@/components/navigation';
import { Card, Badge } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { formatCurrency, formatDate } from '@/lib/utils';
import _ from 'lodash';

export default function StockPage() {
    const { loading: authLoading } = useRequireAuth();
    const [loading, setLoading] = useState(true);
    const [stock, setStock] = useState<Operation[]>([]);
    const [stats, setStats] = useState({ count: 0, totalValue: 0 });

    useEffect(() => {
        if (!authLoading) loadData();
    }, [authLoading]);

    async function loadData() {
        try {
            const ops = await fetchOperations();

            // Calculate Stock: Vehicles Received but NOT Sold
            // 1. Get all Sold VINs
            const soldVins = new Set(
                ops
                    .filter(op => op.type_operation === 'livraison' && op.numero_chassis)
                    .map(op => op.numero_chassis)
            );

            // 2. Filter Receptions that are NOT in Sold VINs
            const currentStock = ops.filter(op =>
                op.type_operation === 'reception' &&
                op.numero_chassis &&
                !soldVins.has(op.numero_chassis)
            );

            setStock(currentStock);

            // Calculate Stats
            const totalVal = currentStock.reduce((sum, item) => sum + (Number(item.montant) || 0), 0);
            setStats({
                count: currentStock.length,
                totalValue: totalVal
            });

        } catch (err) {
            console.error('Failed to load stock', err);
        } finally {
            setLoading(false);
        }
    }

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center">⏳ Chargement...</div>;

    return (
        <div>
            <Navigation />
            <main className="flex-1 container-modern py-8">
                <PageHeader
                    title="État du Stock"
                    subtitle="Vue détaillée des véhicules actuellement en parc"
                    icon="🚗"
                />

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Card variant="gradient" className="from-blue-600 to-blue-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl text-2xl">🚙</div>
                            <div>
                                <p className="text-blue-100 font-medium">Véhicules en Stock</p>
                                <div className="text-3xl font-bold">{stats.count}</div>
                            </div>
                        </div>
                    </Card>

                    <Card variant="gradient" className="from-emerald-600 to-emerald-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl text-2xl">💰</div>
                            <div>
                                <p className="text-emerald-100 font-medium">Valeur Totale du Stock</p>
                                <div className="text-3xl font-bold">{formatCurrency(stats.totalValue)}</div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Stock Table */}
                <Card title="Détail du Parc" subtitle="Liste des numéros de châssis disponibles">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-600">Véhicule</th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-600">VIN (Châssis)</th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-600">Date Entrée</th>
                                    <th className="text-right py-4 px-4 font-semibold text-gray-600">Prix Achat (Base)</th>
                                    <th className="text-right py-4 px-4 font-semibold text-gray-600">Commission</th>
                                    <th className="text-right py-4 px-4 font-semibold text-gray-600">Prix Revient (Total)</th>
                                    <th className="text-center py-4 px-4 font-semibold text-gray-600">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {stock.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-gray-500">Aucun véhicule en stock</td>
                                    </tr>
                                ) : (
                                    stock.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="font-bold text-gray-900">{item.marque}</div>
                                                <div className="text-sm text-gray-500">{item.modele}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 border border-gray-200">
                                                    {item.numero_chassis}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-gray-600">
                                                {formatDate(item.date_operation)}
                                            </td>
                                            <td className="py-4 px-4 text-right text-gray-600 font-medium">
                                                {formatCurrency(item.prix_achat || 0)}
                                            </td>
                                            <td className="py-4 px-4 text-right text-emerald-600">
                                                + {formatCurrency(item.commission || 0)}
                                            </td>
                                            <td className="py-4 px-4 text-right font-bold text-gray-900">
                                                {formatCurrency(item.montant || 0)}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <Badge variant="success" size="sm">En Stock</Badge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </main>
        </div>
    );
}
