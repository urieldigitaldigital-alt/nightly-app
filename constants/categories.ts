/**
 * Fallback category list used only while the backend list hasn't loaded yet.
 * The source of truth is the `event_categories` table — see
 * supabase/migrations/0001_init.sql — so new categories can be added from an
 * admin tool without a client release.
 */
export type CategorySlug =
  | 'all'
  | 'previa'
  | 'fiesta_privada'
  | 'fiesta_publica'
  | 'evento'
  | 'musica_electronica'
  | 'reggaeton'
  | 'musica_comercial'
  | 'beach_party'
  | 'quinta'
  | 'bar'
  | 'boliche'
  | 'reunion_social';

export const FALLBACK_CATEGORIES: { slug: CategorySlug; label: string }[] = [
  { slug: 'all', label: 'Todo' },
  { slug: 'previa', label: 'Previas' },
  { slug: 'fiesta_privada', label: 'Fiestas privadas' },
  { slug: 'fiesta_publica', label: 'Fiestas públicas' },
  { slug: 'evento', label: 'Eventos' },
  { slug: 'musica_electronica', label: 'Electrónica' },
  { slug: 'reggaeton', label: 'Reggaetón' },
  { slug: 'musica_comercial', label: 'Comercial' },
  { slug: 'beach_party', label: 'Beach party' },
  { slug: 'quinta', label: 'Quinta' },
  { slug: 'bar', label: 'Bar' },
  { slug: 'boliche', label: 'Boliche' },
  { slug: 'reunion_social', label: 'Reunión social' },
];
