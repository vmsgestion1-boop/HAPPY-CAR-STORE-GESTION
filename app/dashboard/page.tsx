'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Card, Button } from '@/components/ui';
import { fetchOperations, fetchAccountBalances, fetchPayments } from '@/lib/api';
import { useRequireAuth } from '@/lib/hooks';
import { formatCurrency } from '@/lib/utils';
import { AccountBalance, Payment, Reception } from '@/lib/types';

export default function DashboardPage() {
  const { loading: authLoading } = useRequireAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data States
  const [stats, setStats] = useState({
    totalCommissions: 0,
    totalSales: 0,
    totalReceptions: 0,
    totalClientDue: 0, // Ce que les clients nous doivent (Solde Clients)
    totalPayments: 0,
  });

  useEffect(() => {
    if (!authLoading) {
      loadDashboardData();
    }
  }, [authLoading]);

  async function loadDashboardData() {
    try {
      // Parallel Fetching for Performance
      const [operations, balances, payments] = await Promise.all([
        fetchOperations(),
        fetchAccountBalances(),
        fetchPayments()
      ]);

      calculateMetrics(operations as Reception[], balances, payments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  function calculateMetrics(ops: Reception[], bals: AccountBalance[], pays: any[]) {
    // 1. Total Commissions
    // Sum of commission from 'livraison' operations
    const totalCommissions = ops
      .filter(op => op.type_operation === 'livraison')
      .reduce((sum, op) => sum + (op.commission || 0), 0);

    // 2. Total Sales (Livraisons)
    const totalSales = ops
      .filter(op => op.type_operation === 'livraison')
      .reduce((sum, op) => sum + (op.montant || 0), 0);

    // 3. Total Receptions (Stock Purchases)
    const totalReceptions = ops
      .filter(op => op.type_operation === 'reception')
      .reduce((sum, op) => sum + (op.montant || 0), 0);

    // 4. Client Balances (What clients owe us)
    // Client owes us if solde_actuel < 0
    const clientBalances = bals
      .filter(b => b.type_compte === 'client' && b.solde_actuel < 0)
      .reduce((sum, b) => sum + Math.abs(b.solde_actuel || 0), 0);

    // 5. Total Payments (Cash Flow - Just a sum of all recorded payments for now)
    const totalPayments = pays.reduce((sum, p) => sum + (p.montant || 0), 0);

    setStats({
      totalCommissions,
      totalSales,
      totalReceptions,
      totalClientDue: clientBalances,
      totalPayments
    });
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl animate-pulse">⏳ Calcul des finances...</div>
      </div>
    );
  }

  const statCards = [
    {
      label: '💰 Total Commissions',
      value: stats.totalCommissions,
      sub: 'Gains nets sur ventes',
      color: 'from-emerald-500 to-emerald-600',
      textColor: 'text-emerald-600',
    },
    {
      label: '📈 Total Ventes',
      value: stats.totalSales,
      sub: 'Chiffre d\'affaires',
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
    },
    {
      label: '📥 Valeur Stock (Achat)',
      value: stats.totalReceptions,
      sub: 'Total Réceptions',
      color: 'from-indigo-500 to-indigo-600',
      textColor: 'text-indigo-600',
    },
    {
      label: '👥 Solde Clients',
      value: stats.totalClientDue,
      sub: 'Position globale',
      color: 'from-amber-500 to-amber-600',
      textColor: 'text-amber-600',
    },
  ];

  return (
    <div>
      <Navigation />

      <main className="flex-1 container-modern py-8">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Tableau de Bord</h1>
            <p className="text-gray-500">Vue d'ensemble et performances financières</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadDashboardData}>🔄 Actualiser</Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">
            ⚠️ {error}
          </div>
        )}

        {/* 1. Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {statCards.map((stat, idx) => (
            <div key={idx} className={`card-modern bg-gradient-to-br ${stat.color} p-6 text-white relative overflow-hidden group`}>
              {/* Background Texture Effect */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform"></div>

              <p className="text-white/90 text-sm font-medium mb-1 relative z-10">{stat.label}</p>
              <h3 className="text-3xl font-bold relative z-10 tracking-tight">{formatCurrency(stat.value)}</h3>
              <p className="text-xs text-white/70 mt-2 relative z-10 border-t border-white/20 pt-2">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* 2. Quick Actions */}
          <div className="lg:col-span-2">
            <Card title="⚡ Actions Rapides" className="card-modern h-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button variant="primary" size="lg" className="justify-center h-16 text-lg" onClick={() => router.push('/receptions')}>
                  📥 Nouvelle Réception
                </Button>
                <Button variant="success" size="lg" className="justify-center h-16 text-lg" onClick={() => router.push('/livraisons')}>
                  📤 Nouvelle Vente
                </Button>
                <Button variant="secondary" className="justify-center h-12" onClick={() => router.push('/accounts')}>
                  👥 Créer Compte
                </Button>
                <Button variant="outline" className="justify-center h-12" onClick={() => router.push('/payments')}>
                  💳 Nouveau Paiement
                </Button>
                <Button variant="ghost" className="justify-center h-12 border border-dashed border-gray-300" onClick={() => router.push('/vehicules')}>
                  🚗 Catalogue Voitures
                </Button>
                <Button variant="ghost" className="justify-center h-12 border border-dashed border-gray-300" onClick={() => router.push('/stock')}>
                  🅿️ Voir le Stock
                </Button>
              </div>
            </Card>
          </div>

          {/* 3. Secondary Metrics / Info */}
          <div>
            <Card title="📊 Résumé Activité" className="card-modern h-full">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-600">Total Encaissements</span>
                    <span className="font-bold text-gray-900">{formatCurrency(stats.totalPayments)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Raccourcis Finance</h4>
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" size="sm" className="justify-start text-gray-600 hover:text-primary-600" onClick={() => router.push('/statements')}>
                      📄 Relevés de Compte
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start text-gray-600 hover:text-primary-600" onClick={() => router.push('/charges')}>
                      💸 Gestion des Charges
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
