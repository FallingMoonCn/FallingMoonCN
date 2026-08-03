const LIMITS = {
  name: 80,
  email: 254,
  subject: 120,
  message: 4000
};

function responseHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(origin)
  });
}

function cleanField(value, limit) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, limit);
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const requestOrigin = request.headers.get('Origin') || '';

    if (allowedOrigin !== '*' && requestOrigin !== allowedOrigin) {
      return jsonResponse({ error: 'Origin not allowed.' }, 403, allowedOrigin);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: responseHeaders(allowedOrigin)
      });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed.' }, 405, allowedOrigin);
    }

    if (!env.SERVERCHAN_SENDKEY) {
      return jsonResponse({ error: 'Contact service is not configured.' }, 500, allowedOrigin);
    }

    let input;
    try {
      input = await request.json();
    } catch (error) {
      return jsonResponse({ error: 'Invalid request body.' }, 400, allowedOrigin);
    }

    const name = cleanField(input?.name, LIMITS.name);
    const email = cleanField(input?.email, LIMITS.email);
    const subject = cleanField(input?.subject, LIMITS.subject);
    const message = cleanField(input?.message, LIMITS.message);
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || !email || !subject || !message || !emailPattern.test(email)) {
      return jsonResponse({ error: 'Please complete all fields with a valid email.' }, 400, allowedOrigin);
    }

    const title = `[FALLINGMOON] ${subject}`.slice(0, 100);
    const details = [
      `**姓名**：${name}`,
      `**邮箱**：${email}`,
      `**主题**：${subject}`,
      '',
      '**内容**',
      message
    ].join('\n');

    try {
      const response = await fetch(`https://sctapi.ftqq.com/${encodeURIComponent(env.SERVERCHAN_SENDKEY)}.send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, desp: details })
      });
      const result = await response.json();

      if (!response.ok || Number(result.code) !== 0) {
        return jsonResponse({ error: 'Notification service failed.' }, 502, allowedOrigin);
      }

      return jsonResponse({ ok: true }, 200, allowedOrigin);
    } catch (error) {
      return jsonResponse({ error: 'Notification service unavailable.' }, 502, allowedOrigin);
    }
  }
};
