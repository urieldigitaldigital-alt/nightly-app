import { supabase } from '@/lib/supabase';
import { EventCategory } from '@/types/models';

export async function fetchCategories(): Promise<EventCategory[]> {
  const { data, error } = await supabase
    .from('event_categories')
    .select('id, slug, label, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    label: row.label,
    sortOrder: row.sort_order,
  }));
}
