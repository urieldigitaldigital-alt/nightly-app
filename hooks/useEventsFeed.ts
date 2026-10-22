import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchEventsWithinRadius } from '@/services/events';

const PAGE_SIZE = 20;

export type FeedFilters = {
  lat: number;
  lng: number;
  radiusKm: number;
  categorySlug: string; // 'all' or a real slug
  freeOnly?: boolean;
  orderBy?: 'distance' | 'date' | 'popularity';
};

export function useEventsFeed(filters: FeedFilters) {
  return useInfiniteQuery({
    queryKey: ['events-feed', filters],
    queryFn: ({ pageParam }) =>
      fetchEventsWithinRadius({
        lat: filters.lat,
        lng: filters.lng,
        radiusKm: filters.radiusKm,
        categorySlugs: filters.categorySlug === 'all' ? null : [filters.categorySlug],
        freeOnly: filters.freeOnly,
        orderBy: filters.orderBy,
        page: pageParam,
        pageSize: PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.length === PAGE_SIZE ? allPages.length : undefined),
  });
}
