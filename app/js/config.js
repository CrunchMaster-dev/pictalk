// PicTalk Free+ configuration.
//
// Free+ (optional cloud backup & sync) stays completely OFF until these are filled in
// and FREEPLUS_ENABLED is set to true. With it off, PicTalk behaves exactly as a
// local-only app — no Free+ UI, no network, no change for anyone.
//
// The anon key is a PUBLISHABLE key (safe in client code). Never put the service_role
// key here.

export const SUPABASE_URL = "https://tdkxavrchuhenjqvijtw.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_sqBlnnK4Z_PlMT2ZbHoGEg_XRGDjV9M";

// Flip to true only after both values above are set and the schema has been run.
export const FREEPLUS_ENABLED = true;

// True only when Free+ is enabled AND configured.
export function freePlusConfigured() {
  return FREEPLUS_ENABLED && SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
