import React from 'react';
import { Button } from './ui';
import clsx from 'clsx';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  breadcrumbs?: Array<{ label: string; href?: string }>;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  action,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={clsx('mb-8 fade-in', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-gray-400">/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="text-primary-600 hover:text-primary-700 font-medium">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-gray-900 font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Header Content */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {icon && <span className="text-4xl">{icon}</span>}
            <h1 className="text-5xl font-bold gradient-text">{title}</h1>
          </div>
          {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
        </div>

        {action && (
          <Button
            variant={action.variant || 'primary'}
            size="lg"
            onClick={action.onClick}
            className="mt-2"
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
