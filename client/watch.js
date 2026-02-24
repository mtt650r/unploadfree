const player = document.getElementById("player");
const errEl = document.getElementById("err");

function showError(msg) {
  player.style.display = "none";
  errEl.style.display = "block";
  errEl.textContent = msg;
}

function getToken() {
  const u = new URL(window.location.href);
  return u.searchParams.get("token") || "";
}

(async function init() {
  const token = getToken();
  if (!token) return showError("Invalid link.");

  try {
    // Check metadata first (handles expiry / view limits cleanly)
    const metaRes = await fetch(`/.netlify/functions/getMeta?token=${encodeURIComponent(token)}`);
    const meta = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok) return showError(meta?.error || "Video not available.");

    // Get a signed stream URL
    const urlRes = await fetch(`/.netlify/functions/getStreamUrl?token=${encodeURIComponent(token)}`);
    const urlData = await urlRes.json().catch(() => ({}));
    if (!urlRes.ok) return showError(urlData?.error || "Cannot stream this video.");

    player.src = urlData.streamUrl;
    player.load();

    // Optional: set the browser tab title to the file name
    if (meta?.name) document.title = meta.name;
  } catch (e) {
    showError("Network error.");
  }
})();
