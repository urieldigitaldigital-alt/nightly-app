import { create } from 'zustand';
import { AccessMode, VenueType } from '@/types/models';

export type CreateEventDraft = {
  // Step 1
  title: string;
  description: string;
  categorySlug: string | null;
  coverPhotoUri: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  minAge: string;
  rules: string;
  // Step 2
  venueType: VenueType | null;
  city: string;
  neighborhood: string;
  exactAddress: string;
  exactLat: number | null;
  exactLng: number | null;
  // Step 3
  capacity: string;
  accessMode: AccessMode;
  isFree: boolean;
  priceCents: string;
  requestDeadline: Date | null;
  // Step 4
  organizerConfirmedAuthorization: boolean;
};

const initialDraft: CreateEventDraft = {
  title: '',
  description: '',
  categorySlug: null,
  coverPhotoUri: null,
  startsAt: null,
  endsAt: null,
  minAge: '',
  rules: '',
  venueType: null,
  city: '',
  neighborhood: '',
  exactAddress: '',
  exactLat: null,
  exactLng: null,
  capacity: '',
  accessMode: 'request',
  isFree: true,
  priceCents: '',
  requestDeadline: null,
  organizerConfirmedAuthorization: false,
};

type CreateEventState = {
  draft: CreateEventDraft;
  update: (patch: Partial<CreateEventDraft>) => void;
  reset: () => void;
};

export const useCreateEventStore = create<CreateEventState>((set) => ({
  draft: initialDraft,
  update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  reset: () => set({ draft: initialDraft }),
}));
