const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const uploadBtn = document.getElementById("uploadBtn");
const adminKeyEl = document.getElementById("adminKey");
const viewLimitEl = document.getElementById("viewLimit");
const expiresDaysEl = document.getElementById("expiresDays");
const statusEl = document.getElementById("status");

let selectedFile = null;

function setStatus(type, msg) {
  if (!msg) { statusEl.innerHTML = ""; return; }
  statusEl.innerHTML = `<div class="alert ${type}">${msg}</div>`;
}

function humanSize(bytes) {
  const units = ["B","KB","MB","GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function setFile(file) {
  selectedFile = file;
  if (!file) {
    fileInfo.textContent = "No file selected";
    uploadBtn.disabled = true;
    return;
  }
  fileInfo.textContent = `${file.name} • ${humanSize(file.size)} • ${file.type || "unknown"}`;
  uploadBtn.disabled = false;
  setStatus("", "");
}

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const file = e.dataTransfer.files?.[0];
  if (file) setFile(file);
});
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) setFile(file);
});

uploadBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  const adminKey = adminKeyEl.value.trim();
  if (!adminKey) {
    setStatus("error", "Missing admin upload key.");
    return;
  }

  if (selectedFile.size > 30 * 1024 * 1024) {
    setStatus("error", "File too large. Max is 30MB.");
    return;
  }

  uploadBtn.disabled = true;
  setStatus("ok", "Step 1/3: Creating upload link…");

  try {
    const createRes = await fetch("/.netlify/functions/createUpload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey
      },
      body: JSON.stringify({
        originalName: selectedFile.name,
        mimeType: selectedFile.type || "video/mp4",
        sizeBytes: selectedFile.size,
        viewLimit: Number(viewLimitEl.value || 0),
        expiresDays: Number(expiresDaysEl.value || 0)
      })
    });

    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok) throw new Error(createData?.error || "createUpload failed");

    const { token, objectKey, uploadUrl, watchLink } = createData;

    setStatus("ok", "Step 2/3: Uploading file to storage…");
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": selectedFile.type || "application/octet-stream" },
      body: selectedFile
    });
    if (!putRes.ok) throw new Error("Direct upload failed");

    setStatus("ok", "Step 3/3: Finalizing…");
    const finRes = await fetch("/.netlify/functions/finalizeUpload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey
      },
      body: JSON.stringify({
        token,
        objectKey,
        originalName: selectedFile.name,
        mimeType: selectedFile.type || "video/mp4",
        sizeBytes: selectedFile.size,
        viewLimit: Number(viewLimitEl.value || 0),
        expiresDays: Number(expiresDaysEl.value || 0)
      })
    });

    const finData = await finRes.json().catch(() => ({}));
    if (!finRes.ok) throw new Error(finData?.error || "finalizeUpload failed");

    setStatus(
      "ok",
      `Uploaded ✅<br><br>
       Watch link:<br>
       <input value="${watchLink}" readonly onclick="this.select()" style="margin-top:8px" />
       <div class="small" style="margin-top:8px">Click the box to copy.</div>`
    );

    setFile(null);
    fileInput.value = "";
  } catch (e) {
    setStatus("error", `Error: ${e.message}`);
  } finally {
    uploadBtn.disabled = false;
  }
});
