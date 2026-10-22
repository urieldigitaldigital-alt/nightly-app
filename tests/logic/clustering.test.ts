import { clusterEvents } from '@/lib/clustering';
import { EventSummary } from '@/types/models';

function makeEvent(id: string, lat: number, lng: number): EventSummary {
  return {
    id,
    title: id,
    coverImageUrl: null,
    organizer: { id: 'o1', displayName: 'Org', username: 'org', avatarUrl: null, isOrganizerVerified: false },
    categorySlug: 'previa',
    neighborhood: null,
    city: 'Pinamar',
    distanceMeters: 1000,
    startsAt: new Date().toISOString(),
    endsAt: null,
    priceCents: null,
    isFree: true,
    capacity: null,
    confirmedCount: 0,
    spotsLeft: null,
    status: 'published',
    accessMode: 'request',
    requestDeadline: null,
    lat,
    lng,
  };
}

describe('clusterEvents', () => {
  it('groups events that fall in the same grid cell', () => {
    const events = [makeEvent('a', -37.0968, -56.8611), makeEvent('b', -37.0969, -56.8612)];
    const clusters = clusterEvents(events, 0.01);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].events).toHaveLength(2);
  });

  it('keeps distant events in separate clusters', () => {
    const events = [makeEvent('a', -37.0968, -56.8611), makeEvent('b', -37.2633, -56.9733)];
    const clusters = clusterEvents(events, 0.01);
    expect(clusters).toHaveLength(2);
  });

  it('returns an empty array for no events', () => {
    expect(clusterEvents([], 0.01)).toEqual([]);
  });
});
