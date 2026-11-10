/* Where this copy of the Hub is being served, and what that allows.

   Matt, 2026-11-10: *"the elevate console should not be accessible through
   the demo pages on elevatemanagedservices.com, just the industry picker and
   each industries demo hub"*. The Elevate website serves this build at
   /demo/, so a page under that path is a PUBLIC copy: the picker and the
   demos only, with the staff console gone from every screen and every route.
   The Hub's own site keeps the console for Elevate staff.

   On that public copy: *"every industry should be customizable only on the
   brand identity page ... no connectors can be adjusted and no data entry
   anywhere else"*. So the public demo is READ ONLY outside Brand & identity,
   which keeps its edits in the viewer's own browser.

   The Hub's own site is the team's demo and stays fully adjustable (Matt,
   2026-11-10: *"the hub's own site is for our team to use as a demo and can
   be adjusted as they see fit"*). */

export const PUBLIC = /\/demo(\/|$)/.test(location.pathname) || /[?&]public\b/.test(location.search);

/* Only the public copy on the Elevate website is locked. */
export function locked(s) { return PUBLIC && !s.tenant; }
