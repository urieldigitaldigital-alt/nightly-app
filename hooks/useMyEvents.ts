import { useQuery } from '@tanstack/react-query';
import { fetchMyOrganizedEvents } from '@/services/events';

export function useMyEvents() {
  return useQuery({ queryKey: ['my-events'], queryFn: fetchMyOrganizedEvents, staleTime: 15_000 });
}
