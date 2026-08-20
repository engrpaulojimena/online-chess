import { createClient } from '@supabase/supabase-js';

let browserClient;
let anonymousSignInPromise = null;

export function getSupabaseBrowser() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !publishableKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
    }

    browserClient = createClient(url, publishableKey);
  }

  return browserClient;
}

export async function ensureAnonymousSession() {
  const supabase = getSupabaseBrowser();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (sessionData.session) return sessionData.session;

  // React/Next development mode can run effects more than once.
  // Keep only ONE anonymous sign-in request in flight so one browser
  // cannot accidentally create two different anonymous users.
  if (!anonymousSignInPromise) {
    anonymousSignInPromise = (async () => {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      if (!data.session) throw new Error('Anonymous sign-in did not return a session.');
      return data.session;
    })();
  }

  try {
    return await anonymousSignInPromise;
  } finally {
    anonymousSignInPromise = null;
  }
}
