'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/api';
import { Button, Input, Card } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user } = await signIn(email, password);
      const role = user?.app_metadata?.role || user?.user_metadata?.role || 'viewer';

      if (role === 'operateur') {
        router.push('/receptions');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('demo@example.com');
    setPassword('demo123456');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-600 to-accent-600 rounded-3xl mb-6 shadow-xl hover:shadow-2xl transition-all">
            <span className="text-4xl">📊</span>
          </div>
          <h1 className="text-5xl font-bold gradient-text mb-3">VMS Gestion</h1>
          <p className="text-gray-600 text-lg font-medium">Gestion simplifiée de votre métier</p>
        </div>

        {/* Main Card */}
        <Card variant="default" className="card-modern bg-white shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <Input
              label="📧 Adresse Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
            />

            {/* Password Input */}
            <Input
              label="🔐 Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {/* Error Message */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
            >
              🔐 Se connecter
            </Button>

            {/* Demo Credentials Section */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className="w-full text-center text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                {showDemo ? '▼ Masquer identifiants de démo' : '▶ Afficher identifiants de démo'}
              </button>

              {showDemo && (
                <div className="mt-3 bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>📧 Email:</strong> demo@example.com
                  </p>
                  <p className="text-sm text-gray-700 mb-4">
                    <strong>🔐 Mot de passe:</strong> demo123456
                  </p>
                  <Button
                    type="button"
                    onClick={fillDemoCredentials}
                    variant="secondary"
                    className="w-full"
                  >
                    ➜ Remplir automatiquement
                  </Button>
                </div>
              )}
            </div>
          </form>
        </Card>

        {/* Footer Info */}
        <p className="text-center text-gray-600 text-sm mt-6 font-medium">
          Application web moderne pour la gestion simplifiée
        </p>
      </div>
    </div>
  );
}
