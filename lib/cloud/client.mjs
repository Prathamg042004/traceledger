let client;
export const cloudConfigured=()=>!!process.env.NEXT_PUBLIC_SUPABASE_URL&&!!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export async function cloudClient() {
 if(!cloudConfigured())return null;
 if(!client){const {createClient}=await import('@supabase/supabase-js');client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,storage:window.localStorage,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});}
 return client;
}
export function resultOrThrow(result){if(result.error)throw new Error(result.error.message);return result.data;}
