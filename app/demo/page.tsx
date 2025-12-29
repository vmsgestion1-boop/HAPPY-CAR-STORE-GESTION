'use client';

import { Button, Card, Input, Select, Badge } from '@/components/ui';

export default function DemoPage() {
  return (
    <div className="min-h-screen container-modern py-12">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-6xl font-bold gradient-text mb-4">Design Moderne VMS Gestion</h1>
        <p className="text-xl text-gray-600 mb-8">Showcase des composants modernisés</p>
      </div>

      {/* Navigation Demo */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">🗺️ Navigation</h2>
        <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-accent-600 rounded-2xl shadow-xl p-4 text-white">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="font-bold text-xl">📊 VMS Gestion</div>
            <div className="flex gap-2">
              <div className="px-3 py-2 rounded-lg bg-white/20">📊 Dashboard</div>
              <div className="px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer">👥 Comptes</div>
              <div className="px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer">📥 Réceptions</div>
            </div>
            <div className="px-4 py-2 bg-white/20 rounded-lg cursor-pointer">🚪 Sortie</div>
          </div>
        </div>
      </div>

      {/* Buttons Demo */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">🔘 Buttons</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="success">Success</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </div>

      {/* Cards Demo */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">🎴 Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Default Card" subtitle="Avec ombre">
            Contenu avec style moderne et élégant. Parfait pour afficher des informations structurées.
          </Card>
          <Card variant="glass" title="Glass Card" subtitle="Avec morphisme">
            Effet de verre translucide pour un look aérien et futuriste.
          </Card>
          <Card variant="gradient" title="Gradient Card" subtitle="Avec couleurs vibrantes">
            Contenu blanc sur gradient coloré pour mettre en valeur des éléments clés.
          </Card>
        </div>
      </div>

      {/* Stats Cards Demo */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">📊 Stats Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-modern bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
            <p className="text-white/80 text-sm font-medium mb-2">Solde Total</p>
            <p className="text-3xl font-bold">500.000€</p>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-xs text-white/70">Mis à jour en temps réel</p>
            </div>
          </div>

          <div className="card-modern bg-gradient-to-br from-green-500 to-green-600 p-6 text-white">
            <p className="text-white/80 text-sm font-medium mb-2">Comptes Actifs</p>
            <p className="text-3xl font-bold">15</p>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-xs text-white/70">Mis à jour en temps réel</p>
            </div>
          </div>

          <div className="card-modern bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white">
            <p className="text-white/80 text-sm font-medium mb-2">Réceptions</p>
            <p className="text-3xl font-bold">42</p>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-xs text-white/70">Mis à jour en temps réel</p>
            </div>
          </div>

          <div className="card-modern bg-gradient-to-br from-red-500 to-red-600 p-6 text-white">
            <p className="text-white/80 text-sm font-medium mb-2">Livraisons</p>
            <p className="text-3xl font-bold">200,000</p>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-xs text-white/70">Mis à jour en temps réel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Demo */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">🏷️ Badges</h2>
        <div className="flex flex-wrap gap-3">
          <Badge variant="info">Info</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
        </div>
      </div>

      {/* Inputs Demo */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">📝 Inputs</h2>
        <Card className="card-modern grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Texte simple" placeholder="Entrez du texte" />
          <Input label="Email" type="email" placeholder="votre@email.com" icon="📧" />
          <Input label="Avec erreur" error="Ce champ est requis" />
          <Input label="Avec hint" hint="Ceci est une aide qui explique le champ" />
          <Select
            label="Sélection"
            options={[
              { value: '1', label: 'Option 1' },
              { value: '2', label: 'Option 2' },
            ]}
          />
        </Card>
      </div>

      {/* Colors Palette */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">🎨 Palette Couleurs</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-primary-500 rounded-xl p-4 text-white font-semibold text-center shadow-lg">
            Primaire
            <p className="text-xs mt-2 opacity-80">#3b82f6</p>
          </div>
          <div className="bg-secondary-500 rounded-xl p-4 text-white font-semibold text-center shadow-lg">
            Secondaire
            <p className="text-xs mt-2 opacity-80">#22c55e</p>
          </div>
          <div className="bg-accent-500 rounded-xl p-4 text-white font-semibold text-center shadow-lg">
            Accent
            <p className="text-xs mt-2 opacity-80">#ec4899</p>
          </div>
          <div className="bg-red-500 rounded-xl p-4 text-white font-semibold text-center shadow-lg">
            Danger
            <p className="text-xs mt-2 opacity-80">#ef4444</p>
          </div>
          <div className="bg-amber-500 rounded-xl p-4 text-white font-semibold text-center shadow-lg">
            Warning
            <p className="text-xs mt-2 opacity-80">#f59e0b</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-gray-200">
        <p className="text-gray-600 mb-4">
          Tous les composants sont modernisés avec des gradients, ombres et animations fluides
        </p>
        <Button variant="primary" size="lg" onClick={() => window.location.href = '/dashboard'}>
          ✨ Aller au Dashboard
        </Button>
      </div>
    </div>
  );
}
