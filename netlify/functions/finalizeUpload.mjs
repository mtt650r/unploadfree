export const handler = async (event) => {
  try {
    const adminKey = event.headers["x-admin-key"] || event.headers["X-Admin-Key"];
    if (adminKey !== process.env.ADMIN_UPLOAD_KEY) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const { token, objectKey, originalName, mimeType, sizeBytes, viewLimit = 0, expiresDays = 0 } = body;

    if (!token || !objectKey || !originalName || !mimeType || !sizeBytes) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
    }

    const expiresAt =
      Number(expiresDays) > 0
        ? new Date(Date.now() + Number(expiresDays) * 86400000).toISOString()
        : null;

    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/videos`, {
      method: "POST",
      headers: {
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify([{
        token,
        object_key: objectKey,
        original_name: originalName,
        mime_type: mimeType,
        size_bytes: Number(sizeBytes),
        view_limit: Number(viewLimit) || 0,
        expires_at: expiresAt
      }])
    });

    if (!res.ok) {
      const t = await res.text();
      return { statusCode: 500, body: JSON.stringify({ error: `DB error: ${t}` }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || "Server error" }) };
  }
};
