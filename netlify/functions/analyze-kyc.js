// netlify/functions/analyze-kyc.js
//
// This function runs on Netlify's server, never in the browser.
// It receives the document content blocks from the frontend, attaches the
// secret ANTHROPIC_API_KEY (set in Netlify environment variables), calls
// Claude, and returns the result. The API key is never exposed to users.

exports.handler = async function (event) {
  // CORS headers so the browser can call this function
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server is missing ANTHROPIC_API_KEY environment variable.' }),
    };
  }

  try {
    const { content } = JSON.parse(event.body || '{}');
    if (!content || !Array.isArray(content)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing content blocks' }) };
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content }],
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || 'Anthropic API error' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Unexpected server error' }),
    };
  }
};
