import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendMessage } from '@/services/chat';
import { uploadChatImage } from '@/services/storage';

export type OutboxMessage = {
  localId: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  imageLocalUri: string | null;
  createdAt: string;
  status: 'sending' | 'error';
};

type ChatOutboxState = {
  messages: OutboxMessage[];
  /** Adds the message and immediately attempts to send it — the common
   * online case resolves in place with no visible "queued" state; only a
   * failed attempt (offline, or a real server error) lingers as 'error'
   * until retry() or the next reconnect flush. */
  enqueue: (msg: Omit<OutboxMessage, 'status'>) => void;
  retry: (localId: string) => void;
  /** Re-attempts every 'error' item — called on network reconnect so
   * messages typed while offline go out on their own once the connection is
   * back, with no action required from the user. */
  flushErrors: () => void;
};

async function attemptSend(localId: string, get: () => ChatOutboxState, set: (fn: (s: ChatOutboxState) => Partial<ChatOutboxState>) => void) {
  const msg = get().messages.find((m) => m.localId === localId);
  if (!msg) return;

  set((s) => ({ messages: s.messages.map((m) => (m.localId === localId ? { ...m, status: 'sending' } : m)) }));

  try {
    const imagePath = msg.imageLocalUri ? await uploadChatImage(msg.conversationId, msg.senderId, msg.imageLocalUri) : null;
    await sendMessage(msg.conversationId, msg.body, imagePath);
    set((s) => ({ messages: s.messages.filter((m) => m.localId !== localId) }));
  } catch {
    set((s) => ({ messages: s.messages.map((m) => (m.localId === localId ? { ...m, status: 'error' } : m)) }));
  }
}

export const useChatOutboxStore = create<ChatOutboxState>()(
  persist(
    (set, get) => ({
      messages: [],
      enqueue: (msg) => {
        set((s) => ({ messages: [...s.messages, { ...msg, status: 'sending' }] }));
        attemptSend(msg.localId, get, set);
      },
      retry: (localId) => attemptSend(localId, get, set),
      flushErrors: () => {
        get()
          .messages.filter((m) => m.status === 'error')
          .forEach((m) => attemptSend(m.localId, get, set));
      },
    }),
    {
      name: 'afterdune-chat-outbox',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ messages: state.messages }),
      // A message stuck 'sending' only means the app was killed mid-attempt
      // — nothing is actually in flight anymore after a cold start, so it
      // needs to come back as 'error' or it would sit forever with no retry
      // path (flushErrors only looks at 'error' items).
      onRehydrateStorage: () => (state) => {
        state?.messages.forEach((m) => {
          if (m.status === 'sending') m.status = 'error';
        });
      },
    }
  )
);
