# AMC site — backlog

## Quick wins (easy)

- **Value Watch series badge:** Add a clear `Series` badge on Value Watch cards so first-time readers understand it is recurring.
- **Undervalued strip clarity:** Change strip microcopy to explicitly say `AMC Value Watch` instead of generic language.
- **Archive card consistency:** Keep article cards visually consistent (pill + title + meta) and use a small series indicator when relevant.
- **Archive helper text:** Keep one evergreen line that explains newest-to-oldest ordering (no hardcoded counts).
- **Mobile discoverability pass:** Ensure nav labels and section labels use consistent title case and naming.

## Medium effort

- **Archive filters + search:** Add category filters and keyword search to `All Articles`.
- **Start Here module:** Add a persistent orientation block for new readers (best intro, grading guide, latest Value Watch).
- **Read-next logic:** Improve end-of-article recommendations by category/series intent.
- **Value Watch freshness stamp:** Show `Last updated` date near the Value Watch strip.

## Larger ideas (later)

- **Reading progress bar:** Add subtle progress indicator on article pages.
- **Sticky section nav for long posts:** Auto-generate in-page links from article headings.
- **First-visit series nudge:** Optional dismissible banner/toast to introduce recurring series.
- **Reusable market note/disclaimer block:** Toggleable component for market-focused posts.

## Code touchpoints

- `index.html`: nav labels, `renderUndervaluedHomeStrip`, `renderAllArticlesHomeStrip`, `renderAllArticlesArchive`, card templates.
- `vercel.json`: route rewrites for any new static-like page paths.
- `admin.html` (optional parity): future series flags/labels in publishing workflow.
