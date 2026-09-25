/** Shared between client and server code — must stay free of `server-only`. */
export const CURRENCY_COOKIE = "currency";
export const ADMIN_COOKIE = "waatnia_admin";
export const LOCAL_STORAGE_CART_KEY = "waatnia.cart.v1";

/**
 * The store has a single administrator, so the sign-in form asks for the
 * password only. The email stays in the schema because `AdminUser.email` is
 * unique and every activity-log row is attributed to it — it is an internal
 * identifier, not something the owner has to type or remember.
 */
export const ADMIN_EMAIL = "admin@waatnia.sy";

/**
 * Currency is a client-only preference, deliberately NOT a cookie: reading
 * cookies() in the root layout would force every page to render dynamically.
 * Prices ship as `data-sar` attributes and a pre-paint script formats them.
 */
export const CURRENCY_LS_KEY = "waatnia.currency";
export const CURRENCY_EVENT = "waatnia:currency";
