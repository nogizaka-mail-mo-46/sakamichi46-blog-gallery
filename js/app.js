/*
 * ========================================
 * DOM
 * ========================================
 */

const memberSelect = document.getElementById("memberSelect");

const sortSelect = document.getElementById("sortSelect");

const calendar = document.getElementById("calendar");

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

let calendarYear = null;

let calendarMonth = null;

let selectedDate = null;


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
        images = [];

        filteredImages = [];
        
        imageIds = [];

        selectedDate = null;

        calendarYear = null;

        calendarMonth = null;

        calendar.innerHTML = "";

        clearGallery();

        return;
    }

    await loadMemberImages(member);
});


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
 * カレンダー初期月
 * ========================================
 */

function setInitialCalendarMonth() {
    if (images.length === 0) {
        calendarYear = null;
        calendarMonth = null;

        return;
    }

    const sortedImages = [
        ...images
    ].sort(
        (a, b) =>
            b.name.localeCompare(
                a.name
            )
    );

    const latestImage =
        sortedImages[0];

    const dateText =
        latestImage.name.substring(
            0,
            8
        );

    calendarYear =
        Number(
            dateText.substring(
                0,
                4
            )
        );

    calendarMonth =
        Number(
            dateText.substring(
                4,
                6
            )
        );
}


/*
 * ========================================
 * 投稿日の取得
 * ========================================
 */

function getPostDates() {
    const postDates =
        new Set();

    images.forEach(
        (image) => {
            const match =
                image.name.match(
                    /^(\d{8})_/
                );

            if (match) {
                postDates.add(
                    match[1]
                );
            }
        }
    );

    return postDates;
}


/*
 * ========================================
 * カレンダー表示
 * ========================================
 */

function renderCalendar() {
    calendar.innerHTML = "";

    if (
        calendarYear === null ||
        calendarMonth === null
    ) {
        return;
    }

    const postDates =
        getPostDates();

    const header =
        document.createElement(
            "div"
        );

    header.className =
        "calendar-header";

    const prevButton =
        document.createElement(
            "button"
        );

    prevButton.type =
        "button";

    prevButton.className =
        "calendar-nav";

    prevButton.textContent =
        "‹";

    prevButton.addEventListener(
        "click",
        () => {
            changeCalendarMonth(
                -1
            );
        }
    );

    const title =
        document.createElement(
            "div"
        );

    title.className =
        "calendar-title";

    title.textContent =
        `${calendarYear}年${calendarMonth}月`;

    const nextButton =
        document.createElement(
            "button"
        );

    nextButton.type =
        "button";

    nextButton.className =
        "calendar-nav";

    nextButton.textContent =
        "›";

    nextButton.addEventListener(
        "click",
        () => {
            changeCalendarMonth(
                1
            );
        }
    );

    header.appendChild(
        prevButton
    );

    header.appendChild(
        title
    );

    header.appendChild(
        nextButton
    );

    calendar.appendChild(
        header
    );


    const weekdayRow =
        document.createElement(
            "div"
        );

    weekdayRow.className =
        "calendar-weekdays";

    [
        "日",
        "月",
        "火",
        "水",
        "木",
        "金",
        "土"
    ].forEach(
        (weekday) => {
            const item =
                document.createElement(
                    "div"
                );

            item.textContent =
                weekday;

            weekdayRow.appendChild(
                item
            );
        }
    );

    calendar.appendChild(
        weekdayRow
    );


    const days =
        document.createElement(
            "div"
        );

    days.className =
        "calendar-days";

    const firstDay =
        new Date(
            calendarYear,
            calendarMonth - 1,
            1
        ).getDay();

    const lastDate =
        new Date(
            calendarYear,
            calendarMonth,
            0
        ).getDate();


    for (
        let i = 0;
        i < firstDay;
        i++
    ) {
        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "calendar-day empty";

        days.appendChild(
            empty
        );
    }


    for (
        let day = 1;
        day <= lastDate;
        day++
    ) {
        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.className =
            "calendar-day";

        button.textContent =
            day;

        const dateKey =
            formatDateKey(
                calendarYear,
                calendarMonth,
                day
            );

        if (
            postDates.has(
                dateKey
            )
        ) {
            button.classList.add(
                "has-post"
            );

            button.addEventListener(
                "click",
                () => {
                    selectCalendarDate(
                        dateKey
                    );
                }
            );
        } else {
            button.disabled =
                true;
        }

        if (
            selectedDate ===
            dateKey
        ) {
            button.classList.add(
                "selected"
            );
        }

        days.appendChild(
            button
        );
    }

    calendar.appendChild(
        days
    );


    if (selectedDate) {
        const clearButton =
            document.createElement(
                "button"
            );

        clearButton.type =
            "button";

        clearButton.className =
            "calendar-clear";

        clearButton.textContent =
            "すべて表示";

        clearButton.addEventListener(
            "click",
            () => {
                selectedDate =
                    null;

                renderCalendar();

                updateImages();
            }
        );

        calendar.appendChild(
            clearButton
        );
    }
}


/*
 * ========================================
 * 日付キー生成
 * ========================================
 */

function formatDateKey(
    year,
    month,
    day
) {
    return (
        String(year) +
        String(month).padStart(
            2,
            "0"
        ) +
        String(day).padStart(
            2,
            "0"
        )
    );
}


/*
 * ========================================
 * カレンダー月移動
 * ========================================
 */

function changeCalendarMonth(
    offset
) {
    calendarMonth +=
        offset;

    if (
        calendarMonth ===
        0
    ) {
        calendarMonth =
            12;

        calendarYear--;
    }

    if (
        calendarMonth ===
        13
    ) {
        calendarMonth =
            1;

        calendarYear++;
    }

    renderCalendar();
}


/*
 * ========================================
 * 日付選択
 * ========================================
 */

function selectCalendarDate(
    dateKey
) {
    if (
        selectedDate ===
        dateKey
    ) {
        selectedDate =
            null;
    } else {
        selectedDate =
            dateKey;
    }

    renderCalendar();

    updateImages();
}


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

        setInitialCalendarMonth();

        renderCalendar();

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
    if (selectedDate) {
        filteredImages =
            images.filter(
                (image) =>
                    image.name.startsWith(
                        `${selectedDate}_`
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
