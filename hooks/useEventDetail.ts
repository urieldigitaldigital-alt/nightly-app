import { useQuery } from '@tanstack/react-query';
import { fetchEventDetail } from '@/services/events';

export function useEventDetail(eventId: string) {
  return useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: () => fetchEventDetail(eventId),
    enabled: Boolean(eventId),
  });
}
