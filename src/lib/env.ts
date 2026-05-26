/**
 * Returns true only when running on the production hosts.
 * Used to gate behavior that should differ between Test (preview/lovable.app)
 * and Live (familydesk.in).
 */
export function isProductionHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "familydesk.in" || host === "www.familydesk.in";
}