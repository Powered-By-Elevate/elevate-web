/* Where this copy of the Hub is being served, and what that allows.

   Matt, 2026-11-10: *"the elevate console should not be accessible through
   the demo pages on elevatemanagedservices.com, just the industry picker and
   each industries demo hub"*. The Elevate website serves this build at
   /demo/, so a page under that path is a PUBLIC copy: the picker and the
   demos only, with the staff console gone from every screen and every route.
   The Hub's own site keeps the console for Elevate staff.

   And on any demo (not a client's own Hub): *"every industry should be
   customizable only on the brand identity page ... no connectors can be
   adjusted and no data entry anywhere else"*. So a demo is READ ONLY outside
   Brand & identity, which keeps its edits in the viewer's own browser. */

export const PUBLIC = /\/demo(\/|$)/.test(location.pathname) || /[?&]public\b/.test(location.search);

/* Elevate staff keep the full settings console: anyone who came in through
   the console, or a copy opened with ?edit (which the test suite uses). The
   public copy ignores both, because it has no console to come in through. */
const EDIT = !PUBLIC && /[?&]edit\b/.test(location.search);

/* A demo is any Hub that is not a client's own deployment. */
export function locked(s) {
  if (s.tenant || EDIT) return false;
  const who = s.data && s.data.session;
  return !(who && who.kind === 'staff' && !PUBLIC);
}
