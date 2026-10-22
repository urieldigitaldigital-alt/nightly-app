import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchConversations } from '@/services/chat';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useConversations() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  const query = useQuery({ queryKey: ['conversations'], queryFn: fetchConversations });

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`messages-inbox:${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, queryClient]);

  return query;
}
