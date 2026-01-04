'use client';

import { useEffect, useState } from 'react';
import { useRequireAuth, useRole } from '@/lib/hooks';
import { Navigation } from '@/components/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, Button, Input } from '@/components/ui';
import { fetchCompanySettings, updateCompanySettings, adminCreateUser, adminListUsers, adminUpdateUser } from '@/lib/api';
import { CompanySettings } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { loading: authLoading } = useRequireAuth();
  const { role, isAdmin, loading: roleLoading } = useRole();
  const router = useRouter();

  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // User Creation & List State
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'operateur' });
  const [userLoading, setUserLoading] = useState(false);
  const [userMsg, setUserMsg] = useState({ type: '', text: '' });

  const [editingUser, setEditingUser] = useState<any | null>(null);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      loadSettings();
      loadUsers();
    }
  }, [authLoading, roleLoading, role, router]);

  async function loadUsers() {
    try {
      const data = await adminListUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  }

  async function loadSettings() {
    try {
      const data = await fetchCompanySettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setIsSubmitting(true);
    setMessage('');

    try {
      await updateCompanySettings(settings);
      setMessage('✅ Paramètres mis à jour avec succès');
    } catch (err) {
      console.error(err);
      setMessage('❌ Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setUserLoading(true);
    setUserMsg({ type: '', text: '' });

    try {
      await adminCreateUser(newUser);
      setUserMsg({ type: 'success', text: '✅ Utilisateur créé avec succès' });
      setNewUser({ email: '', password: '', role: 'operateur' });
      loadUsers();
    } catch (err) {
      setUserMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la création' });
    } finally {
      setUserLoading(false);
    }
  }

  async function handleUpdateRole(userId: string, newRole: string) {
    try {
      await adminUpdateUser(userId, newRole);
      setEditingUser(null);
      loadUsers();
      alert('Rôle mis à jour avec succès');
    } catch (err) {
      alert('Erreur lors de la mise à jour');
    }
  }

  if (authLoading || loading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center">⏳ Chargement...</div>;
  }

  return (
    <div>
      <Navigation />

      <main className="flex-1 container-modern py-8">
        <PageHeader
          title="Administration"
          subtitle="Configuration de la société et maintenance"
          icon="⚙️"
        />

        <div className="grid grid-cols-1 gap-6">
          {/* Company Settings Form */}
          <Card title="Information Société" subtitle="Ces informations apparaissent sur les factures et documents" className="card-modern">
            {settings ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nom de la Société"
                    value={settings.name}
                    onChange={e => setSettings({ ...settings, name: e.target.value })}
                  />
                  <Input
                    label="Capital Social"
                    value={settings.capital}
                    onChange={e => setSettings({ ...settings, capital: e.target.value })}
                  />
                  <Input
                    label="Adresse"
                    value={settings.address}
                    onChange={e => setSettings({ ...settings, address: e.target.value })}
                  />
                  <Input
                    label="Ville"
                    value={settings.city}
                    onChange={e => setSettings({ ...settings, city: e.target.value })}
                  />
                  <Input
                    label="Pays"
                    value={settings.country}
                    onChange={e => setSettings({ ...settings, country: e.target.value })}
                  />
                  <Input
                    label="Téléphone"
                    value={settings.phone}
                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                  />
                  <Input
                    label="Email"
                    value={settings.email}
                    onChange={e => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>

                <h4 className="font-semibold text-gray-700 mt-4 border-b pb-2">Identifiants Légaux</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="NIF"
                    value={settings.nif}
                    onChange={e => setSettings({ ...settings, nif: e.target.value })}
                  />
                  <Input
                    label="RC"
                    value={settings.rc}
                    onChange={e => setSettings({ ...settings, rc: e.target.value })}
                  />
                  <Input
                    label="NIS"
                    value={settings.nis}
                    onChange={e => setSettings({ ...settings, nis: e.target.value })}
                  />
                  <Input
                    label="AI"
                    value={settings.ai}
                    onChange={e => setSettings({ ...settings, ai: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button type="submit" variant="primary" loading={isSubmitting}>
                    💾 Enregistrer les modifications
                  </Button>
                  {message && <span className={message.startsWith('✅') ? 'text-green-600' : 'text-red-600'}>{message}</span>}
                </div>
              </form>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Impossible de charger les paramètres.
              </div>
            )}
          </Card>

          {/* User Management Form */}
          <Card title="Gestion des Utilisateurs" subtitle="Création et modification de comptes employés" className="card-modern">
            <div className="space-y-8">
              {/* Create User Form */}
              <form onSubmit={handleCreateUser} className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h4 className="font-semibold text-gray-700 mb-2 italic">Nouveau Compte</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="exemple@email.com"
                    required
                  />
                  <Input
                    label="Mot de passe"
                    type="password"
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Minimum 6 caractères"
                    required
                  />
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">Rôle</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={newUser.role}
                      onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="admin">Administrateur</option>
                      <option value="manager">Manager</option>
                      <option value="operateur">Opérateur</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button type="submit" variant="primary" loading={userLoading} disabled={userLoading}>
                    👤 Créer l'utilisateur
                  </Button>
                  {userMsg.text && (
                    <span className={userMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}>
                      {userMsg.text}
                    </span>
                  )}
                </div>
              </form>

              {/* User List */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-4 italic">Utilisateurs existants</h4>
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-left">Rôle Actuel</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium">{u.email}</td>
                          <td className="px-4 py-3">
                            {editingUser?.id === u.id ? (
                              <select
                                className="border rounded p-1 text-sm outline-none bg-white"
                                value={editingUser.role}
                                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                              >
                                <option value="admin">Administrateur</option>
                                <option value="manager">Manager</option>
                                <option value="operateur">Opérateur</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                  u.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                {u.role?.toUpperCase()}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {editingUser?.id === u.id ? (
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => handleUpdateRole(u.id, editingUser.role)}
                                  className="text-green-600 hover:text-green-800 font-bold"
                                >
                                  OK
                                </button>
                                <button
                                  onClick={() => setEditingUser(null)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingUser(u)}
                                className="text-primary-600 hover:text-primary-800"
                              >
                                ✏️ Modifier
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8">
          <Card title="Maintenance Système" subtitle="Zone de Danger" className="card-modern border-l-4 border-l-red-500">
            <div className="bg-red-50 p-4 rounded text-red-800">
              Les opérations de suppression définitive sont irréversibles.
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
