import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in (or set them in Vercel's env)."
  );
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Must be true: the password-recovery and email-confirmation links
    // land with tokens in the URL hash. Without this the tokens are
    // dropped, PASSWORD_RECOVERY never fires and reset is impossible.
    detectSessionInUrl: true
  }
});
