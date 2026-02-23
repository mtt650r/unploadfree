# UploadFree.net – Netlify + Cloudflare R2 + Supabase (30MB videos)

This project deploys **fully online**:
- Frontend: Netlify static site (client/)
- Backend: Netlify Functions (netlify/functions/)
- Storage: Cloudflare R2 (private bucket) using signed PUT/GET URLs
- Database: Supabase Postgres table `videos`

## Deploy steps (high level)
1) Create Cloudflare R2 bucket (private) and API token with **Object Read & Write** scoped to that bucket.
2) Create Supabase project and run:

```sql
create table videos (
  token text primary key,
  object_key text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  view_limit int not null default 0,
  views int not null default 0,
  expires_at timestamptz
);
```

3) Netlify: New site from Git (recommended). Set Environment Variables (Production + Deploy Previews):
- ADMIN_UPLOAD_KEY (secret)
- BASE_URL = https://your-domain
- R2_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY (secret)
- R2_BUCKET
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (legacy service_role, secret)

4) Deploy.
5) Test:
- https://your-domain/.netlify/functions/getMeta  -> should return {"error":"Missing token"}
- https://your-domain/upload.html -> upload -> watch link
