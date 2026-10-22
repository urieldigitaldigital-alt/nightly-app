import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchReceivedRequests } from '@/services/requests';
import { supabase } from '@/lib/supabase';

export function useReceivedRequests(eventId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['received-requests', eventId],
    queryFn: () => fetchReceivedRequests(eventId),
    enabled: Boolean(eventId),
  });

  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`event-requests:${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_requests', filter: `event_id=eq.${eventId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['received-requests', eventId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  return query;
}
