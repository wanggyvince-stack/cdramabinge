# Deployment Safety Protocol

## Incident: 2026-08-24 Full Site 404

### Root Cause
During IndexNow integration (commits `99dfda0`–`bc6cf8a`), `middleware.ts` was rewritten to handle IndexNow key verification. The rewrite **removed the `next-intl/middleware` `createMiddleware()` call**, which is responsible for locale-based routing (`/` → `/en`, locale validation, etc.).

Without the intl middleware:
- `/` did not redirect to `/en`
- `/en` matched `[locale]` route but `notFound()` was called by the layout's locale validation
- All pages returned 404

### Impact
- Site fully down from ~Aug 23 to Aug 24
- All SEO pages (960+) inaccessible
- Google/Bing crawlers hitting 404s

---

## Prevention Rules

### Rule 1: NEVER modify middleware.ts without locale middleware
The `middleware.ts` file MUST always include:
```typescript
import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});
```

Any additional middleware logic must be wrapped AROUND this, not replace it.

### Rule 2: Pre-merge checklist
Before merging any PR that touches these files, verify:
- [ ] `middleware.ts` — locale middleware intact
- [ ] `i18n.ts` — locales array unchanged
- [ ] `next.config.js` — no breaking changes
- [ ] `vercel.json` — rewrites don't conflict with Next.js routes

### Rule 3: Protected files
These files require extra scrutiny in code review:
- `middleware.ts`
- `i18n.ts`
- `next.config.js`
- `app/[locale]/layout.tsx`

### Rule 4: Automated health check
The GitHub Actions workflow `.github/workflows/health-check.yml` runs after every Vercel deployment. It checks:
- Homepage redirect (`/` → 307 → `/en`)
- All 4 locale pages (200)
- Drama detail page (200)
- Actor page (200)
- IndexNow key verification

If any check fails, the workflow alerts immediately.

---

## Emergency Rollback Procedure

### Option 1: Git revert (fastest)
```bash
git revert HEAD --no-edit
git push origin main
```
Wait for Vercel to redeploy (~2 min).

### Option 2: Vercel dashboard rollback
1. Go to Vercel Dashboard → Project → Deployments
2. Find the last known good deployment
3. Click "..." → "Promote to Production"
4. Site restores immediately

### Option 3: Manual middleware fix
If only `middleware.ts` is broken:
1. Edit `middleware.ts` on GitHub (web editor)
2. Ensure `createMiddleware` from `next-intl/middleware` is present
3. Commit directly to `main`
4. Wait for Vercel redeploy

---

## Monitoring

### Health check endpoints
| URL | Expected | What it tests |
|-----|----------|---------------|
| `https://cdramabinge.com` | 307 → `/en` | Root redirect |
| `https://cdramabinge.com/en` | 200 | Locale routing |
| `https://cdramabinge.com/en/drama/the-untamed` | 200 | DB + detail page |
| `https://cdramabinge.com/03a92e0080b24cfaa16c8d475ba543ed.txt` | key text | IndexNow |

### Quick self-check command
```bash
curl -sI https://cdramabinge.com/en | grep HTTP
# Should return: HTTP/2 200
```
