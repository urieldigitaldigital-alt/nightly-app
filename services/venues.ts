import { supabase } from '@/lib/supabase';
import { instagramHandle } from '@/lib/instagram';
import { Venue } from '@/types/models';

type VenueRow = {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  logo_url: string | null;
  instagram: string | null;
  address: string | null;
  city: string;
  description: string | null;
  distance_m: number | null;
};

function mapVenueRow(row: VenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    lat: row.lat,
    lng: row.lng,
    logoUrl: row.logo_url,
    // Se vuelve a normalizar al leer, no solo al escribir. La restricción de
    // la tabla cubre lo que se cargue de ahora en más, pero cualquier fila
    // vieja o cargada a mano desde el panel de Supabase podría traer una URL
    // entera; si eso llegara así al enlace, armaríamos uno roto.
    instagram: instagramHandle(row.instagram),
    address: row.address,
    city: row.city,
    description: row.description,
    distanceMeters: row.distance_m,
  };
}

/**
 * Boliches activos dentro del radio, ya ordenados por cercanía desde la base.
 */
export async function fetchVenuesNearby(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
}): Promise<Venue[]> {
  const { data, error } = await supabase.rpc('venues_nearby', {
    origin_lat: params.lat,
    origin_lng: params.lng,
    // El radio por defecto es mucho más amplio que el del feed de eventos: la
    // lista de boliches sirve para planear la noche, y alguien parado en
    // Pinamar quiere ver igual lo que hay en Gesell o en Cariló.
    radius_km: params.radiusKm ?? 60,
  });

  if (error) throw error;
  return ((data ?? []) as VenueRow[]).map(mapVenueRow);
}
