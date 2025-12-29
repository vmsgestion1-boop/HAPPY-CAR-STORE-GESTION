import clsx from 'clsx';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient';
}

export function Card({ title, subtitle, children, className, variant = 'default' }: CardProps) {
  const baseClasses = clsx(
    'rounded-2xl p-6 transition-smooth',
    {
      'card-modern': variant === 'default',
      'glass': variant === 'glass',
      'bg-gradient-to-br from-primary-500 to-accent-600 text-white shadow-xl': variant === 'gradient',
    }
  );

  return (
    <div className={clsx(baseClasses, className)}>
      {title && (
        <div className="mb-4">
          <h3 className={clsx('text-xl font-bold', variant === 'gradient' ? 'text-white' : 'text-gray-900')}>
            {title}
          </h3>
          {subtitle && <p className={clsx('text-sm mt-1', variant === 'gradient' ? 'text-white/80' : 'text-gray-600')}>{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'font-semibold rounded-xl transition-smooth flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:shadow-lg hover:from-primary-700 hover:to-primary-800 focus:ring-primary-300',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg hover:from-red-700 hover:to-red-800 focus:ring-red-300',
    success: 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-lg hover:from-green-700 hover:to-green-800 focus:ring-green-300',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-300',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-300',
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      {loading ? '⏳ Chargement...' : children}
    </button>
  );
}

interface BadgeProps {
  variant?: 'info' | 'success' | 'warning' | 'error' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function Badge({ variant = 'info', size = 'md', children, icon }: BadgeProps) {
  const variantClasses = {
    info: 'bg-blue-100 text-blue-800 border border-blue-200',
    success: 'bg-green-100 text-green-800 border border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    error: 'bg-red-100 text-red-800 border border-red-200',
    primary: 'bg-primary-100 text-primary-800 border border-primary-200',
    secondary: 'bg-gray-100 text-gray-800 border border-gray-200',
  };

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span className={clsx('rounded-full font-semibold inline-flex items-center gap-1', variantClasses[variant], sizeClasses[size])}>
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </span>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  hint?: string;
}

export function Input({ label, error, icon, hint, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input
          className={clsx(
            'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all duration-200 bg-white',
            icon && 'pl-11',
            error && 'border-red-500 focus:ring-red-200',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm font-medium text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
      <select
        className={clsx(
          'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all duration-200 bg-white',
          error && 'border-red-500 focus:ring-red-200',
          className
        )}
        {...props}
      >
        <option value="">-- Sélectionner --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
