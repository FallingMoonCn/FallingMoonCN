'use strict';

const LIMITS = {
  name: 80,
  email: 254,
  subject: 120,
  message: 4000
};

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') body = JSON.parse(body);
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
}

function cleanField(value, limit) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, limit);
}

module.exports = async function contactHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const sendKey = process.env.SERVERCHAN_SENDKEY;
  if (!sendKey) {
    return sendJson(res, 500, { error: 'Contact service is not configured.' });
  }

  let input;
  try {
    input = readBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: 'Invalid request body.' });
  }

  const name = cleanField(input.name, LIMITS.name);
  const email = cleanField(input.email, LIMITS.email);
  const subject = cleanField(input.subject, LIMITS.subject);
  const message = cleanField(input.message, LIMITS.message);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name || !email || !subject || !message || !emailPattern.test(email)) {
    return sendJson(res, 400, { error: 'Please complete all fields with a valid email.' });
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`https://sctapi.ftqq.com/${encodeURIComponent(sendKey)}.send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, desp: details }),
      signal: controller.signal
    });
    const result = await response.json();

    if (!response.ok || Number(result.code) !== 0) {
      return sendJson(res, 502, { error: 'Notification service failed.' });
    }

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    return sendJson(res, 502, { error: 'Notification service unavailable.' });
  } finally {
    clearTimeout(timeout);
  }
};
