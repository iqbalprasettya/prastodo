# PrastTodo

> A simple Todo List with a retro brown neo-brutalism interface, built with React and Supabase.

[![React](https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61dafb)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%2B%20Auth-3fcf8e?logo=supabase&logoColor=white)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-Nginx-2496ed?logo=docker&logoColor=white)](https://www.docker.com/)

PrastTodo is a lightweight productivity app for managing daily tasks without unnecessary complexity. It uses Supabase Anonymous Auth and Row Level Security (RLS), so every browser gets a private Todo list without requiring a registration form.

Live demo: [prastodo.iqbalprasettya.web.id](https://prastodo.iqbalprasettya.web.id)

## Features

- Add, edit, delete, and complete Todo items
- Filter tasks by all, active, or completed status
- Track daily completion progress
- Clear completed tasks in one click
- Persist tasks in a Supabase Postgres database
- Create private anonymous sessions without a login form
- Protect user data with Supabase Row Level Security
- Responsive neo-brutalism interface for desktop and mobile
- Serve production assets with Nginx and automatic HTTPS through Caddy

## Tech Stack

- [React](https://react.dev/) for the user interface
- [Vite](https://vite.dev/) for development and production builds
- [Supabase](https://supabase.com/) for Postgres, Anonymous Auth, and RLS
- [Nginx](https://nginx.org/) for serving static production assets
- [Caddy](https://caddyserver.com/) for reverse proxying and automatic HTTPS
- [Docker](https://www.docker.com/) for containerized deployment

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project

### Installation

```bash
git clone https://github.com/your-username/prasttodo.git
cd prasttodo
npm install
```

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Use only a Supabase publishable key in the frontend. Never expose a secret key or legacy `service_role` key.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Supabase Setup

Enable anonymous sign-ins from:

```text
Authentication > Providers > Anonymous Sign-Ins
```

Then run this SQL in the Supabase SQL Editor:

```sql
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.todos enable row level security;

grant select, insert, update, delete on public.todos to authenticated;

create policy "users can read own todos"
on public.todos for select to authenticated
using ((select auth.uid()) = user_id);

create policy "users can add own todos"
on public.todos for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update own todos"
on public.todos for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users can delete own todos"
on public.todos for delete to authenticated
using ((select auth.uid()) = user_id);
```

Anonymous users are private per browser session. If browser storage is cleared, users cannot recover the same anonymous account. Add email or OAuth authentication if cross-device sync is required.

## Available Scripts

```bash
npm run dev      # Start the local development server
npm run build    # Build production assets into dist/
npm run preview  # Preview the production build locally
```

## Docker Deployment

Build the frontend assets and image:

```bash
npm install
npm run build
docker build -t prasttodo:latest .
```

Create a private Docker network and start the app:

```bash
docker network create prasttodo-web
docker run -d \
  --name prasttodo \
  --restart unless-stopped \
  --network prasttodo-web \
  prasttodo:latest
```

The app container is intentionally not published directly to the internet. Caddy is the public entry point.

### HTTPS with Caddy

Point your domain's `A` record to the VPS IP address, then update `Caddyfile`:

```caddyfile
prastodo.example.com {
  reverse_proxy prasttodo:80
}
```

Start Caddy:

```bash
docker run -d \
  --name prasttodo-caddy \
  --restart unless-stopped \
  --network prasttodo-web \
  -p 80:80 \
  -p 443:443 \
  -p 443:443/udp \
  -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" \
  -v prasttodo_caddy_data:/data \
  -v prasttodo_caddy_config:/config \
  caddy:2-alpine
```

Caddy will automatically request, install, and renew the TLS certificate.

## Security Notes

- RLS must remain enabled on `public.todos`.
- Frontend code should contain only a Supabase publishable key.
- Do not commit `.env.local`.
- Anonymous auth is convenient for demos, but a public app should add CAPTCHA or Cloudflare Turnstile to reduce automated sign-up abuse.
- Use permanent authentication if users need account recovery or synchronization across devices.

## Project Structure

```text
.
|-- src/
|   |-- App.jsx
|   |-- main.jsx
|   |-- styles.css
|   `-- supabaseClient.js
|-- Caddyfile
|-- Dockerfile
|-- nginx.conf
|-- index.html
`-- package.json
```

## License

This project is available under the [MIT License](LICENSE).

