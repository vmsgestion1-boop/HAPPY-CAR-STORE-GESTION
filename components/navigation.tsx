import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { label: 'Tableau de bord', href: '/dashboard', icon: '📊' },
    { label: 'Comptes', href: '/accounts', icon: '👥' },
    { label: 'Réceptions', href: '/receptions', icon: '📥' },
    { label: 'Véhicules', href: '/vehicules', icon: '🚗' },
    { label: 'Livraisons', href: '/livraisons', icon: '📤' },
    { label: 'Stock', href: '/stock', icon: '🅿️' },
    { label: 'Charges', href: '/charges', icon: '💰' },
    { label: 'Finance', href: '/finance', icon: '🏦' },
    { label: 'Relevés', href: '/statements', icon: '📋' },
    { label: 'Journal Global', href: '/journal', icon: '📑' },
    { label: 'Admin', href: '/admin', icon: '⚙️' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-primary-600 via-primary-700 to-accent-600 shadow-xl backdrop-blur-lg">
      <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-8">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-3 font-bold text-xl text-white hover:text-white/90 transition-colors flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              📊
            </div>
            <span className="hidden sm:inline">VMS Gestion</span>
          </Link>

          {/* Nav Items */}
          <div className="flex items-center space-x-1 overflow-x-auto flex-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap',
                    isActive
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <span>{item.icon}</span>
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold transition-all duration-200 border border-white/20 hover:border-white/40 flex-shrink-0"
          >
            🚪 Sortie
          </button>
        </div>
      </div>
    </nav>
  );
}
