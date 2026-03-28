/**
 * Admin UI for certain accounts is only allowed on localhost.
 * Deployed (e.g. Vercel) must rely on DB flags for real superadmins only.
 */

const DEV_ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_DEV_BYPASS_EMAIL?.toLowerCase();

/** Always treat this account as local-only, even if NEXT_PUBLIC_ADMIN_DEV_BYPASS_EMAIL is unset in prod. */
const LOCAL_ONLY_ADMIN_EMAIL_FALLBACK = "hj2567@columbia.edu";

export function isLocalhostApp(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

export function isLocalOnlyAdminEmail(
  email: string | undefined | null
): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  if (DEV_ADMIN_EMAIL && e === DEV_ADMIN_EMAIL) return true;
  if (e === LOCAL_ONLY_ADMIN_EMAIL_FALLBACK) return true;
  return false;
}

/** Grant admin UI without DB check (local dev only). */
export function shouldGrantLocalDevAdminBypass(
  email: string | undefined | null
): boolean {
  return isLocalhostApp() && isLocalOnlyAdminEmail(email);
}

/** Block this account on any non-localhost host, even if profiles.is_superadmin is true. */
export function shouldDenyNonLocalAdminEmail(
  email: string | undefined | null
): boolean {
  return !isLocalhostApp() && isLocalOnlyAdminEmail(email);
}
