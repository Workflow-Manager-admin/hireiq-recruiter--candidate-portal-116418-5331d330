# Supabase Integration for HireIQ React Frontend

This app uses [Supabase](https://supabase.com/) for authentication and data management.

## Environment Variables

Create a `.env` file with your Supabase Project settings:
```
REACT_APP_SUPABASE_URL=your-project-url
REACT_APP_SUPABASE_KEY=your-public-anon-key
```
**Never expose the service_role key in frontend code. Always use anon/public key.**

## Supabase Tables Suggested

- recruiter (user_id, company_name?, other recruiter-specific fields)
- candidate_profile (user_id, full_name, skills, resume_url, ...)
- job (id, title, description, location, type, recruiter_id (foreign key))
- application (id, job_id, candidate_id, created_at)
- application_full_view (Supabase View joining job/application/candidate for recruiters/candidates)

## Usage

- Auth: `supabase.auth.signInWithPassword`, `supabase.auth.signUp`, `supabase.auth.signOut`
- CRUD: `supabase.from('table').insert([data])`, `select`, `update`, etc.

## Role logic

Roles are inferred by table:
- If recruiter row exists with user_id, user is recruiter.
- If candidate_profile row exists, user is candidate.

## Deploy

Prod API keys and URLs should be set on the host environment or Vercel/Netlify dashboard.

