import { format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 50) * 50} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function formatEventDateTime(iso: string): string {
  const date = new Date(iso);
  const time = format(date, 'HH:mm');

  if (isToday(date)) return `Hoy · ${time}`;
  if (isTomorrow(date)) return `Mañana · ${time}`;
  return `${format(date, "EEE d 'de' MMM", { locale: es })} · ${time}`;
}

export function formatRelativeShort(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.round(diffH / 24);
  return `${diffD}d`;
}

export function formatPrice(cents: number | null, isFree: boolean): string {
  if (isFree || cents === null) return 'Gratis';
  return `$${(cents / 100).toLocaleString('es-AR')}`;
}
