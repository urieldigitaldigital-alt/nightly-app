import { supabase } from '@/lib/supabase';

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob.arrayBuffer();
}

function extensionFromUri(uri: string): string {
  const match = uri.match(/\.(\w+)$/);
  return match ? match[1].toLowerCase() : 'jpg';
}

/** Path convention `{userId}/avatar-{timestamp}.ext` — matches the storage
 * RLS policy in 0012_storage.sql, which checks the first path segment. */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const ext = extensionFromUri(localUri);
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const buffer = await uriToArrayBuffer(localUri);

  const { error } = await supabase.storage.from('avatars').upload(path, buffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

/** Path convention `{eventId}/{sortOrder}-{timestamp}.ext`. */
export async function uploadEventImage(eventId: string, localUri: string, sortOrder = 0): Promise<string> {
  const ext = extensionFromUri(localUri);
  const path = `${eventId}/${sortOrder}-${Date.now()}.${ext}`;
  const buffer = await uriToArrayBuffer(localUri);

  const { error } = await supabase.storage.from('event-images').upload(path, buffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('event-images').getPublicUrl(path);
  return data.publicUrl;
}

/** `dni-photos` is a private bucket (0016_push_dni_checkin.sql) — there's no
 * getPublicUrl for it. Returns the storage path, which request_event_access
 * stores on the request row; viewing it later goes through the
 * get-dni-signed-url Edge Function, never a direct public URL. */
export async function uploadDniPhoto(requesterId: string, eventId: string, localUri: string): Promise<string> {
  const ext = extensionFromUri(localUri);
  const path = `${requesterId}/${eventId}-${Date.now()}.${ext}`;
  const buffer = await uriToArrayBuffer(localUri);

  const { error } = await supabase.storage.from('dni-photos').upload(path, buffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  });
  if (error) throw error;

  return path;
}
