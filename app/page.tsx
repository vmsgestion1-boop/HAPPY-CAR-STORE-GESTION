'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-600 to-accent-600 rounded-3xl mb-6 shadow-xl animate-pulse">
            <span className="text-4xl">📊</span>
          </div>
          <p className="text-xl font-semibold text-gray-800">VMS Gestion</p>
          <p className="text-gray-600 mt-2">Chargement en cours...</p>
        </div>
      </div>
    );
  }

  return null;
}
