'use strict';

const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 5;
const buckets = globalThis.__contactRateBuckets || new Map();
globalThis.__contactRateBuckets = buckets;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function clean(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\r?\n/g, '<br>');
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = buckets.get(ip);

  if (!entry || now - entry.startedAt >= RATE_WINDOW_MS) {
    buckets.set(ip, { startedAt: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, message: 'Method not allowed.' });
  }

  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin;
  if (allowedOrigin && origin && origin !== allowedOrigin) {
    return json(res, 403, { ok: false, message: 'Request origin is not allowed.' });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return json(res, 429, { ok: false, message: 'Too many messages. Please try again in a minute.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return json(res, 400, { ok: false, message: 'Invalid request.' });
    }
  }

  if (!body || typeof body !== 'object') {
    return json(res, 400, { ok: false, message: 'Invalid request.' });
  }

  // Honeypot: bots filling the hidden Website field are silently rejected.
  const website = clean(body.website, 200);
  if (website) {
    return json(res, 200, { ok: true, message: 'Message sent. I\'ll be in touch soon.' });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 254);
  const subject = clean(body.subject, 200).replace(/[\r\n]+/g, ' ');
  const message = clean(body.message, 5000);

  if (name.length < 2) {
    return json(res, 400, { ok: false, message: 'Please enter your name.' });
  }

  if (!validEmail(email)) {
    return json(res, 400, { ok: false, message: 'Please enter a valid email address.' });
  }

  if (subject.length < 2) {
    return json(res, 400, { ok: false, message: 'Please enter a subject.' });
  }

  if (message.length < 10) {
    return json(res, 400, { ok: false, message: 'Your message is too short (minimum 10 characters).' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.error('Missing RESEND_API_KEY, CONTACT_TO_EMAIL, or CONTACT_FROM_EMAIL environment variable.');
    return json(res, 500, { ok: false, message: 'The contact service is not configured yet. Please use the direct email link below.' });
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message);

  const emailHtml = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17191c;max-width:720px;margin:0 auto">
      <h2 style="margin:0 0 24px;font-weight:500">New website enquiry</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:10px 0;color:#777;width:120px">Name</td><td style="padding:10px 0">${safeName}</td></tr>
        <tr><td style="padding:10px 0;color:#777">Email</td><td style="padding:10px 0"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
        <tr><td style="padding:10px 0;color:#777">Subject</td><td style="padding:10px 0">${safeSubject}</td></tr>
      </table>
      <div style="margin-top:24px;padding:20px;background:#f7f7f5;border-left:3px solid #9b8052">
        ${safeMessage}
      </div>
      <p style="margin-top:24px;color:#777;font-size:12px">Sent from the Tushar Mishra website contact form.</p>
    </div>
  `;

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `[Website] ${subject}`,
        html: emailHtml
      })
    });

    const result = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error('Resend error:', result);
      return json(res, 502, { ok: false, message: 'The email service could not send your message. Please use the direct email link below.' });
    }

    return json(res, 200, {
      ok: true,
      message: 'Message sent. I\'ll be in touch soon.'
    });
  } catch (error) {
    console.error('Contact API error:', error);
    return json(res, 500, { ok: false, message: 'Could not send your message. Please use the direct email link below.' });
  }
};
