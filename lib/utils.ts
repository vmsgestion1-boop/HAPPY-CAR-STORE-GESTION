import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 2,
  }).format(value).replace('DZD', 'DA');
}

/**
 * Safe version of formatCurrency for PDF generation (ASCII only)
 * to avoid garbled characters due to non-breaking spaces.
 */
export function formatCurrencySafe(value: number): string {
  const parts = (value || 0).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.') + ' DA';
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd MMM yyyy', { locale: fr });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd MMM yyyy HH:mm', { locale: fr });
}

export function parseExcelDate(serial: number): Date {
  // Excel dates are stored as serial numbers
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date;
}

export function calculatePercentage(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

export async function downloadFile(data: BlobPart, filename: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
