import { supabase } from '@/lib/supabase';

export type PendingReport = {
  id: string;
  target_type: 'event' | 'profile' | 'message';
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  /** 'automatic' = lo marcó el filtro de contenido, no una persona. */
  source: 'user' | 'automatic';
  reporter: { username: string } | null;
};

export async function fetchPendingReports(): Promise<PendingReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, target_type, target_id, reason, details, status, created_at, source, reporter:profiles!reports_reporter_id_fkey(username)')
    .eq('status', 'pending')
    // Las más viejas primero: lo que corre riesgo de pasarse de las 24 horas
    // que promete el compromiso de moderación tiene que estar arriba, no
    // sepultado debajo de lo que acaba de entrar.
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    reporter: Array.isArray(row.reporter) ? row.reporter[0] ?? null : row.reporter ?? null,
  }));
}

/** Horas transcurridas desde que entró la denuncia. */
export function hoursWaiting(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
}

/** El compromiso público es revisar toda denuncia dentro de las 24 horas. */
export const MODERATION_SLA_HOURS = 24;

type AdminAction =
  | { type: 'resolve_report'; reportId: string; resolution: 'actioned' | 'dismissed' }
  | { type: 'suspend_user'; userId: string }
  | { type: 'verify_organizer'; userId: string; verified: boolean }
  | { type: 'cancel_event'; eventId: string };

export async function runAdminAction(action: AdminAction) {
  const { data, error } = await supabase.functions.invoke('admin-moderate', { body: action });
  if (error) throw error;
  return data;
}
