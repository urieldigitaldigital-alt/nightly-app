import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '@/services/categories';
import { FALLBACK_CATEGORIES } from '@/constants/categories';

export function useCategories() {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });

  const categories =
    query.data && query.data.length > 0
      ? [{ id: 'all', slug: 'all', label: 'Todo', sortOrder: -1 }, ...query.data]
      : FALLBACK_CATEGORIES.map((c, i) => ({ id: c.slug, slug: c.slug, label: c.label, sortOrder: i }));

  return { ...query, categories };
}
