import { mapRadiusRowToSummary } from '@/lib/mappers';

const baseRow = {
  id: 'evt-1',
  title: 'Previa Beach',
  cover_image_url: null,
  organizer_id: 'org-1',
  organizer_username: 'org',
  organizer_display_name: 'Organizador',
  organizer_avatar_url: null,
  organizer_is_verified: true,
  category_slug: 'previa',
  neighborhood: 'Zona Norte',
  city: 'Pinamar',
  distance_m: 2500,
  starts_at: new Date().toISOString(),
  ends_at: null,
  price_cents: null,
  is_free: true,
  status: 'published',
  access_mode: 'request',
  request_deadline: null,
  lat: -37.0968,
  lng: -56.8611,
};

describe('mapRadiusRowToSummary', () => {
  it('computes spotsLeft from capacity and confirmed_count', () => {
    const summary = mapRadiusRowToSummary({ ...baseRow, capacity: 50, confirmed_count: 48 });
    expect(summary.spotsLeft).toBe(2);
  });

  it('never returns a negative spotsLeft, even if overbooked data slips through', () => {
    const summary = mapRadiusRowToSummary({ ...baseRow, capacity: 10, confirmed_count: 12 });
    expect(summary.spotsLeft).toBe(0);
  });

  it('returns null spotsLeft when the event has no capacity limit', () => {
    const summary = mapRadiusRowToSummary({ ...baseRow, capacity: null, confirmed_count: 30 });
    expect(summary.spotsLeft).toBeNull();
  });
});
