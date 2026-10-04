# Deploying

`npm run build` produces a static site in `dist/`. There is no backend.

## Cloudflare Pages or Netlify (recommended)

- Build command: `npm run build`
- Output directory: `dist`
- Node: 22 or newer

Both read `public/_headers` (copied to `dist/_headers`), which sets a strict Content Security
Policy (`connect-src 'none'`: the page cannot send data anywhere), `Referrer-Policy: no-referrer`,
`X-Content-Type-Options`, `Permissions-Policy`, and long-lived caching for hashed assets.

`npm run preview` serves the build with the same headers, and the end-to-end tests run against it,
so a CSP regression fails the tests.

## Other static hosts

GitHub Pages and plain object storage can't set response headers. The app works there, but
without the CSP. If you host it under a sub-path, set `base` in `vite.config.ts`.

## Checklist

1. `npm ci && npm run lint && npm run typecheck && npm test && npm run test:e2e`
2. `npm run build`
3. Upload `dist/` (or connect the repository to the host).
4. Check the response headers on the deployed site (browser devtools, Network tab).
