import { supabase } from '@/lib/supabase';

export async function followUser(followeeId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  const { error } = await supabase.from('follows').insert({ follower_id: user.id, followee_id: followeeId });
  if (error) throw error;
}

export async function unfollowUser(followeeId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', followeeId);
  if (error) throw error;
}

export async function listFollowing(profileId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('followee:profiles!follows_followee_id_fkey(id, username, display_name, avatar_url)')
    .eq('follower_id', profileId);
  if (error) throw error;
  return (data ?? []).map((row: any) => (Array.isArray(row.followee) ? row.followee[0] : row.followee));
}

export async function listFollowers(profileId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)')
    .eq('followee_id', profileId);
  if (error) throw error;
  return (data ?? []).map((row: any) => (Array.isArray(row.follower) ? row.follower[0] : row.follower));
}

export async function countFollowers(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('follower_id', { count: 'exact', head: true })
    .eq('followee_id', profileId);
  if (error) throw error;
  return count ?? 0;
}

export async function countFollowing(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('followee_id', { count: 'exact', head: true })
    .eq('follower_id', profileId);
  if (error) throw error;
  return count ?? 0;
}

export async function isFollowing(followeeId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('followee_id', followeeId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}
