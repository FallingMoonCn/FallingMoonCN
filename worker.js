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

async function sendServerChan(sendKey, title, details) {
  if (!sendKey) return false;

  try {
    const response = await fetch(`https://sctapi.ftqq.com/${encodeURIComponent(sendKey)}.send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ title, desp: details }).toString()
    });
    const result = await response.json();
    return response.ok && Number(result.code) === 0;
  } catch (error) {
    return false;
  }
}

async function sendWeb3Forms(accessKey, fields) {
  if (!accessKey) return false;

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        access_key: accessKey,
        subject: `[FALLINGMOON] ${fields.subject}`.slice(0, 100),
        from_name: fields.name,
        name: fields.name,
        email: fields.email,
        replyto: fields.email,
        message: fields.message
      })
    });
    const result = await response.json();
    return response.ok && result.success === true;
  } catch (error) {
    return false;
  }
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

    if (!env.SERVERCHAN_SENDKEY && !env.WEB3FORMS_ACCESS_KEY) {
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

    const [serverChanOk, web3FormsOk] = await Promise.all([
      sendServerChan(env.SERVERCHAN_SENDKEY, title, details),
      sendWeb3Forms(env.WEB3FORMS_ACCESS_KEY, { name, email, subject, message })
    ]);

    if (serverChanOk && web3FormsOk) {
      return jsonResponse({ ok: true }, 200, allowedOrigin);
    }

    if (serverChanOk || web3FormsOk) {
      return jsonResponse({ ok: true, partial: true }, 200, allowedOrigin);
    }

    return jsonResponse({ error: 'Notification service failed.' }, 502, allowedOrigin);
  }
};
