export type EventStatus = 'draft' | 'pending_review' | 'published' | 'full' | 'cancelled' | 'finished';
export type AccessMode = 'open' | 'request' | 'invite_only';
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'waitlisted';
export type VenueType = 'quinta' | 'casa' | 'bar' | 'boliche' | 'playa' | 'espacio_alquilado' | 'otro';

export type Profile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  musicInterests: string[];
  role: 'user' | 'admin';
  isVerified: boolean;
  isOrganizerVerified: boolean;
  createdAt: string;
};

export type EventCategory = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
};

/** Shape used by feed/map cards — deliberately omits the private address. */
export type EventSummary = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  organizer: Pick<Profile, 'id' | 'displayName' | 'username' | 'avatarUrl' | 'isOrganizerVerified'>;
  categorySlug: string;
  neighborhood: string | null;
  city: string | null;
  distanceMeters: number | null;
  startsAt: string;
  endsAt: string | null;
  priceCents: number | null;
  isFree: boolean;
  capacity: number | null;
  confirmedCount: number;
  spotsLeft: number | null;
  status: EventStatus;
  accessMode: AccessMode;
  requestDeadline: string | null;
  lat: number;
  lng: number;
};

export type EventDetail = EventSummary & {
  description: string;
  rules: string | null;
  minAge: number | null;
  venueType: VenueType;
  images: { id: string; url: string; sortOrder: number }[];
  /** Only present when the viewer is authorized (accepted attendee or organizer). */
  exactAddress: string | null;
  exactLat: number | null;
  exactLng: number | null;
  myRequestStatus: RequestStatus | null;
  isSaved: boolean;
};

export type EventRequest = {
  id: string;
  eventId: string;
  requester: Pick<Profile, 'id' | 'displayName' | 'username' | 'avatarUrl'>;
  status: RequestStatus;
  message: string | null;
  createdAt: string;
};

export type EventAttendee = {
  id: string;
  eventId: string;
  profile: Pick<Profile, 'id' | 'displayName' | 'username' | 'avatarUrl'>;
  confirmedAt: string;
};

export type Conversation = {
  id: string;
  eventId: string | null;
  isGroup: boolean;
  title: string | null;
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
  otherMember: Pick<Profile, 'id' | 'displayName' | 'avatarUrl'> | null;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'read';
};

export type NotificationType =
  | 'new_request'
  | 'request_accepted'
  | 'request_rejected'
  | 'new_message'
  | 'event_invite'
  | 'event_time_changed'
  | 'event_location_changed'
  | 'event_cancelled'
  | 'event_upcoming'
  | 'capacity_changed';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data: Record<string, unknown>;
};
