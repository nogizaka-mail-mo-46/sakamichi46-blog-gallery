const API_KEY = "AIzaSyArp7taw62PJxRgX7Ip95LIjfF2OyotPl4";

// ===============================
// メンバーフォルダ内の画像一覧を取得（高速）
// ===============================
async function listImages(folderId) {
  const url =
    `https://www.googleapis.com/drive/v3/files` +
    `?q='${folderId}'+in+parents` +
    `&fields=files(id,name,mimeType,webContentLink)` +
    `&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return (data.files || []).filter(f => f.mimeType.startsWith("image/"));
}

// ===============================
// 日付フィルタ
// ===============================
function filterByDate(files, selectedDate) {
  if (!selectedDate) return files;
  const ymd = selectedDate.replace(/-/g, "");
  return files.filter(f => f.name.startsWith(ymd));
}

// ===============================
// ギャラリー表示
// ===============================
function renderGallery(images) {
  const content = document.getElementById("content");
  content.innerHTML = "";

  if (images.length === 0) {
    content.textContent = "画像がありません";
    return;
  }

  const gallery = document.createElement("div");
  gallery.className = "gallery";

  images.forEach(img => {
    const item = document.createElement("div");
    item.className = "gallery-item";

    item.innerHTML = `
      <img src="${img.webContentLink}" class="gallery-img">
    `;

    gallery.appendChild(item);
  });

  content.appendChild(gallery);
}

// ===============================
// 乃木坂画像取得メイン関数（最速版）
// ===============================
async function loadNogizakaImages(memberName, selectedDate) {

  const folderId = MEMBER_FOLDERS[memberName];

  if (!folderId) {
    document.getElementById("content").textContent =
      `${memberName} のフォルダIDが登録されていません`;
    return;
  }

  let images = await listImages(folderId);

  images = filterByDate(images, selectedDate);

  renderGallery(images);
}
