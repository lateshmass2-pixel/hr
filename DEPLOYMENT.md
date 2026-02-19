# Deployment Guide for HEMS App

Your application is built with **Next.js**, **Supabase**, and **Prisma**, making **Vercel** the ideal hosting platform.

## Prerequisites

1.  **GitHub Account**: Your code is already pushed to GitHub (`github.com/lateshmass2-pixel/hr`).
2.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com) using your GitHub account.
3.  **Supabase Account**: Sign up at [supabase.com](https://supabase.com).

## Step 1: Set up Supabase (Database)

1.  **Create a New Project**:
    *   Go to your Supabase Dashboard and click "New Project".
    *   Name it (e.g., `hems-production`) and set a strong database password. Save this password!
    *   Select a region close to your users (e.g., Mumbai, Singapore).

2.  **Get Connection Details**:
    *   Go to **Project Settings > API**.
        *   Copy `Project URL` (this is `NEXT_PUBLIC_SUPABASE_URL`).
        *   Copy `anon public` key (this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
        *   (If needed for backend scripts) Copy `service_role` key (this is `SUPABASE_SERVICE_ROLE_KEY`).
    *   Go to **Project Settings > Database > Connection String > URI**.
        *   Copy the connection string. Replace `[YOUR-PASSWORD]` with the password you set.
        *   This is your `DATABASE_URL`. Make sure to add `?pgbouncer=true` to the end if using Vercel (recommended for connection pooling), or use the intended pooling URL provided by Supabase.

## Step 2: Set up Vercel (Hosting)

1.  **Import Project**:
    *   Go to your Vercel Dashboard and click "Add New... > Project".
    *   Import from your GitHub repository: `lateshmass2-pixel/hr`.

2.  **Configure Project**:
    *   **Framework Preset**: Should automatically detect `Next.js`.
    *   **Root Directory**: Leave as `./`.
    *   **Build Command**: I have updated your `package.json` to run `npx prisma generate && next build`. This ensures Prisma runs correctly.

3.  **Environment Variables**:
    *   Expand the "Environment Variables" section. Add the following keys (copy values from your local `.env` or Supabase/AI provider dashboards):
        *   `DATABASE_URL` (From Supabase)
        *   `NEXT_PUBLIC_SUPABASE_URL` (From Supabase)
        *   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (From Supabase)
        *   `SUPABASE_SERVICE_ROLE_KEY` (From Supabase - if used)
        *   `OPENAI_API_KEY` (Your OpenAI Key)
        *   `GROQ_API_KEY` (Your Groq Key)
        *   `RESEND_API_KEY` (Your Resend Key)
        *   `RESEND_FROM_EMAIL` (Your configured sender email)
        *   **Clerk Variables** (If using Clerk for auth as seen in temp.env):
            *   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
            *   `CLERK_SECRET_KEY`
            *   `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
            *   `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
            *   `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
            *   `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`

4.  **Deploy**:
    *   Click "Deploy".
    *   Vercel will build your app. If successful, you will get a live URL (e.g., `hr-app.vercel.app`).

## Step 3: Post-Deployment

1.  **Initialize Database**:
    *   Your Vercel deployment might fail initially if the database is empty because Prisma hasn't pushed the schema yet.
    *   From your local terminal, run this command to push your schema to the *production* database:
        ```bash
        npx prisma db push
        ```
        *(Note: You'll need to temporarily set your local `.env`'s `DATABASE_URL` to the production one, or pass it explicitly)*.
    *   Example:
        ```bash
        # Unix/Mac
        DATABASE_URL="postgres://..." npx prisma db push
        
        # Windows PowerShell
        $env:DATABASE_URL="postgres://..."; npx prisma db push
        ```

2.  **Verify**:
    *   Visit your Vercel URL and test the login/signup flow.

## Troubleshooting

*   **Build Failures**: Check the Vercel logs. Common issues are missing environment variables or type errors.
*   **Database Connection Errors**: Ensure your `DATABASE_URL` is correct and allows connections from outside (Supabase does by default).
