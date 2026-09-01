const API_KEY = "AIzaSyArp7taw62PJxRgX7Ip95LIjfF2OyotPl4";
const NOGI_TOP_FOLDER = DRIVE_FOLDERS.nogizaka;

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

async function findMemberFolderInNogizaka(memberName) {
  const kiseFolders = await listSubFolders(NOGI_TOP_FOLDER);
  console.log("期生フォルダ一覧:", kiseFolders);

  for (const kiseFolder of kiseFolders) {
    const memberFolders = await listSubFolders(kiseFolder.id);
    console.log("メンバーフォルダ一覧:", memberFolders);

    const hit = memberFolders.find(f => f.name === memberName);
    if (hit) return hit.id;
  }

  return null;
}

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

function filterByDate(files, selectedDate) {
  if (!selectedDate) return files;
  const ymd = selectedDate.replace(/-/g, "");
  return files.filter(f => f.name.startsWith(ymd));
}

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

async function loadNogizakaImages(memberName, selectedDate) {
  const memberFolderId = await findMemberFolderInNogizaka(memberName);

  if (!memberFolderId) {
    document.getElementById("content").textContent =
      `${memberName} のフォルダが見つかりません`;
    return;
  }

  let images = await listImages(memberFolderId);
  console.log("画像一覧:", images);

  images = filterByDate(images, selectedDate);

  renderGallery(images);
}
