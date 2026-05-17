import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-only client — uses service role key so RLS doesn't block reads.
// Only imported in server components; never exposed to the browser.
export const supabase = createClient(url, serviceKey)
