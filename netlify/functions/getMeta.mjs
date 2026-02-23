export const handler = async (event) => {
  try {
    const token = event.queryStringParameters?.token;
    if (!token) return { statusCode: 400, body: JSON.stringify({ error: "Missing token" }) };

    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/videos?token=eq.${encodeURIComponent(token)}&select=original_name,mime_type,size_bytes,created_at,view_limit,views,expires_at`,
      {
        headers: {
          "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const rows = await res.json();
    const row = rows?.[0];
    if (!row) return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };

    if (row.expires_at && Date.now() > new Date(row.expires_at).getTime()) {
      return { statusCode: 410, body: JSON.stringify({ error: "Link expired" }) };
    }
    if (row.view_limit > 0 && row.views >= row.view_limit) {
      return { statusCode: 410, body: JSON.stringify({ error: "View limit reached" }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        name: row.original_name,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        createdAt: row.created_at,
        viewLimit: row.view_limit,
        views: row.views,
        expiresAt: row.expires_at
      })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || "Server error" }) };
  }
};
