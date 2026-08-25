import { createClient } from '@supabase/supabase-js';

let browserClient;
let anonymousSignInPromise = null;

export function getSupabaseBrowser() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !publishableKey) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
      );
    }

    browserClient = createClient(url, publishableKey);
  }

  return browserClient;
}

export async function ensureAnonymousSession() {
  const supabase = getSupabaseBrowser();

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  if (sessionData.session) {
    return sessionData.session;
  }

  if (!anonymousSignInPromise) {
    anonymousSignInPromise = (async () => {
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) throw error;

      if (!data.session) {
        throw new Error('Anonymous sign-in did not return a session.');
      }

      return data.session;
    })();
  }

  try {
    return await anonymousSignInPromise;
  } finally {
    anonymousSignInPromise = null;
  }
}

export async function getActiveSession() {
  const supabase = getSupabaseBrowser();

  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  let session = data.session;

  if (!session) {
    return ensureAnonymousSession();
  }

  const expiresAtMs = session.expires_at
    ? session.expires_at * 1000
    : 0;

  const expiresSoon =
    expiresAtMs &&
    expiresAtMs - Date.now() < 90_000;

  if (expiresSoon) {
    const {
      data: refreshed,
      error: refreshError,
    } = await supabase.auth.refreshSession();

    if (refreshError) throw refreshError;

    if (refreshed.session) {
      session = refreshed.session;
    }
  }

  return session;
}