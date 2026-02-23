import crypto from "crypto";
import { nanoid } from "nanoid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const handler = async (event) => {
  try {
    const adminKey = event.headers["x-admin-key"] || event.headers["X-Admin-Key"];
    if (adminKey !== process.env.ADMIN_UPLOAD_KEY) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const { originalName, mimeType, sizeBytes, viewLimit = 0, expiresDays = 0 } = body;

    if (!originalName || !mimeType || !sizeBytes) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
    }

    if (Number(sizeBytes) > 30 * 1024 * 1024) {
      return { statusCode: 413, body: JSON.stringify({ error: "Max 30MB" }) };
    }

    const token = nanoid(24);
    const objectKey = `${token}-${crypto.randomBytes(8).toString("hex")}`;

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });

    const cmd = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: objectKey,
      ContentType: mimeType
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 10 });

    const watchLink = `${process.env.BASE_URL}/watch.html?token=${encodeURIComponent(token)}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        token,
        objectKey,
        uploadUrl,
        watchLink,
        limits: { viewLimit: Number(viewLimit) || 0, expiresDays: Number(expiresDays) || 0 }
      })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || "Server error" }) };
  }
};
