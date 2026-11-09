import { useQuery } from '@tanstack/react-query';
import { fetchVenuesNearby } from '@/services/venues';

export function useVenues(params: { lat: number; lng: number; radiusKm?: number }) {
  const query = useQuery({
    // El origen entra en la clave redondeado a tres decimales (unos cien
    // metros). Sin eso, cada actualización del GPS cambiaría la clave y
    // volvería a pedir la lista entera mientras alguien camina, para
    // recibir siempre los mismos boliches.
    queryKey: ['venues', params.lat.toFixed(3), params.lng.toFixed(3), params.radiusKm ?? 60],
    queryFn: () => fetchVenuesNearby(params),
    // El directorio lo carga el equipo y cambia muy de vez en cuando.
    staleTime: 10 * 60_000,
  });

  return { ...query, venues: query.data ?? [] };
}
