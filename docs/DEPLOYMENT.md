# Deployment Notes

## Local development

Run npm install, then npm run dev.

Open http://localhost:3000.

## Production check

Run npm run check before every push.

## Vercel deployment

1. Push main branch to GitHub.
2. Import the GitHub repo into Vercel.
3. Framework preset: Next.js.
4. Build command: npm run build.
5. Install command: npm install.
6. Output directory: default.
7. Add Supabase variables only if cloud persistence is enabled.

## Current persistence mode

The app currently saves in the browser. Use Settings to export backups after real shop work.
