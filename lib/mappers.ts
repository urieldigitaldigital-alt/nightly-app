import { Database } from '@/types/database';
import { EventSummary } from '@/types/models';

type RadiusRow = Database['public']['Functions']['events_within_radius']['Returns'][number];

export function mapRadiusRowToSummary(row: RadiusRow): EventSummary {
  const spotsLeft = row.capacity != null ? Math.max(row.capacity - row.confirmed_count, 0) : null;

  return {
    id: row.id,
    title: row.title,
    coverImageUrl: row.cover_image_url,
    organizer: {
      id: row.organizer_id,
      displayName: row.organizer_display_name,
      username: row.organizer_username,
      avatarUrl: row.organizer_avatar_url,
      isOrganizerVerified: row.organizer_is_verified,
    },
    categorySlug: row.category_slug,
    neighborhood: row.neighborhood,
    city: row.city,
    distanceMeters: row.distance_m,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    priceCents: row.price_cents,
    isFree: row.is_free,
    capacity: row.capacity,
    confirmedCount: Number(row.confirmed_count),
    spotsLeft,
    status: row.status as EventSummary['status'],
    accessMode: row.access_mode as EventSummary['accessMode'],
    requestDeadline: row.request_deadline,
    lat: row.lat,
    lng: row.lng,
  };
}
