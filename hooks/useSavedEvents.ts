import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSavedEventIds, toggleSaveEvent } from '@/services/saved';

export function useSavedEventIds() {
  return useQuery({ queryKey: ['saved-event-ids'], queryFn: fetchSavedEventIds, staleTime: 15_000 });
}

export function useToggleSaveEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, nextSaved }: { eventId: string; nextSaved: boolean }) => toggleSaveEvent(eventId, nextSaved),
    onMutate: async ({ eventId, nextSaved }) => {
      await queryClient.cancelQueries({ queryKey: ['saved-event-ids'] });
      const previous = queryClient.getQueryData<string[]>(['saved-event-ids']) ?? [];
      const next = nextSaved ? [...previous, eventId] : previous.filter((id) => id !== eventId);
      queryClient.setQueryData(['saved-event-ids'], next);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(['saved-event-ids'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-event-ids'] });
    },
  });
}
