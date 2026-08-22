import { mockUser } from "./mock-data";
import type { User } from "./types";

/**
 * Returns the currently authenticated user.
 *
 * TODO(auth): Replace this with the real Supabase session lookup.
 * When Supabase Auth is wired in, use `@supabase/ssr` on the server:
 *
 *   import { createServerClient } from '@supabase/ssr';
 *   import { cookies } from 'next/headers';
 *
 *   const supabase = createServerClient(URL, KEY, { cookies });
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 * The returned object should map to our `User` type (`id` from `user.id`,
 * `name` from `user.user_metadata.full_name` or a fallback).
 *
 * Until then, every screen renders as Aarav from mock data.
 */
export async function getCurrentUser(): Promise<User> {
  return mockUser;
}
