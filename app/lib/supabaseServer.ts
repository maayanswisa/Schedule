import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// לקוח לשימוש בצד שרת בלבד (API Routes / Server Actions)
export const supabaseServer = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
