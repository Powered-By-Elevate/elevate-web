# Vendored libraries (pinned copies, never fetched at runtime from elsewhere)

| File | Library | Version | Licence | Why |
| --- | --- | --- | --- | --- |
| `d3-7.9.0.min.js` | d3 (Mike Bostock) | 7.9.0 | ISC | The chart engine d3-org-chart is built on |
| `d3-flextree-2.1.2.min.js` | d3-flextree (Klortho) | 2.1.2 | WTFPL | The variable-size tree layout d3-org-chart needs |
| `d3-org-chart-3.1.1.min.js` | d3-org-chart (David Bumbeishvili) | 3.1.1 | MIT | The HR Org chart: expandable cards, zoom, pan, compact layout |
| `sortable-1.15.6.min.js` | SortableJS | 1.15.6 | MIT | Drag and drop on the Talent review nine-box and the report column order, touch included |

Read before adoption (2026-11-05): no network calls, no storage, no eval. d3-org-chart's one
XMLHttpRequest is inside its image-export helper, which the Hub never calls. Loaded only on the
pages that use them (`src/js/pages/hrmash.js` `need()`).
