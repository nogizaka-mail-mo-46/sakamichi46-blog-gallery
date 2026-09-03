/*
 * ========================================
 * DOM
 * ========================================
 */

const memberSelect = document.getElementById("memberSelect");

const dateSelect = document.getElementById("dateSelect");

const sortSelect = document.getElementById("sortSelect");

const gallery = document.getElementById("gallery");

const lightbox = document.getElementById("lightbox");

const lightboxImage = document.getElementById("lightboxImage");

const imageCounter = document.getElementById("imageCounter");


/*
 * ========================================
 * 画像データ
 * ========================================
 */

let images = [];

let filteredImages = [];

let imageIds = [];

let currentIndex = 0;


/*
 * ========================================
 * Google Drive画像URL
 * ========================================
 */

function getThumbnailUrl(fileId) {
    return `/image/${fileId}`;
}


/*
 * ========================================
 * メンバー選択
 * ========================================
 */

memberSelect.addEventListener("change", async () => {
    const member = memberSelect.value;

    if (!member) {
        imageIds = [];

        clearGallery();

        return;
    }

    await loadMemberImages(member);
});


/*
 * ========================================
 * 日付変更
 * ========================================
 */

dateSelect.addEventListener(
    "change",
    () => {
        if (
            images.length ===
            0
        ) {
            return;
        }

        updateImages();
    }
);


/*
 * ========================================
 * 並び順変更
 * ========================================
 */

sortSelect.addEventListener(
    "change",
    () => {
        if (images.length === 0) {
            return;
        }

        updateImages();
    }
);


/*
 * ========================================
 * メンバー画像取得
 * ========================================
 */

async function loadMemberImages(memberKey) {
    clearGallery();

    try {
        const response = await fetch(
            `/api/images?member=${encodeURIComponent(memberKey)}`
        );

        if (!response.ok) {
            throw new Error(
                "画像一覧の取得に失敗しました。"
            );
        }

        const data = await response.json();

        images = data.images;

        updateImages();

        renderGallery();

    } catch (error) {
        console.error(error);

        imageIds = [];

        gallery.textContent =
            "画像の読み込みに失敗しました。";
    }
}


/*
 * ========================================
 * 絞り込み・並び替え
 * ========================================
 */

function updateImages() {
    const selectedDate =
        dateSelect.value;

    if (selectedDate) {
        const dateKey =
            selectedDate.replaceAll(
                "-",
                ""
            );

        filteredImages =
            images.filter(
                (image) =>
                    image.name.startsWith(
                        `${dateKey}_`
                    )
            );
    } else {
        filteredImages = [
            ...images
        ];
    }

    const sortOrder =
        sortSelect.value;

    filteredImages.sort(
        (a, b) => {
            if (
                sortOrder ===
                "asc"
            ) {
                return a.name.localeCompare(
                    b.name
                );
            }

            return b.name.localeCompare(
                a.name
            );
        }
    );

    imageIds =
        filteredImages.map(
            (image) =>
                image.id
        );

    renderGallery();
}


/*
 * ========================================
 * ギャラリー初期化
 * ========================================
 */

function clearGallery() {
    gallery.innerHTML = "";
}


/*
 * ========================================
 * ギャラリー表示
 * ========================================
 */

function renderGallery() {
    clearGallery();

    if (imageIds.length === 0) {
        gallery.textContent =
            "画像がありません。";

        return;
    }

    imageIds.forEach((fileId, index) => {
        const item =
            document.createElement("div");

        item.className =
            "gallery-item";

        const img =
            document.createElement("img");

        img.src =
            getThumbnailUrl(fileId);

        img.alt =
            `画像 ${index + 1}`;

        img.loading =
            "lazy";

        img.decoding =
            "async";

        item.addEventListener(
            "click",
            () => {
                openLightbox(index);
            }
        );

        item.appendChild(img);

        gallery.appendChild(item);
    });
}


/*
 * ========================================
 * ライトボックスを開く
 * ========================================
 */

function openLightbox(index) {
    if (imageIds.length === 0) {
        return;
    }

    currentIndex = index;

    updateLightbox();

    lightbox.classList.add(
        "active"
    );

    document.body.style.overflow =
        "hidden";
}


/*
 * ========================================
 * ライトボックスを閉じる
 * ========================================
 */

function closeLightbox() {
    lightbox.classList.remove(
        "active"
    );

    document.body.style.overflow =
        "";
}


/*
 * ========================================
 * ライトボックス更新
 * ========================================
 */

function updateLightbox() {
    const fileId =
        imageIds[currentIndex];

    lightboxImage.src =
        getThumbnailUrl(fileId);

    lightboxImage.alt =
        `画像 ${currentIndex + 1}`;

    imageCounter.textContent =
        `${currentIndex + 1} / ${imageIds.length}`;
}


/*
 * ========================================
 * 前の画像
 * ========================================
 */

function showPrevious() {
    if (imageIds.length === 0) {
        return;
    }

    currentIndex--;

    if (currentIndex < 0) {
        currentIndex =
            imageIds.length - 1;
    }

    updateLightbox();
}


/*
 * ========================================
 * 次の画像
 * ========================================
 */

function showNext() {
    if (imageIds.length === 0) {
        return;
    }

    currentIndex++;

    if (
        currentIndex >=
        imageIds.length
    ) {
        currentIndex = 0;
    }

    updateLightbox();
}


/*
 * ========================================
 * 閉じるボタン
 * ========================================
 */

document
    .getElementById("closeButton")
    .addEventListener(
        "click",
        closeLightbox
    );


/*
 * ========================================
 * 前へボタン
 * ========================================
 */

document
    .getElementById("prevButton")
    .addEventListener(
        "click",
        showPrevious
    );


/*
 * ========================================
 * 次へボタン
 * ========================================
 */

document
    .getElementById("nextButton")
    .addEventListener(
        "click",
        showNext
    );


/*
 * ========================================
 * 背景クリックで閉じる
 * ========================================
 */

lightbox.addEventListener(
    "click",
    (event) => {
        if (
            event.target ===
            lightbox
        ) {
            closeLightbox();
        }
    }
);


/*
 * ========================================
 * キーボード操作
 * ========================================
 */

document.addEventListener(
    "keydown",
    (event) => {
        if (
            !lightbox.classList.contains(
                "active"
            )
        ) {
            return;
        }

        if (
            event.key ===
            "Escape"
        ) {
            closeLightbox();
        }

        if (
            event.key ===
            "ArrowLeft"
        ) {
            showPrevious();
        }

        if (
            event.key ===
            "ArrowRight"
        ) {
            showNext();
        }
    }
);


/*
 * ========================================
 * スマホのスワイプ操作
 * ========================================
 */

let touchStartX = 0;

let touchEndX = 0;


lightbox.addEventListener(
    "touchstart",
    (event) => {
        touchStartX =
            event.changedTouches[0]
                .screenX;
    }
);


lightbox.addEventListener(
    "touchend",
    (event) => {
        touchEndX =
            event.changedTouches[0]
                .screenX;

        handleSwipe();
    }
);


/*
 * ========================================
 * スワイプ判定
 * ========================================
 */

function handleSwipe() {
    const difference =
        touchEndX -
        touchStartX;

    if (
        difference <
        -50
    ) {
        showNext();
    }

    if (
        difference >
        50
    ) {
        showPrevious();
    }
}
