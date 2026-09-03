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

const groupSelect =
    document.getElementById(
        "groupSelect"
    );

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

const galleryView =
    document.getElementById(
        "galleryView"
    );

const blogDetailView =
    document.getElementById(
        "blogDetailView"
    );

const blogDetailBackButton =
    document.getElementById(
        "blogDetailBackButton"
    );

const blogDetail =
    document.getElementById(
        "blogDetail"
    );


/*
 * ========================================
 * 状態
 * ========================================
 */

let images = [];

let filteredImages = [];

let allPostDates = [];

let memberPostDates = [];

let calendarYear = null;

let calendarMonth = null;

let selectedDate = null;

let galleryScrollPosition = 0;

let currentBlogDetail = null;

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
            },

        onArticleClick:
            async ({
                articleId,
                memberKey
            }) => {
                await loadBlogDetail(
                    articleId,
                    memberKey
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
            async (dateKey) => {
                await selectCalendarDate(
                    dateKey
                );
            },

        onMonthChange:
            async (
                year,
                month
            ) => {
                calendarYear =
                    year;

                calendarMonth =
                    month;

                selectedDate =
                    null;

                calendar.updateSelectedDateTitle();

                calendar.render();

                await loadCurrentMonthImages();
            },

        onClearDate:
            async () => {
                await clearSelectedDate();
            }
    });


/*
 * ========================================
 * 初期化
 * ========================================
 */

async function initialize() {
    await loadMembers();

    await loadGroupPostDates();
}

initialize();


/*
 * ========================================
 * グループ変更
 * ========================================
 */

groupSelect.addEventListener(
    "change",
    async () => {
        memberSelect.value =
            "";

        images = [];

        filteredImages = [];

        allPostDates = [];

        memberPostDates = [];

        selectedDate =
            null;

        calendarYear =
            null;

        calendarMonth =
            null;

        gallery.clear();

        lightbox.setImages(
            []
        );

        calendar.updateSelectedDateTitle();

        await loadMembers();

        await loadGroupPostDates();
    }
);


/*
 * ========================================
 * メンバー一覧取得
 * ========================================
 */

async function loadMembers() {
    const group =
        groupSelect.value;

    memberSelect.innerHTML =
        "";

    const placeholder =
        document.createElement(
            "option"
        );

    placeholder.value =
        "";

    placeholder.textContent =
        "メンバーを選択";

    memberSelect.appendChild(
        placeholder
    );

    try {
        const response =
            await fetch(
                `/api/members?group=${encodeURIComponent(group)}`
            );

        if (
            !response.ok
        ) {
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

    } catch (
        error
    ) {
        console.error(
            error
        );
    }
}


/*
 * ========================================
 * 選択グループの投稿日取得
 * ========================================
 */

async function loadGroupPostDates() {
    const group =
        groupSelect.value;

    calendarElement.innerHTML =
        "読み込み中...";

    gallery.clear();

    try {
        const response =
            await fetch(
                `/api/images?group=${encodeURIComponent(group)}`
            );

        if (
            !response.ok
        ) {
            throw new Error(
                "投稿日取得に失敗しました。"
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

        memberPostDates = [];

        selectedDate =
            null;

        setInitialCalendarMonth();

        calendar.updateSelectedDateTitle();

        calendar.render();

        await loadCurrentMonthImages();

    } catch (
        error
    ) {
        console.error(
            error
        );

        allPostDates = [];

        images = [];

        filteredImages = [];

        lightbox.setImages(
            []
        );

        calendarElement.textContent =
            "カレンダーの読み込みに失敗しました。";

        gallery.clear();
    }
}


/*
 * ========================================
 * メンバー変更
 * ========================================
 */

memberSelect.addEventListener(
    "change",
    async () => {
        const member =
            memberSelect.value;

        images = [];

        filteredImages = [];

        memberPostDates = [];

        selectedDate =
            null;

        calendarYear =
            null;

        calendarMonth =
            null;

        gallery.clear();

        lightbox.setImages(
            []
        );

        calendar.updateSelectedDateTitle();


        /*
         * メンバー未選択
         */

        if (
            !member
        ) {
            setInitialCalendarMonth();

            calendar.updateSelectedDateTitle();

            calendar.render();

            await loadCurrentMonthImages();

            return;
        }


        /*
         * メンバー選択あり
         */

        await loadMemberPostDates(
            member
        );
    }
);


/*
 * ========================================
 * メンバーの投稿日取得
 * ========================================
 */

async function loadMemberPostDates(
    memberKey
) {
    const group =
        groupSelect.value;

    calendarElement.innerHTML =
        "読み込み中...";

    gallery.clear();

    try {
        const response =
            await fetch(
                `/api/images?group=${encodeURIComponent(group)}&member=${encodeURIComponent(memberKey)}`
            );

        if (
            !response.ok
        ) {
            throw new Error(
                "メンバー投稿日一覧の取得に失敗しました。"
            );
        }

        const data =
            await response.json();

        memberPostDates =
            Array.isArray(
                data.postDates
            )
                ? data.postDates
                : [];

        images = [];
        filteredImages = [];
        selectedDate = null;

        setInitialCalendarMonth();

        calendar.updateSelectedDateTitle();

        calendar.render();

        await loadCurrentMonthImages();

    } catch (
        error
    ) {
        console.error(
            error
        );

        images = [];
        filteredImages = [];
        memberPostDates = [];

        lightbox.setImages(
            []
        );

        calendarElement.innerHTML =
            "";

        galleryElement.textContent =
            "画像の読み込みに失敗しました。";
    }
}


/*
 * ========================================
 * 表示中の月キー取得
 * ========================================
 */

function getCurrentMonthKey() {
    if (
        calendarYear ===
            null ||
        calendarMonth ===
            null
    ) {
        return null;
    }

    return (
        String(
            calendarYear
        ) +
        String(
            calendarMonth
        ).padStart(
            2,
            "0"
        )
    );
}


/*
 * ========================================
 * 表示中の月の画像取得
 * ========================================
 */

async function loadCurrentMonthImages() {
    const group =
        groupSelect.value;

    const member =
        memberSelect.value;

    const month =
        getCurrentMonthKey();

    if (
        !month
    ) {
        images = [];

        filteredImages = [];

        gallery.clear();

        lightbox.setImages(
            []
        );

        return;
    }

    galleryElement.textContent =
        "読み込み中...";

    try {
        const params =
            new URLSearchParams({
                group:
                    group,

                month:
                    month
            });

        if (
            member
        ) {
            params.set(
                "member",
                member
            );
        }

        const response =
            await fetch(
                `/api/images?${params.toString()}`
            );

        if (
            !response.ok
        ) {
            throw new Error(
                "月別画像の取得に失敗しました。"
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

        filteredImages = [];

        updateImages();

    } catch (
        error
    ) {
        console.error(
            error
        );

        images = [];

        filteredImages = [];

        lightbox.setImages(
            []
        );

        galleryElement.textContent =
            "画像の読み込みに失敗しました。";
    }
}


/*
 * ========================================
 * 指定日の画像取得
 * ========================================
 */

async function loadImagesByDate(
    dateKey
) {
    const group =
        groupSelect.value;

    const member =
        memberSelect.value;

    galleryElement.textContent =
        "読み込み中...";

    try {
        const params =
            new URLSearchParams({
                group:
                    group,

                date:
                    dateKey
            });

        if (
            member
        ) {
            params.set(
                "member",
                member
            );
        }

        const response =
            await fetch(
                `/api/images?${params.toString()}`
            );

        if (
            !response.ok
        ) {
            throw new Error(
                "指定日の画像取得に失敗しました。"
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

        filteredImages = [];

        updateImages();

    } catch (
        error
    ) {
        console.error(
            error
        );

        images = [];

        filteredImages = [];

        lightbox.setImages(
            []
        );

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
    if (
        memberSelect.value
    ) {
        return new Set(
            memberPostDates
        );
    }

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

async function selectCalendarDate(
    dateKey
) {
    /*
     * 同じ日を再クリック
     * → 月表示へ戻る
     */

    if (
        selectedDate ===
        dateKey
    ) {
        await clearSelectedDate();

        return;
    }

    selectedDate =
        dateKey;

    calendar.updateSelectedDateTitle();

    calendar.render();

    await loadImagesByDate(
        dateKey
    );
}


/*
 * ========================================
 * 日付選択解除
 * ========================================
 */

async function clearSelectedDate() {
    selectedDate =
        null;

    calendar.updateSelectedDateTitle();

    calendar.render();

    await loadCurrentMonthImages();
}


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
 * ブログ詳細から戻る
 * ========================================
 */

blogDetailBackButton.addEventListener(
    "click",
    () => {
        history.back();
    }
);


/*
 * ========================================
 * ブラウザ履歴変更
 * ========================================
 */

window.addEventListener(
    "popstate",
    () => {
        if (
            window.location.hash.startsWith(
                "#blog-"
            )
        ) {
            if (
                currentBlogDetail
            ) {
                galleryView.hidden =
                    true;

                blogDetailView.hidden =
                    false;

                window.scrollTo({
                    top:
                        0,

                    behavior:
                        "auto"
                });
            }

            return;
        }

        blogDetailView.hidden =
            true;

        galleryView.hidden =
            false;

        blogDetail.innerHTML =
            "";

        window.scrollTo({
            top:
                galleryScrollPosition,

            behavior:
                "auto"
        });
    }
);


/*
 * ========================================
 * 画像並び替え・描画
 * ========================================
 */

function updateImages() {
    filteredImages = [
        ...images
    ];

    const sortOrder =
        sortSelect.value;

    gallery.render(
        filteredImages,
        Boolean(
            memberSelect.value
        ),
        sortOrder
    );

    const displayedImages =
        gallery.getDisplayedImages();

    const imageIds =
        displayedImages.map(
            (image) =>
                image.id
        );

    lightbox.setImages(
        imageIds
    );
}


/*
 * ========================================
 * ブログ詳細取得
 * ========================================
 */

async function loadBlogDetail(
    articleId,
    memberKey
) {
    const group =
        groupSelect.value;

    const targetMemberKey =
        memberKey ||
        memberSelect.value;

    if (
        !targetMemberKey
    ) {
        console.error(
            "ブログのメンバーを特定できません。"
        );

        return;
    }

    try {
        const params =
            new URLSearchParams({
                group:
                    group,

                member:
                    targetMemberKey,

                articleId:
                    articleId
            });

        const response =
            await fetch(
                `/api/blog?${params.toString()}`
            );

        if (
            !response.ok
        ) {
            throw new Error(
                "ブログ詳細の取得に失敗しました。"
            );
        }

        const blogData =
            await response.json();

        renderBlogDetail(
            blogData
        );

    } catch (
        error
    ) {
        console.error(
            error
        );
    }
}


/*
 * ========================================
 * ブログ詳細描画
 * ========================================
 */

function renderBlogDetail(
    blogData
) {
    blogDetail.innerHTML =
        "";

    const header =
        document.createElement(
            "header"
        );

    header.className =
        "blog-detail-header";

    const title =
        document.createElement(
            "h2"
        );

    title.className =
        "blog-detail-title";

    title.textContent =
        blogData.title ||
        "タイトルなし";

    const meta =
        document.createElement(
            "div"
        );

    meta.className =
        "blog-detail-meta";

    const date =
        blogData.date
            ? blogData.date.replace(
                /-/g,
                "."
            )
            : "";

    const memberName =
        blogData.member?.name ||
        "";

    meta.textContent =
        [
            date,
            memberName
        ]
            .filter(
                Boolean
            )
            .join(
                " / "
            );

    header.appendChild(
        title
    );

    header.appendChild(
        meta
    );

    blogDetail.appendChild(
        header
    );


    /*
     * ========================================
     * 本文・画像
     * ========================================
     */

    const blocks =
        Array.isArray(
            blogData.blocks
        )
            ? blogData.blocks
            : [];

    blocks.forEach(
        block => {
            if (
                block.type ===
                    "text"
            ) {
                const text =
                    document.createElement(
                        "div"
                    );

                text.className =
                    "blog-detail-text";

                text.textContent =
                    block.text ||
                    "";

                blogDetail.appendChild(
                    text
                );

                return;
            }

            if (
                block.type ===
                    "image" &&
                block.fileId
            ) {
                const imageContainer =
                    document.createElement(
                        "div"
                    );

                imageContainer.className =
                    "blog-detail-image";

                const image =
                    document.createElement(
                        "img"
                    );

                image.src =
                    `/image/${block.fileId}`;

                image.alt =
                    blogData.title ||
                    "";

                image.loading =
                    "lazy";

                image.decoding =
                    "async";

                imageContainer.appendChild(
                    image
                );

                blogDetail.appendChild(
                    imageContainer
                );
            }
        }
    );


    /*
     * ========================================
     * 詳細画面へ切り替え
     * ========================================
     */

    galleryScrollPosition =
        window.scrollY;

    currentBlogDetail =
        blogData;

    galleryView.hidden =
        true;

    blogDetailView.hidden =
        false;

    history.pushState(
        {
            view:
                "blog-detail",

            articleId:
                blogData.articleId
        },
        "",
        `#blog-${blogData.articleId}`
    );

    window.scrollTo({
        top:
            0,

        behavior:
            "auto"
    });
}
