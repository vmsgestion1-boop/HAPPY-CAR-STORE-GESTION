'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button, Input, Select } from '@/components/ui';
import { fetchAccountStatement, fetchAccounts, fetchCompanySettings } from '@/lib/api';
import { useRequireAuth, useRole } from '@/lib/hooks';
import { Account, AccountStatement, CompanySettings } from '@/lib/types';
import { formatDate, formatCurrency, formatCurrencySafe, downloadFile } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function StatementsPage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const { role, loading: roleLoading } = useRole();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statements, setStatements] = useState<AccountStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState('');
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (role === 'operateur') {
        router.push('/receptions');
        return;
      }
      loadAccounts();
    }
  }, [authLoading, roleLoading, role]);

  async function loadAccounts() {
    try {
      const [accs, settings] = await Promise.all([
        fetchAccounts(),
        fetchCompanySettings()
      ]);
      setAccounts(accs);
      setCompanySettings(settings);
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

    // Company Header
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

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(company.name, 20, 15);
    doc.text(`${company.address}, ${company.city}, ${company.country}`, 20, 20);
    doc.text(`Tél: ${company.phone || '-'} | Email: ${company.email || '-'}`, 20, 25);
    doc.text(`RC: ${company.rc || '-'} | NIF: ${company.nif || '-'}`, 20, 30);
    doc.text(`NIS: ${company.nis || '-'} | AI: ${company.ai || '-'}`, 20, 35);

    // Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`Releve de Compte`, 20, 40);

    // Client Info
    doc.setFontSize(12);
    doc.text(`${account?.nom_compte}`, 20, 50);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Compte: ${account?.code_compte}`, 20, 55);

    if (account?.nif) doc.text(`NIF: ${account.nif} | RC: ${account.rc || '-'}`, 20, 60);

    doc.text(`Genere le: ${formatDate(new Date())}`, 140, 15);

    // Table
    const tableData = statements.map((s) => [
      formatDate(s.date_operation),
      s.type_operation,
      formatCurrencySafe(s.montant),
      formatCurrencySafe(s.solde_cumule),
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Date', 'Type Operation', 'Montant', 'Solde Cumule']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] } as any,
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' }
      } as any
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

  if (authLoading || loading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center">⏳ Chargement...</div>;
  }

  if (role === 'operateur') return null;

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
                              stmt.type_operation === 'payment' ? 'bg-blue-100 text-blue-800' :
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
