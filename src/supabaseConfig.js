// The project address and the PUBLISHABLE key. The publishable key is designed to be public: it
// can only do what Row Level Security (see supabase/schema.sql) allows a signed-in person to do.
// Never put the secret key (sb_secret_...) or the database password anywhere in this app.
// To use a different project, set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://kjjzaafrioirzhsnpmtt.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? 'sb_publishable_R0P3fF5b1kxfq-KQx3Xy2A_oU9c7Hm8'
