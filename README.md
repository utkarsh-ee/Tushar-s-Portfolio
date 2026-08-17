# Tushar Mishra Portfolio — production-ready CMS build

## Included
- Full-screen Spline background with desktop torch interaction.
- Statue drag/zoom blocked; mobile Spline interaction disabled.
- Responsive editorial portfolio.
- Contact form frontend targeting `/api/contact`.
- Vercel serverless contact endpoint.
- Google Calendar and Google Reviews UI placeholders ready for the client's real links.
- Legal route finder and structured case-intake UI prototype.
- **Real owner portal** at `/admin.html` using Supabase Auth + Postgres/RLS.
- Live experience CRUD: add, edit, delete, publish/unpublish.
- Public Experience section automatically reads published entries from Supabase.
- Favicon, robots.txt and 404 page.

## 1. Create Supabase
1. Create a project at https://supabase.com/
2. In Authentication → Users, create the owner's email/password account.
3. Copy the owner's User UID.
4. Open SQL Editor and run `supabase-schema.sql`.
5. In the SQL file, replace `OWNER_AUTH_USER_UUID` with the owner's actual UID and run that insert statement.
6. In Project Settings → API, copy the Project URL and anon/public key.
7. Put them into `supabase-config.js`:

```js
window.SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

The anon key is intentionally browser-visible. Security comes from Supabase Row Level Security. Never put a service-role key in this file.

## 2. Disable public signups
In Supabase Authentication settings, disable open user signups if the portal is for one owner only. The owner account created in the dashboard remains usable.

## 3. Vercel
Use Framework Preset: **Other**. No build command is required.

Keep the project root as the root directory.

## 4. Contact email variables
Configure these in Vercel as appropriate:
- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`
- `CONTACT_FROM_EMAIL`
- `ALLOWED_ORIGIN`

The Resend key stays server-side in `/api/contact.js`.

## 5. Owner portal
Public site: `/`
Owner portal: `/admin.html`

The portal is protected by Supabase Auth and database RLS. An authenticated user who is not listed in `site_admins` cannot modify experience records.

## 6. Current scope
The owner CMS currently makes **Experience** fully live. The same database/auth pattern can be extended to Education, Publications, Practice Areas, testimonials and AI routing rules.

The Legal Route Finder is still a front-end prototype. It does not yet call an AI model. That should be added only after the client approves the question flow and legal output format.
