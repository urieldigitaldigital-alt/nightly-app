import { supabase } from '@/lib/supabase';

export async function searchProfiles(query: string) {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, is_organizer_verified')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function searchEvents(query: string) {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from('events')
    .select('id, title, cover_image_url, starts_at, city, neighborhood, status')
    .in('status', ['published', 'full'])
    .or(`title.ilike.%${query}%,city.ilike.%${query}%,neighborhood.ilike.%${query}%`)
    .order('starts_at', { ascending: true })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}
