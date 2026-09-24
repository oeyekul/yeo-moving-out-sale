import{createClient}from'@supabase/supabase-js';

const URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://vlhmgibgkhjohdcrioqt.supabase.co';
const KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_elDipZP8kzYP5ymYEjmMwA_rVJT1H5s';

let client;
export function supabase(){
  if(!client) client=createClient(URL,KEY,{auth:{experimental:{passkey:true}}});
  return client;
}
