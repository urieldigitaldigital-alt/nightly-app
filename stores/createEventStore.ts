import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Plain JSON.stringify/parse turns Date fields into strings and never back
// — the create-event wizard spans 4 screens the user can easily background
// the app from mid-draft, so the draft needs to survive a restart with its
// Date fields intact, not as strings `new Date(...)` calls downstream would
// choke on.
const replacer = (_key: string, value: unknown) => (value instanceof Date ? { __date: value.toISOString() } : value);
const reviver = (_key: string, value: unknown) =>
  value && typeof value === 'object' && '__date' in (value as any) ? new Date((value as any).__date) : value;

export const useCreateEventStore = create<CreateEventState>()(
  persist(
    (set) => ({
      draft: initialDraft,
      update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      reset: () => set({ draft: initialDraft }),
    }),
    {
      name: 'afterdune-create-event-draft',
      storage: createJSONStorage(() => AsyncStorage, { replacer, reviver }),
      partialize: (state) => ({ draft: state.draft }),
    }
  )
);
