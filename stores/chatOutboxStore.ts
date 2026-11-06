import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContentBlockedError } from '@/lib/moderation';
import { userFacingError } from '@/lib/errors';
import { sendMessage } from '@/services/chat';
import { uploadChatImage } from '@/services/storage';

export type OutboxMessage = {
  localId: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  imageLocalUri: string | null;
  createdAt: string;
  /**
   * 'error' es un fallo transitorio y se reintenta solo al volver la
   * conexión. 'rejected' es definitivo — el filtro de contenido lo rechazó —
   * y nunca se reintenta: quedaría girando para siempre y volvería a fallar
   * igual. El usuario lo descarta a mano.
   */
  status: 'sending' | 'error' | 'rejected';
  /** Solo en 'rejected': el motivo, ya en texto para mostrar. */
  rejectedReason?: string | null;
};

type ChatOutboxState = {
  messages: OutboxMessage[];
  /** Adds the message and immediately attempts to send it — the common
   * online case resolves in place with no visible "queued" state; only a
   * failed attempt (offline, or a real server error) lingers as 'error'
   * until retry() or the next reconnect flush. */
  enqueue: (msg: Omit<OutboxMessage, 'status' | 'rejectedReason'>) => void;
  retry: (localId: string) => void;
  /** Saca el mensaje de la cola sin enviarlo — la única salida para uno
   * 'rejected', que por definición no se puede reintentar. */
  discard: (localId: string) => void;
  /** Re-attempts every 'error' item — called on network reconnect so
   * messages typed while offline go out on their own once the connection is
   * back, with no action required from the user. Los 'rejected' quedan
   * afuera a propósito. */
  flushErrors: () => void;
};

/**
 * Un rechazo del filtro de contenido no mejora con el tiempo ni con una
 * conexión mejor: da igual cuántas veces se reintente, el servidor va a
 * responder lo mismo. Distinguirlo evita un reintento infinito en cada
 * reconexión.
 */
function isPermanentRejection(error: unknown): boolean {
  if (error instanceof ContentBlockedError) return true;
  const message = error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message ?? '') : '';
  return message.includes('CONTENT_BLOCKED:');
}

async function attemptSend(localId: string, get: () => ChatOutboxState, set: (fn: (s: ChatOutboxState) => Partial<ChatOutboxState>) => void) {
  const msg = get().messages.find((m) => m.localId === localId);
  if (!msg) return;

  set((s) => ({ messages: s.messages.map((m) => (m.localId === localId ? { ...m, status: 'sending' } : m)) }));

  try {
    const imagePath = msg.imageLocalUri ? await uploadChatImage(msg.conversationId, msg.senderId, msg.imageLocalUri) : null;
    await sendMessage(msg.conversationId, msg.body, imagePath);
    set((s) => ({ messages: s.messages.filter((m) => m.localId !== localId) }));
  } catch (error) {
    const rejected = isPermanentRejection(error);
    set((s) => ({
      messages: s.messages.map((m) =>
        m.localId === localId
          ? {
              ...m,
              status: rejected ? 'rejected' : 'error',
              rejectedReason: rejected ? userFacingError(error) : null,
            }
          : m
      ),
    }));
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
      discard: (localId) => set((s) => ({ messages: s.messages.filter((m) => m.localId !== localId) })),
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
