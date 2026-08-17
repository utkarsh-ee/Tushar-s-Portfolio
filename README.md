# Tushar Mishra Portfolio

Static portfolio with a fixed Spline scene, desktop torch interaction, mobile interaction disabled, and a Vercel serverless contact endpoint using Resend.

## Deploy to Vercel

1. Upload/push this folder to GitHub.
2. Import the repository into Vercel.
3. Add these Environment Variables in the Vercel project settings:

   - `RESEND_API_KEY` = your Resend API key
   - `CONTACT_TO_EMAIL` = the inbox that should receive website enquiries
   - `CONTACT_FROM_EMAIL` = a sender address on a domain verified in Resend, for example `Website <contact@tusharmishra.in>`
   - `ALLOWED_ORIGIN` = `https://tusharmishra.in` (optional, recommended for the production domain)

4. Redeploy after adding the variables.

The browser never receives `RESEND_API_KEY`. The `/api/contact` Vercel Function reads it server-side and sends the message through Resend.

## Important

Do not put the Resend API key inside `index.html`, commit it to GitHub, or paste it into public code.

The contact form expects the endpoint at `/api/contact`, which is provided by `api/contact.js`.
