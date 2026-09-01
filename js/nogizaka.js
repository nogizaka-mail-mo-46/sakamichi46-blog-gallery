// js/nogizaka.js

// ===== Drive API Key =====
// ※ Cloudflare Pages の環境変数に入れるのが推奨
const API_KEY = "AIzaSyArp7taw62PJxRgX7Ip95LIjfF2OyotPl4";

// ===== 乃木坂トップフォルダID =====
const NOGI_TOP_FOLDER = "1S9noF5i1eZVThr7EJq4bEjX1KgOJXBui";

// ===============================
// フォルダ一覧取得（サブフォルダのみ）
// ===============================
async function listSubFolders(parentId) {
  const url =
    `https://www.googleapis.com/drive/v3/files` +
    `?q='${parentId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'` +
    `&fields=files(id,name)` +
    `&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();
  return data.files || [];
}


// ===============================
// メンバーフォルダを探す（期生フォルダを横断）
// ===============================
async function findMemberFolderInNogizaka(memberName) {

  // 1. 乃木坂トップフォルダ配下の「3期生」「4期生」フォルダを取得
  const kiseFolders = await listSubFolders(NOGI_TOP_FOLDER);

  for (const kiseFolder of kiseFolders) {

    // 2. 期生フォルダ配下のメンバーフォルダ一覧を取得
    const memberFolders = await listSubFolders(kiseFolder.id);

    // 3. メンバー名と一致するフォルダを探す
    const hit = memberFolders.find(f => f.name === memberName);
    if (hit) return hit.id;
  }

  return null;
}


// ===============================
// メンバーフォルダ内の画像一覧を取得
// ===============================
async function listImages(folderId) {
  const url =
    `https://www.googleapis.com/drive/v3/files` +
    `?q='${folderId}'+in+parents` +
    `&fields=files(id,name,mimeType)` +
    `&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return (data.files || []).filter(f => f.mimeType.startsWith("image/"));
}


// ===============================
// 日付フィルタ（ファイル名先頭8桁）
// ===============================
function filterByDate(files, selectedDate) {
  if (!selectedDate) return files;

  const ymd = selectedDate.replace(/-/g, ""); // "2026-08-01" → "20260801"
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

  images.forEach(img => {
    const div = document.createElement("div");
    div.className = "gallery-item";

    div.innerHTML = `
      <img src="https://drive.google.com/uc?id=${img.id}" class="gallery-img">
    `;

    content.appendChild(div);
  });
}


// ===============================
// 乃木坂画像取得メイン関数
// ===============================
async function loadNogizakaImages(memberName, selectedDate) {

  // 1. メンバーフォルダを探す
  const memberFolderId = await findMemberFolderInNogizaka(memberName);

  if (!memberFolderId) {
    document.getElementById("content").textContent =
      `${memberName} のフォルダが見つかりません`;
    return;
  }

  // 2. メンバーフォルダ内の画像一覧を取得
  let images = await listImages(memberFolderId);

  // 3. 日付フィルタ
  images = filterByDate(images, selectedDate);

  // 4. ギャラリー表示
  renderGallery(images);
}
