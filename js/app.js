import {
    createCalendar
} from "./calendar.js";

import {
    createGallery
} from "./gallery.js";

import {
    createLightbox
} from "./lightbox.js";


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

const calendarElement =
    document.getElementById(
        "calendar"
    );

const selectedDateTitle =
    document.getElementById(
        "selectedDateTitle"
    );

const galleryElement =
    document.getElementById(
        "gallery"
    );


/*
 * ========================================
 * 状態
 * ========================================
 */

let images = [];

let filteredImages = [];

let allPostDates = [];

let calendarYear = null;

let calendarMonth = null;

let selectedDate = null;


/*
 * ========================================
 * ライトボックス
 * ========================================
 */

const lightbox =
    createLightbox();


/*
 * ========================================
 * ギャラリー
 * ========================================
 */

const gallery =
    createGallery({
        element:
            galleryElement,

        onImageClick:
            (index) => {
                lightbox.open(
                    index
                );
            }
    });


/*
 * ========================================
 * カレンダー
 * ========================================
 */

const calendar =
    createCalendar({
        element:
            calendarElement,

        selectedDateTitle:
            selectedDateTitle,

        getPostDates:
            () =>
                getPostDates(),

        getCalendarYear:
            () =>
                calendarYear,

        getCalendarMonth:
            () =>
                calendarMonth,

        getSelectedDate:
            () =>
                selectedDate,

        isMemberSelected:
            () =>
                Boolean(
                    memberSelect.value
                ),

        onDateSelect:
            (dateKey) => {
                selectCalendarDate(
                    dateKey
                );
            },

        onMonthChange:
            (year, month) => {
                calendarYear =
                    year;

                calendarMonth =
                    month;

                selectedDate =
                    null;

                calendar.updateSelectedDateTitle();

                calendar.render();

                if (
                    memberSelect.value
                ) {
                    updateImages();
                }
            },

        onClearDate:
            () => {
                selectedDate =
                    null;

                calendar.updateSelectedDateTitle();

                calendar.render();

                updateImages();
            }
    });


/*
 * ========================================
 * 初期化
 * ========================================
 */

async function initialize() {
    await loadMembers();

    await loadAllPostDates();
}

initialize();


/*
 * ========================================
 * メンバー一覧取得
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

        if (
            !Array.isArray(
                data.members
            )
        ) {
            return;
        }

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
 * 全メンバーの投稿日取得
 * ========================================
 */

async function loadAllPostDates() {
    calendarElement.innerHTML =
        "";

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

        calendar.updateSelectedDateTitle();

        setInitialCalendarMonth();

        calendar.render();

    } catch (error) {
        console.error(
            error
        );

        calendarElement.textContent =
            "カレンダーの読み込みに失敗しました。";
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

        calendar.updateSelectedDateTitle();

        gallery.clear();

        lightbox.setImages(
            []
        );


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
    gallery.clear();

    calendarElement.innerHTML =
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

        calendar.updateSelectedDateTitle();

        setInitialCalendarMonth();

        calendar.render();

        updateImages();

    } catch (error) {
        console.error(
            error
        );

        images = [];

        filteredImages = [];

        selectedDate =
            null;

        lightbox.setImages(
            []
        );

        calendar.updateSelectedDateTitle();

        calendarElement.innerHTML =
            "";

        galleryElement.textContent =
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

    if (
        memberSelect.value
    ) {
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
 * 投稿日が存在する月
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

    calendar.updateSelectedDateTitle();

    calendar.render();

    updateImages();
}


/*
 * ========================================
 * 画像絞り込み・並び替え
 * ========================================
 */

function updateImages() {
    calendar.updateSelectedDateTitle();

    if (
        selectedDate
    ) {
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

    const imageIds =
        filteredImages.map(
            (image) =>
                image.id
        );

    lightbox.setImages(
        imageIds
    );

    gallery.render(
        imageIds,
        Boolean(
            memberSelect.value
        )
    );
}
