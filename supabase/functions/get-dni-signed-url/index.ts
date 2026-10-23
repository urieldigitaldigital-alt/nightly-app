// Edge Function: generates a short-lived signed URL for a DNI photo
// uploaded with an event request. The dni-photos storage bucket has no
// SELECT policy at all (see 0016_push_dni_checkin.sql) — a storage policy
// can't express "organizer of the event this particular upload belongs to"
// from the file path alone (the path only encodes the requester, not the
// event), so authorization happens here instead: the request is read with
// the CALLER's own JWT, which means event_requests' existing RLS policy
// ("requester_id = auth.uid() or is_event_organizer(event_id)") already
// decides who's allowed to see it. Only once that read succeeds do we reach
// for the service role to actually sign the URL.
//
// Deploy: supabase functions deploy get-dni-signed-url
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SIGNED_URL_TTL_SECONDS = 300;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });

  const { request_id } = await req.json();
  if (!request_id) return new Response(JSON.stringify({ error: 'Missing request_id' }), { status: 400 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: request, error } = await callerClient
    .from('event_requests')
    .select('dni_photo_path')
    .eq('id', request_id)
    .single();

  if (error || !request) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }
  if (!request.dni_photo_path) {
    return new Response(JSON.stringify({ error: 'No DNI photo on this request' }), { status: 404 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: signed, error: signError } = await admin.storage
    .from('dni-photos')
    .createSignedUrl(request.dni_photo_path, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed) {
    return new Response(JSON.stringify({ error: 'Could not sign URL' }), { status: 500 });
  }

  return new Response(JSON.stringify({ url: signed.signedUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
