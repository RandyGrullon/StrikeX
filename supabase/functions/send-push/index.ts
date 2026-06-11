// Edge Function: envía notificaciones push de Expo a todos los usuarios
// con push_token registrado.
//
// Desplegar con:  supabase functions deploy send-push
// La app la invoca automáticamente al enviar un aviso desde "Enviar aviso".

import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { title, body } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('push_token')
    .not('push_token', 'is', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const messages = (profiles ?? []).map((p) => ({
    to: p.push_token,
    sound: 'default',
    title,
    body,
  }));

  // Expo acepta lotes de hasta 100 mensajes
  for (let i = 0; i < messages.length; i += 100) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }

  return new Response(JSON.stringify({ sent: messages.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
