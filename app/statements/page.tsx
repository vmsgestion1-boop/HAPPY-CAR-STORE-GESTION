'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button, Input, Select } from '@/components/ui';
import { fetchAccountStatement, fetchAccounts } from '@/lib/api';
import { useRequireAuth } from '@/lib/hooks';
import { Account, AccountStatement } from '@/lib/types';
import { formatDate, formatCurrency, downloadFile } from '@/lib/utils';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export default function StatementsPage() {
  const { loading: authLoading } = useRequireAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statements, setStatements] = useState<AccountStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      loadAccounts();
    }
  }, [authLoading]);

  async function loadAccounts() {
    try {
      const accs = await fetchAccounts();
      setAccounts(accs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadStatement() {
    if (!selectedAccount) {
      setError('Please select an account');
      return;
    }

    try {
      const data = await fetchAccountStatement(
        selectedAccount,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined
      );
      setStatements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statement');
    }
  }

  function exportPDF() {
    if (!selectedAccount || statements.length === 0) return;

    const account = accounts.find((a) => a.id === selectedAccount);
    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.text(`Relevé de Compte: ${account?.nom_compte}`, 20, 20);

    // Metadata
    doc.setFontSize(10);
    doc.text(`Compte: ${account?.code_compte}`, 20, 30);
    doc.text(`Généré le: ${formatDate(new Date())}`, 20, 40);

    // Table
    let yPos = 50;
    const headers = ['Date', 'Type', 'Montant', 'Solde'];
    const data = statements.map((s) => [
      formatDate(s.date_operation),
      s.type_operation,
      formatCurrency(s.montant),
      formatCurrency(s.solde_cumule),
    ]);

    // Simple table rendering
    doc.setFontSize(9);
    headers.forEach((header, i) => {
      doc.text(header, 20 + i * 50, yPos);
    });

    data.forEach((row, i) => {
      row.forEach((cell, j) => {
        doc.text(String(cell), 20 + j * 50, yPos + 10 + i * 10);
      });
    });

    doc.save(`releve_${account?.code_compte}_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  function exportExcel() {
    if (!selectedAccount || statements.length === 0) return;

    const account = accounts.find((a) => a.id === selectedAccount);
    const data = statements.map((s) => ({
      Date: formatDate(s.date_operation),
      Type: s.type_operation,
      Montant: s.montant,
      Solde: s.solde_cumule,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relevé');
    XLSX.writeFile(wb, `releve_${account?.code_compte}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">⏳ Chargement...</div>;
  }

  return (
    <div>
      <Navigation />

      <main className="flex-1 container-modern py-8">
        <PageHeader
          title="Relevés de Compte"
          subtitle="Consultez et exportez l'historique des transactions"
          icon="📋"
        />

        {error && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-800 p-4 rounded-xl font-medium">
            ⚠️ {error}
          </div>
        )}

        <Card title="Filtres de Recherche" subtitle="Sélectionnez un compte et une période" className="card-modern mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Select
              label="Compte"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              options={accounts.map((a) => ({ value: a.id, label: `${a.code_compte} - ${a.nom_compte}` }))}
            />
            <Input
              label="Date Début"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="Date Fin"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <div className="flex items-end">
              <Button variant="primary" className="w-full justify-center" onClick={handleLoadStatement}>
                🔍 Rechercher
              </Button>
            </div>
          </div>
        </Card>

        {statements.length > 0 && (
          <div className="flex gap-3 mb-6 justify-end">
            <Button variant="success" onClick={exportPDF} icon="📄">
              Exporter PDF
            </Button>
            <Button variant="success" onClick={exportExcel} icon="📊">
              Exporter Excel
            </Button>
          </div>
        )}

        {statements.length > 0 && (
          <Card className="card-modern">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th className="text-right">Montant</th>
                    <th className="text-right">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {statements.map((stmt) => (
                    <tr key={stmt.transaction_id}>
                      <td className="font-medium">{formatDate(stmt.date_operation)}</td>
                      <td className="capitalize">
                        <span className={`px-2 py-1 rounded text-sm ${stmt.type_operation === 'reception' ? 'bg-amber-100 text-amber-800' :
                            stmt.type_operation === 'livraison' ? 'bg-green-100 text-green-800' :
                              stmt.type_operation === 'charge' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                          }`}>
                          {stmt.type_operation}
                        </span>
                      </td>
                      <td
                        className={`text-right font-bold ${stmt.montant > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                      >
                        {stmt.montant > 0 ? '+' : ''}{formatCurrency(stmt.montant)}
                      </td>
                      <td className="text-right font-bold text-gray-900">{formatCurrency(stmt.solde_cumule)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
