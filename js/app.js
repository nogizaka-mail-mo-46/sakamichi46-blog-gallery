/*
 * ========================================
 * DOM
 * ========================================
 */

const memberSelect =
    document.getElementById(
        "memberSelect"
    );

const sortSelect =
    document.getElementById(
        "sortSelect"
    );

const calendar =
    document.getElementById(
        "calendar"
    );

const gallery =
    document.getElementById(
        "gallery"
    );

const lightbox =
    document.getElementById(
        "lightbox"
    );

const lightboxImage =
    document.getElementById(
        "lightboxImage"
    );

const imageCounter =
    document.getElementById(
        "imageCounter"
    );


/*
 * ========================================
 * 画像・カレンダーデータ
 * ========================================
 */

let images = [];

let filteredImages = [];

let imageIds = [];

let allPostDates = [];

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
 * ページ初期化
 * ========================================
 */

async function initialize() {
    await loadMembers();
    
    await loadAllPostDates();
}

initialize();


/*
 * ========================================
 * 全メンバーの投稿日取得
 * ========================================
 */

async function loadAllPostDates() {
    calendar.innerHTML = "";

    try {
        const response =
            await fetch(
                "/api/images"
            );

        if (!response.ok) {
            throw new Error(
                "全メンバーの投稿日取得に失敗しました。"
            );
        }

        const data =
            await response.json();

        allPostDates =
            Array.isArray(
                data.postDates
            )
                ? data.postDates
                : [];

        selectedDate =
            null;

        setInitialCalendarMonth();

        renderCalendar();

    } catch (error) {
        console.error(
            error
        );

        calendar.textContent =
            "カレンダーの読み込みに失敗しました。";
    }
}


/*
 * ========================================
 * 全メンバーの一覧取得
 * ========================================
 */

async function loadMembers() {
    try {
        const response =
            await fetch(
                "/api/members"
            );

        if (!response.ok) {
            throw new Error(
                "メンバー一覧の取得に失敗しました。"
            );
        }

        const data =
            await response.json();

        data.members.forEach(
            (member) => {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    member.key;

                option.textContent =
                    member.name;

                memberSelect.appendChild(
                    option
                );
            }
        );

    } catch (error) {
        console.error(
            error
        );
    }
}


/*
 * ========================================
 * メンバー選択
 * ========================================
 */

memberSelect.addEventListener(
    "change",
    async () => {
        const member =
            memberSelect.value;

        selectedDate =
            null;

        images = [];

        filteredImages = [];

        imageIds = [];

        clearGallery();


        /*
         * メンバー未選択
         */

        if (!member) {
            await loadAllPostDates();

            return;
        }


        /*
         * メンバー選択あり
         */

        await loadMemberImages(
            member
        );
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
 * メンバー画像取得
 * ========================================
 */

async function loadMemberImages(
    memberKey
) {
    clearGallery();

    calendar.innerHTML =
        "読み込み中...";

    try {
        const response =
            await fetch(
                `/api/images?member=${encodeURIComponent(memberKey)}`
            );

        if (!response.ok) {
            throw new Error(
                "画像一覧の取得に失敗しました。"
            );
        }

        const data =
            await response.json();

        images =
            Array.isArray(
                data.images
            )
                ? data.images
                : [];

        selectedDate =
            null;

        setInitialCalendarMonth();

        renderCalendar();

        updateImages();

    } catch (error) {
        console.error(
            error
        );

        images = [];

        filteredImages = [];

        imageIds = [];

        calendar.innerHTML = "";

        gallery.textContent =
            "画像の読み込みに失敗しました。";
    }
}


/*
 * ========================================
 * 現在対象の投稿日取得
 * ========================================
 */

function getPostDates() {
    /*
     * メンバー選択中
     */

    if (memberSelect.value) {
        const postDates =
            new Set();

        images.forEach(
            (image) => {
                if (
                    !image.name
                ) {
                    return;
                }

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
     * メンバー未選択
     */

    return new Set(
        allPostDates
    );
}


/*
 * ========================================
 * 投稿日が存在する月の取得
 * ========================================
 */

function getPostMonths() {
    const postMonths =
        new Set();

    const postDates =
        getPostDates();

    postDates.forEach(
        (dateKey) => {
            if (
                /^\d{8}$/.test(
                    dateKey
                )
            ) {
                postMonths.add(
                    dateKey.substring(
                        0,
                        6
                    )
                );
            }
        }
    );

    return Array.from(
        postMonths
    ).sort();
}


/*
 * ========================================
 * カレンダー初期月
 * ========================================
 */

function setInitialCalendarMonth() {
    const postMonths =
        getPostMonths();

    if (
        postMonths.length ===
        0
    ) {
        calendarYear =
            null;

        calendarMonth =
            null;

        return;
    }

    const latestMonth =
        postMonths[
            postMonths.length - 1
        ];

    calendarYear =
        Number(
            latestMonth.substring(
                0,
                4
            )
        );

    calendarMonth =
        Number(
            latestMonth.substring(
                4,
                6
            )
        );
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

    const postMonths =
        getPostMonths();

    const currentMonthKey =
        String(calendarYear) +
        String(
            calendarMonth
        ).padStart(
            2,
            "0"
        );

    const currentMonthIndex =
        postMonths.indexOf(
            currentMonthKey
        );


    /*
     * ========================================
     * ヘッダー
     * ========================================
     */

    const header =
        document.createElement(
            "div"
        );

    header.className =
        "calendar-header";


    /*
     * 前の投稿月
     */

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

    if (
        currentMonthIndex <=
        0
    ) {
        prevButton.disabled =
            true;
    }


    /*
     * 年月
     */

    const title =
        document.createElement(
            "div"
        );

    title.className =
        "calendar-title";

    title.textContent =
        `${calendarYear}年${calendarMonth}月`;


    /*
     * 次の投稿月
     */

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

    if (
        currentMonthIndex ===
        -1 ||
        currentMonthIndex >=
        postMonths.length - 1
    ) {
        nextButton.disabled =
            true;
    }


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


    /*
     * ========================================
     * 曜日
     * ========================================
     */

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


    /*
     * ========================================
     * 日付
     * ========================================
     */

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


    /*
     * 月初の空白
     */

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


    /*
     * 1日〜月末
     */

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


        /*
         * 投稿日
         */

        if (
            postDates.has(
                dateKey
            )
        ) {
            button.classList.add(
                "has-post"
            );


            /*
             * メンバー選択中のみ
             * 日付絞り込み可能
             */

            if (
                memberSelect.value
            ) {
                button.addEventListener(
                    "click",
                    () => {
                        selectCalendarDate(
                            dateKey
                        );
                    }
                );
            } else {
                button.classList.add(
                    "all-members-post"
                );
            }

        } else {
            button.disabled =
                true;
        }


        /*
         * 選択中
         */

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


    /*
     * ========================================
     * すべて表示
     * ========================================
     */

    if (
        selectedDate &&
        memberSelect.value
    ) {
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
 * 投稿月へ移動
 * ========================================
 */

function changeCalendarMonth(
    offset
) {
    const postMonths =
        getPostMonths();

    if (
        postMonths.length ===
        0
    ) {
        return;
    }

    const currentMonth =
        String(calendarYear) +
        String(
            calendarMonth
        ).padStart(
            2,
            "0"
        );

    const currentIndex =
        postMonths.indexOf(
            currentMonth
        );

    if (
        currentIndex ===
        -1
    ) {
        return;
    }

    const nextIndex =
        currentIndex +
        offset;

    if (
        nextIndex < 0 ||
        nextIndex >=
        postMonths.length
    ) {
        return;
    }

    const nextMonth =
        postMonths[nextIndex];

    calendarYear =
        Number(
            nextMonth.substring(
                0,
                4
            )
        );

    calendarMonth =
        Number(
            nextMonth.substring(
                4,
                6
            )
        );

    selectedDate =
        null;

    renderCalendar();

    if (
        memberSelect.value
    ) {
        updateImages();
    }
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
 * 絞り込み・並び替え
 * ========================================
 */

function updateImages() {
    if (selectedDate) {
        filteredImages =
            images.filter(
                (image) =>
                    image.name &&
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

    if (
        imageIds.length ===
        0
    ) {
        if (
            memberSelect.value
        ) {
            gallery.textContent =
                "画像がありません。";
        }

        return;
    }

    imageIds.forEach(
        (fileId, index) => {
            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "gallery-item";

            const img =
                document.createElement(
                    "img"
                );

            img.src =
                getThumbnailUrl(
                    fileId
                );

            img.alt =
                `画像 ${index + 1}`;

            img.loading =
                "lazy";

            img.decoding =
                "async";

            item.addEventListener(
                "click",
                () => {
                    openLightbox(
                        index
                    );
                }
            );

            item.appendChild(
                img
            );

            gallery.appendChild(
                item
            );
        }
    );
}


/*
 * ========================================
 * ライトボックスを開く
 * ========================================
 */

function openLightbox(index) {
    if (
        imageIds.length ===
        0
    ) {
        return;
    }

    currentIndex =
        index;

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
        imageIds[
            currentIndex
        ];

    lightboxImage.src =
        getThumbnailUrl(
            fileId
        );

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
    if (
        imageIds.length ===
        0
    ) {
        return;
    }

    currentIndex--;

    if (
        currentIndex < 0
    ) {
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
    if (
        imageIds.length ===
        0
    ) {
        return;
    }

    currentIndex++;

    if (
        currentIndex >=
        imageIds.length
    ) {
        currentIndex =
            0;
    }

    updateLightbox();
}


/*
 * ========================================
 * 閉じるボタン
 * ========================================
 */

document
    .getElementById(
        "closeButton"
    )
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
    .getElementById(
        "prevButton"
    )
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
    .getElementById(
        "nextButton"
    )
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
            event
                .changedTouches[0]
                .screenX;
    }
);


lightbox.addEventListener(
    "touchend",
    (event) => {
        touchEndX =
            event
                .changedTouches[0]
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
