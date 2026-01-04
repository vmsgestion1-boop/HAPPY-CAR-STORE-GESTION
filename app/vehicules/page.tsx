'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button, Input } from '@/components/ui';
import { fetchVehicleDefinitions, createVehicleDefinition, deleteVehicleDefinition, fetchOperations } from '@/lib/api';
import { useRequireAuth, useRole } from '@/lib/hooks';
import { VehicleDefinition } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export default function VehicleDefinitionsPage() {
    const { loading: authLoading } = useRequireAuth();
    const { isManager, loading: roleLoading } = useRole();
    const [defs, setDefs] = useState<VehicleDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        marque: '',
        modele: '',
        reference: '',
        prix_achat_defaut: 0,
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (!authLoading) {
            loadData();
        }
    }, [authLoading]);

    async function loadData() {
        try {
            const data = await fetchVehicleDefinitions();
            setDefs(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            await createVehicleDefinition(formData);
            setFormData({ marque: '', modele: '', reference: '', prix_achat_defaut: 0 });
            setShowForm(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save vehicle');
        }
    }

    async function handleDelete(id: string) {
        const def = defs.find(d => d.id === id);
        if (!def) return;

        // Manual Safety Check (No DB FK)
        // Check if any reception uses this Marque/Modele
        try {
            const ops = await fetchOperations();
            const isInUse = ops.some(op =>
                op.type_operation === 'reception' &&
                op.marque === def.marque &&
                op.modele === def.modele
            );

            if (isInUse) {
                alert('Impossible de supprimer ce modèle : Il est utilisé dans des réceptions existantes.');
                return;
            }

            if (confirm('Supprimer ce modèle de véhicule ?')) {
                await deleteVehicleDefinition(id);
                await loadData();
            }
        } catch (err) {
            console.error(err);
            setError('Erreur lors de la vérification ou de la suppression.');
        }
    }

    if (authLoading || loading || roleLoading) return <div className="min-h-screen flex items-center justify-center">⏳</div>;

    return (
        <div>
            <Navigation />
            <main className="flex-1 container-modern py-8">
                <PageHeader
                    title="Catalogue Véhicules"
                    subtitle="Définissez les modèles de véhicules disponibles pour les réceptions"
                    icon="🚗"
                    action={{ label: '➕ Nouveau Modèle', onClick: () => setShowForm(!showForm) }}
                />

                {error && (
                    <div className="mb-6 bg-red-100 border border-red-200 text-red-800 p-4 rounded-xl">
                        ⚠️ {error}
                    </div>
                )}

                {showForm && (
                    <Card title="Ajouter un Modèle" className="card-modern mb-8">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Marque"
                                    value={formData.marque}
                                    onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                                    placeholder="Toyota"
                                    required
                                />
                                <Input
                                    label="Modèle"
                                    value={formData.modele}
                                    onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
                                    placeholder="Yaris"
                                    required
                                />
                                <Input
                                    label="Référence (Optionnel)"
                                    value={formData.reference}
                                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                    placeholder="REF-001"
                                />
                                <Input
                                    label="Prix Achat Défaut (DA)"
                                    type="number"
                                    value={formData.prix_achat_defaut}
                                    onChange={(e) => setFormData({ ...formData, prix_achat_defaut: parseFloat(e.target.value) })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                                <Button type="submit" variant="primary">Enregistrer</Button>
                            </div>
                        </form>
                    </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {defs.map((def) => (
                        <div key={def.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
                            {isManager && (
                                <button
                                    onClick={() => handleDelete(def.id)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    🗑️
                                </button>
                            )}
                            <h3 className="font-bold text-lg text-gray-900">{def.marque} {def.modele}</h3>
                            {def.reference && <p className="text-sm text-gray-500 font-mono mb-2">{def.reference}</p>}
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-sm text-gray-500">Prix Défaut</span>
                                <span className="font-semibold text-primary-700">{formatCurrency(def.prix_achat_defaut || 0)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
