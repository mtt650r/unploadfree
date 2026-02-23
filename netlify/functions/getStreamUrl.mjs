import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const handler = async (event) => {
  try {
    const token = event.queryStringParameters?.token;
    if (!token) return { statusCode: 400, body: JSON.stringify({ error: "Missing token" }) };

    const fetchRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/videos?token=eq.${encodeURIComponent(token)}&select=object_key,mime_type,view_limit,views,expires_at`,
      {
        headers: {
          "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const rows = await fetchRes.json();
    const row = rows?.[0];
    if (!row) return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };

    if (row.expires_at && Date.now() > new Date(row.expires_at).getTime()) {
      return { statusCode: 410, body: JSON.stringify({ error: "Link expired" }) };
    }
    if (row.view_limit > 0 && row.views >= row.view_limit) {
      return { statusCode: 410, body: JSON.stringify({ error: "View limit reached" }) };
    }

    await fetch(`${process.env.SUPABASE_URL}/rest/v1/videos?token=eq.${encodeURIComponent(token)}`, {
      method: "PATCH",
      headers: {
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ views: (row.views || 0) + 1 })
    });

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });

    const cmd = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: row.object_key,
      ResponseContentType: row.mime_type
    });

    const streamUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 10 });

    return { statusCode: 200, body: JSON.stringify({ ok: true, streamUrl }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || "Server error" }) };
  }
};
