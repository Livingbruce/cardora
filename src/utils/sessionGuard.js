import { supabase } from "./supabase";

const DEVICE_STORAGE_KEY = "cardora_device_id";
const TAB_SESSION_KEY = "cardora_tab_session_id";

export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (!deviceId) {
    deviceId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  }
  return deviceId;
}

export function createNewTabSessionId() {
  const sessionId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(TAB_SESSION_KEY, sessionId);
  return sessionId;
}

export function getTabSessionId() {
  return sessionStorage.getItem(TAB_SESSION_KEY);
}

export function clearTabSessionId() {
  sessionStorage.removeItem(TAB_SESSION_KEY);
}

export function sanitizeUsername(rawUsername) {
  return rawUsername
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_");
}

export function usernameToInternalEmail(cleanUsername) {
  return `${sanitizeUsername(cleanUsername)}@cardora.local`;
}

/**
 * Authenticates a user and enforces:
 * 1) Untrusted/new device gets a separate isolated account (<username>_<deviceSuffix>)
 *    with its own profile, $0 balance, and separate orders/deliveries.
 * 2) Only 1 active session at a time on the account (overwrites active_session_id).
 */
export async function loginWithDeviceIsolation({ rawUsername, password }) {
  const baseUsername = rawUsername.trim();
  const baseEmail = usernameToInternalEmail(baseUsername);
  const currentDeviceId = getOrCreateDeviceId();
  const deviceSuffix = currentDeviceId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toLowerCase();

  // First try signing in with the primary username
  const primarySignIn = await supabase.auth.signInWithPassword({
    email: baseEmail,
    password
  });

  if (primarySignIn.error) {
    // If primary failed, check if an isolated device account already exists for this device + password
    const isolatedUsername = `${baseUsername}_${deviceSuffix}`;
    const isolatedEmail = usernameToInternalEmail(isolatedUsername);

    const isolatedSignIn = await supabase.auth.signInWithPassword({
      email: isolatedEmail,
      password
    });

    if (isolatedSignIn.error) {
      return { error: primarySignIn.error };
    }

    const newSessionId = createNewTabSessionId();
    const uid = isolatedSignIn.data.user.id;

    await supabase
      .from("profiles")
      .upsert(
        {
          uid,
          username: isolatedUsername,
          trusted_device_id: currentDeviceId,
          active_session_id: newSessionId
        },
        { onConflict: "uid" }
      );

    return {
      user: isolatedSignIn.data.user,
      username: isolatedUsername,
      isolated: true
    };
  }

  // Primary credentials succeeded; check trusted_device_id on profile
  const primaryUser = primarySignIn.data.user;
  const { data: profile } = await supabase
    .from("profiles")
    .select("uid, username, telegram, trusted_device_id, balance")
    .eq("uid", primaryUser.id)
    .maybeSingle();

  const existingTrustedDevice = profile?.trusted_device_id;

  // Another device trying to use this account -> create/use a separate isolated account
  if (existingTrustedDevice && existingTrustedDevice !== currentDeviceId) {
    // Sign out of the original user's session immediately so they cannot touch funds/orders
    await supabase.auth.signOut({ scope: "local" });

    const isolatedUsername = `${profile?.username || baseUsername}_${deviceSuffix}`;
    const isolatedEmail = usernameToInternalEmail(isolatedUsername);

    // Try logging into existing isolated account for this device first
    let isolatedAuth = await supabase.auth.signInWithPassword({
      email: isolatedEmail,
      password
    });

    if (isolatedAuth.error) {
      const signUpRes = await supabase.auth.signUp({
        email: isolatedEmail,
        password,
        options: {
          data: {
            username: isolatedUsername,
            telegram: profile?.telegram || null,
            parent_account_device_conflict: true
          }
        }
      });

      if (signUpRes.error) {
        return { error: signUpRes.error };
      }

      isolatedAuth = await supabase.auth.signInWithPassword({
        email: isolatedEmail,
        password
      });

      if (isolatedAuth.error) {
        return { error: isolatedAuth.error };
      }
    }

    const newSessionId = createNewTabSessionId();
    const isolatedUid = isolatedAuth.data.user.id;

    await supabase
      .from("profiles")
      .upsert(
        {
          uid: isolatedUid,
          username: isolatedUsername,
          telegram: profile?.telegram || null,
          trusted_device_id: currentDeviceId,
          active_session_id: newSessionId,
          balance: 0.0
        },
        { onConflict: "uid" }
      );

    return {
      user: isolatedAuth.data.user,
      username: isolatedUsername,
      isolated: true
    };
  }

  const newSessionId = createNewTabSessionId();
  const resolvedUsername = profile?.username || baseUsername;

  await supabase
    .from("profiles")
    .upsert(
      {
        uid: primaryUser.id,
        username: resolvedUsername,
        telegram: profile?.telegram || null,
        trusted_device_id: existingTrustedDevice || currentDeviceId,
        active_session_id: newSessionId
      },
      { onConflict: "uid" }
    );

  return {
    user: primaryUser,
    username: resolvedUsername,
    isolated: false
  };
}