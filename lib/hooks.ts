import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export function useRequireAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push('/login');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [router]);

  return { loading };
}

export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      setUser(user);
      setRole(user?.app_metadata?.role || user?.user_metadata?.role || 'viewer');
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null;
      setUser(user);
      setRole(user?.app_metadata?.role || user?.user_metadata?.role || 'viewer');
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { user, role, loading };
}

export function useRole() {
  const { role, loading } = useUser();

  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || isAdmin;
  const isOperator = role === 'operateur' || isManager;

  return { role, isAdmin, isManager, isOperator, loading };
}
