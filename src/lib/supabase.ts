// App's Supabase client — points at the user's own Supabase project.
// URL + publishable (anon) key are public-safe to ship in the bundle.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = "https://hguybvskkecnsvidsltn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3rNrA1VLOQL5i83VrV05_g_QnE_AKkb";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
