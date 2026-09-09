# Your Website Buddy

help me to create this website

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/34dc11ad-eca8-4aaf-bfd5-20ba3d85a63d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## AI summarizer

The `/summarizer` page calls an authenticated TanStack Start server function using
Lovable AI. The existing Supabase session is attached automatically; the server
verifies it before calling the gateway.

Configure these variables in the **app server runtime** (or `.env` for local development):

- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`: server authentication settings.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`: browser authentication settings.
- `LOVABLE_API_KEY`: project AI secret. Keep this server-only; never prefix it with `VITE_`.
- `LOVABLE_AI_MODEL` (optional): defaults to `google/gemini-3.8-flash`.

Lovable manages the project key when its AI connector is enabled. See the
[Lovable AI setup documentation](https://docs.lovable.dev/features/ai).
A secret configured only in Supabase Edge Functions is not available to this
TanStack server. Restart the local server after changing environment variables.

The summarizer accepts 20–30,000 characters and at least five words. Requests time
out after 60 seconds. Summaries remain in page state and can be copied or downloaded;
they are not saved to the database.

Run focused gateway tests with Node 22.18+ using `node --test tests/summarize.test.ts`.
For a live check, sign in, open `/summarizer`, submit text at each length, then verify
copy and download. Live generation requires a configured key and available AI credits.
