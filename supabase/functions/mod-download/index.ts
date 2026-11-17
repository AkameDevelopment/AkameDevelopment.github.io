import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {createDownloadHandler} from './handler.js';
Deno.serve(createDownloadHandler({url:Deno.env.get('SUPABASE_URL')!,anon:Deno.env.get('SUPABASE_ANON_KEY')!,service:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,createClient}));
