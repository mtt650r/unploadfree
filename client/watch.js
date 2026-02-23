const titleEl = document.getElementById("title");
const metaEl = document.getElementById("meta");
const player = document.getElementById("player");
const statusEl = document.getElementById("status");

function setStatus(type, msg) {
  statusEl.innerHTML = msg ? `<div class="alert ${type}">${msg}</div>` : "";
}

function getToken() {
  const u = new URL(window.location.href);
  return u.searchParams.get("token") || "";
}

function humanSize(bytes) {
  const units = ["B","KB","MB","GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

(async function init() {
  const token = getToken();
  if (!token) {
    titleEl.textContent = "Invalid link";
    setStatus("error", "Missing token.");
    return;
  }

  try {
    const metaRes = await fetch(`/.netlify/functions/getMeta?token=${encodeURIComponent(token)}`);
    const meta = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok) {
      titleEl.textContent = "Unavailable";
      setStatus("error", meta?.error || "Video not available.");
      return;
    }

    titleEl.textContent = meta.name;

    const expires = meta.expiresAt ? new Date(meta.expiresAt).toLocaleString() : "Never";
    const limit = meta.viewLimit > 0 ? `${meta.views}/${meta.viewLimit}` : `${meta.views} (unlimited)`;
    metaEl.textContent = `${humanSize(meta.sizeBytes)} • Views: ${limit} • Expires: ${expires}`;

    const urlRes = await fetch(`/.netlify/functions/getStreamUrl?token=${encodeURIComponent(token)}`);
    const urlData = await urlRes.json().catch(() => ({}));
    if (!urlRes.ok) {
      setStatus("error", urlData?.error || "Cannot stream this video.");
      return;
    }

    player.src = urlData.streamUrl;
    player.load();
  } catch (e) {
    titleEl.textContent = "Error";
    setStatus("error", e.message);
  }
})();
