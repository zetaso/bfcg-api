import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLIC_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables.");
}

const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

// Anonymous client for public reads. Never sign in with it: it is shared by every request.
export const supabase = createClient(supabaseUrl, supabaseKey, options);

// Fresh, throwaway client for sign-in / token refresh calls.
export const createAuthClient = () => createClient(supabaseUrl, supabaseKey, options);

// Client that acts as the signed-in user, so RLS policies decide what they can do.
export const createUserClient = (accessToken) =>
  createClient(supabaseUrl, supabaseKey, {
    ...options,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
