import { supabase } from '@/lib/supabase';
import { mapRadiusRowToSummary } from '@/lib/mappers';
import { EventDetail, EventSummary, VenueType } from '@/types/models';

export type RadiusSearchParams = {
  lat: number;
  lng: number;
  radiusKm: number;
  categorySlugs?: string[] | null;
  freeOnly?: boolean;
  orderBy?: 'distance' | 'date' | 'popularity';
  page?: number;
  pageSize?: number;
};

export async function fetchEventsWithinRadius(params: RadiusSearchParams): Promise<EventSummary[]> {
  const { data, error } = await supabase.rpc('events_within_radius', {
    origin_lat: params.lat,
    origin_lng: params.lng,
    radius_km: params.radiusKm,
    category_slugs: params.categorySlugs && params.categorySlugs.length > 0 ? params.categorySlugs : null,
    free_only: params.freeOnly ?? false,
    order_by: params.orderBy ?? 'distance',
    page: params.page ?? 0,
    page_size: params.pageSize ?? 20,
  });

  if (error) throw error;
  return (data ?? []).map(mapRadiusRowToSummary);
}

export async function fetchEventDetail(eventId: string): Promise<EventDetail> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event, error } = await supabase
    .from('events')
    .select(
      `id, title, description, rules, min_age, venue_type, city, neighborhood, lat, lng,
       starts_at, ends_at, price_cents, is_free, capacity, status, access_mode, request_deadline,
       cover_image_url, organizer_id,
       organizer:profiles!events_organizer_id_fkey(id, username, display_name, avatar_url, is_organizer_verified),
       category:event_categories(slug),
       event_images(id, url, sort_order)`
    )
    .eq('id', eventId)
    .single();

  if (error) throw error;

  const [{ count: confirmedCount }, { data: privateLocation }, myRequest, saved, myAttendee] = await Promise.all([
    supabase.from('event_attendees').select('id', { count: 'exact', head: true }).eq('event_id', eventId).is('cancelled_at', null),
    supabase.from('event_locations_private').select('exact_address, exact_lat, exact_lng').eq('event_id', eventId).maybeSingle(),
    user
      ? supabase.from('event_requests').select('status').eq('event_id', eventId).eq('requester_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('saved_events').select('event_id').eq('event_id', eventId).eq('profile_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from('event_attendees')
          .select('entry_code')
          .eq('event_id', eventId)
          .eq('profile_id', user.id)
          .is('cancelled_at', null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const organizer = Array.isArray(event.organizer) ? event.organizer[0] : event.organizer;
  const category = Array.isArray(event.category) ? event.category[0] : event.category;
  const capacity = event.capacity;
  const spotsLeft = capacity != null ? Math.max(capacity - (confirmedCount ?? 0), 0) : null;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    rules: event.rules,
    minAge: event.min_age,
    venueType: event.venue_type as VenueType,
    coverImageUrl: event.cover_image_url,
    organizer: {
      id: organizer.id,
      displayName: organizer.display_name,
      username: organizer.username,
      avatarUrl: organizer.avatar_url,
      isOrganizerVerified: organizer.is_organizer_verified,
    },
    categorySlug: category?.slug ?? '',
    neighborhood: event.neighborhood,
    city: event.city,
    distanceMeters: null,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    priceCents: event.price_cents,
    isFree: event.is_free,
    capacity,
    confirmedCount: confirmedCount ?? 0,
    spotsLeft,
    status: event.status as EventDetail['status'],
    accessMode: event.access_mode as EventDetail['accessMode'],
    requestDeadline: event.request_deadline,
    lat: event.lat,
    lng: event.lng,
    images: ((event.event_images ?? []) as { id: string; url: string; sort_order: number }[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({ id: img.id, url: img.url, sortOrder: img.sort_order })),
    exactAddress: privateLocation?.exact_address ?? null,
    exactLat: privateLocation?.exact_lat ?? null,
    exactLng: privateLocation?.exact_lng ?? null,
    myRequestStatus: (myRequest.data?.status as EventDetail['myRequestStatus']) ?? null,
    myEntryCode: myAttendee.data?.entry_code ?? null,
    isSaved: Boolean(saved.data),
  };
}

export type CreateEventInput = {
  categorySlug: string;
  title: string;
  description: string;
  venueType: VenueType;
  city: string;
  neighborhood: string | null;
  exactLat: number;
  exactLng: number;
  exactAddress: string;
  startsAt: string;
  endsAt: string | null;
  minAge: number | null;
  rules: string | null;
  capacity: number | null;
  accessMode: 'open' | 'request' | 'invite_only';
  isFree: boolean;
  priceCents: number | null;
  requestDeadline: string | null;
  coverImageUrl: string | null;
  organizerConfirmedAuthorization: boolean;
};

export async function createEvent(input: CreateEventInput) {
  const { data, error } = await supabase.rpc('create_event_with_location', {
    p_category_slug: input.categorySlug,
    p_title: input.title,
    p_description: input.description,
    p_venue_type: input.venueType,
    p_city: input.city,
    p_neighborhood: input.neighborhood,
    p_exact_lat: input.exactLat,
    p_exact_lng: input.exactLng,
    p_exact_address: input.exactAddress,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_min_age: input.minAge,
    p_rules: input.rules,
    p_capacity: input.capacity,
    p_access_mode: input.accessMode,
    p_is_free: input.isFree,
    p_price_cents: input.priceCents,
    p_request_deadline: input.requestDeadline,
    p_cover_image_url: input.coverImageUrl,
    p_organizer_confirmed_authorization: input.organizerConfirmedAuthorization,
  });

  if (error) throw error;
  return data;
}

export async function cancelEvent(eventId: string) {
  const { error } = await supabase.from('events').update({ status: 'cancelled' }).eq('id', eventId);
  if (error) throw error;
}

export async function fetchMyOrganizedEvents() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  const { data, error } = await supabase
    .from('events')
    .select('id, title, cover_image_url, starts_at, status, capacity')
    .eq('organizer_id', user.id)
    .order('starts_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
