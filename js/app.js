import {
    createCalendar
} from "./calendar.js";

import {
    createGallery
} from "./gallery.js";

import {
    createLightbox
} from "./lightbox.js";

import {
    fetchMembers,
    fetchBlogs
} from "./api.js";

import {
    createBlogDetail
} from "./blog-detail.js";

import {
    createBlogImages
} from "./blog-images.js";


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

const blogImagesView =
    document.getElementById(
        "blogImagesView"
    );

const blogImagesBackButton =
    document.getElementById(
        "blogImagesBackButton"
    );

const blogImages =
    document.getElementById(
        "blogImages"
    );


/*
 * ========================================
 * 状態
 * ========================================
 */

let blogs =
    [];

let filteredBlogs =
    [];

let allPostDates =
    [];

let memberPostDates =
    [];

let calendarYear =
    null;

let calendarMonth =
    null;

let selectedDate =
    null;

let galleryScrollPosition =
    0;


/*
 * ========================================
 * ライトボックス
 * ========================================
 */

const lightbox =
    createLightbox();


/*
 * ========================================
 * ブログ詳細
 * ========================================
 */

const blogDetailController =
    createBlogDetail({
        galleryView:
            galleryView,

        blogDetailView:
            blogDetailView,

        blogDetail:
            blogDetail,

        onOpen:
            (
                blogData
            ) => {

                blogImagesController.hide();

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
            }
    });


/*
 * ========================================
 * ブログ画像一覧
 * ========================================
 */

const blogImagesController =
    createBlogImages({
        galleryView:
            galleryView,

        blogImagesView:
            blogImagesView,

        blogImages:
            blogImages,

        lightbox:
            lightbox,

        onOpen:
            (
                blog
            ) => {

                blogDetailController.hide();

                history.pushState(
                    {
                        view:
                            "blog-images",

                        articleId:
                            blog.articleId
                    },
                    "",
                    `#blog-images-${blog.articleId}`
                );
            }
    });


/*
 * ========================================
 * 表示中画像ID取得
 * ========================================
 */

function getDisplayedImageIds() {

    return gallery
        .getDisplayedImages()
        .map(
            image =>
                image.fileId
        )
        .filter(
            Boolean
        );
}


/*
 * ========================================
 * ギャラリー
 * ========================================
 */

const gallery =
    createGallery({
        element:
            galleryElement,


        /*
         * ========================================
         * 画像クリック
         *
         * 表示中の全ブログをまたいで
         * ライトボックス表示
         * ========================================
         */

        onImageClick:
            (
                index
            ) => {

                const imageIds =
                    getDisplayedImageIds();

                lightbox.setImages(
                    imageIds
                );

                lightbox.open(
                    index
                );
            },


        /*
         * ========================================
         * ブログタイトルクリック
         * ========================================
         */

        onArticleClick:
            async ({
                articleId,
                memberKey
            }) => {

                galleryScrollPosition =
                    window.scrollY;

                await blogDetailController.open({
                    articleId:
                        articleId,

                    memberKey:
                        memberKey,

                    group:
                        groupSelect.value
                });
            },


        /*
         * ========================================
         * 全○枚を見る
         *
         * ブログ画像一覧画面へ遷移
         * ========================================
         */

        onArticleImagesClick:
            ({
                articleId,
                title,
                memberKey,
                images
            }) => {

                galleryScrollPosition =
                    window.scrollY;

                blogImagesController.open({
                    articleId:
                        articleId,

                    title:
                        title,

                    memberKey:
                        memberKey,

                    images:
                        images
                });
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
            async (
                dateKey
            ) => {

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

                await loadCurrentMonthBlogs();
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

        blogs =
            [];

        filteredBlogs =
            [];

        allPostDates =
            [];

        memberPostDates =
            [];

        selectedDate =
            null;

        calendarYear =
            null;

        calendarMonth =
            null;

        galleryScrollPosition =
            0;

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

        const data =
            await fetchMembers(
                group
            );

        if (
            !Array.isArray(
                data.members
            )
        ) {
            return;
        }

        data.members.forEach(
            member => {

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
 * グループ投稿日取得
 * ========================================
 */

async function loadGroupPostDates() {

    const group =
        groupSelect.value;

    calendarElement.innerHTML =
        "読み込み中...";

    gallery.clear();

    try {

        const data =
            await fetchBlogs({
                group:
                    group
            });

        allPostDates =
            Array.isArray(
                data.postDates
            )
                ? data.postDates
                : [];

        memberPostDates =
            [];

        selectedDate =
            null;

        setInitialCalendarMonth();

        calendar.updateSelectedDateTitle();

        calendar.render();

        await loadCurrentMonthBlogs();

    } catch (
        error
    ) {

        console.error(
            error
        );

        allPostDates =
            [];

        blogs =
            [];

        filteredBlogs =
            [];

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

        blogs =
            [];

        filteredBlogs =
            [];

        memberPostDates =
            [];

        selectedDate =
            null;

        calendarYear =
            null;

        calendarMonth =
            null;

        galleryScrollPosition =
            0;

        gallery.clear();

        lightbox.setImages(
            []
        );

        calendar.updateSelectedDateTitle();


        /*
         * ========================================
         * メンバー未選択
         * ========================================
         */

        if (
            !member
        ) {

            setInitialCalendarMonth();

            calendar.updateSelectedDateTitle();

            calendar.render();

            await loadCurrentMonthBlogs();

            return;
        }


        /*
         * ========================================
         * メンバー選択あり
         * ========================================
         */

        await loadMemberPostDates(
            member
        );
    }
);


/*
 * ========================================
 * メンバー投稿日取得
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

        const data =
            await fetchBlogs({
                group:
                    group,

                member:
                    memberKey
            });

        memberPostDates =
            Array.isArray(
                data.postDates
            )
                ? data.postDates
                : [];

        blogs =
            [];

        filteredBlogs =
            [];

        selectedDate =
            null;

        /*
         * ========================================
         * 選択メンバーの最新投稿月
         * ========================================
         */

        setInitialCalendarMonth();

        calendar.updateSelectedDateTitle();

        calendar.render();

        await loadCurrentMonthBlogs();

    } catch (
        error
    ) {

        console.error(
            error
        );

        blogs =
            [];

        filteredBlogs =
            [];

        memberPostDates =
            [];

        lightbox.setImages(
            []
        );

        calendarElement.innerHTML =
            "";

        galleryElement.textContent =
            "ブログの読み込みに失敗しました。";
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
 * 表示中の月のブログ取得
 * ========================================
 */

async function loadCurrentMonthBlogs() {

    const group =
        groupSelect.value;

    const member =
        memberSelect.value;

    const month =
        getCurrentMonthKey();

    if (
        !month
    ) {

        blogs =
            [];

        filteredBlogs =
            [];

        gallery.clear();

        lightbox.setImages(
            []
        );

        return;
    }

    galleryElement.textContent =
        "読み込み中...";

    try {

        const data =
            await fetchBlogs({
                group:
                    group,

                member:
                    member ||
                    null,

                month:
                    month
            });

        blogs =
            Array.isArray(
                data.blogs
            )
                ? data.blogs
                : [];

        filteredBlogs =
            [];

        updateBlogs();

    } catch (
        error
    ) {

        console.error(
            error
        );

        blogs =
            [];

        filteredBlogs =
            [];

        lightbox.setImages(
            []
        );

        galleryElement.textContent =
            "ブログの読み込みに失敗しました。";
    }
}


/*
 * ========================================
 * 指定日のブログ取得
 * ========================================
 */

async function loadBlogsByDate(
    dateKey
) {

    const group =
        groupSelect.value;

    const member =
        memberSelect.value;

    galleryElement.textContent =
        "読み込み中...";

    try {

        const data =
            await fetchBlogs({
                group:
                    group,

                member:
                    member ||
                    null,

                date:
                    dateKey
            });

        blogs =
            Array.isArray(
                data.blogs
            )
                ? data.blogs
                : [];

        filteredBlogs =
            [];

        updateBlogs();

    } catch (
        error
    ) {

        console.error(
            error
        );

        blogs =
            [];

        filteredBlogs =
            [];

        lightbox.setImages(
            []
        );

        galleryElement.textContent =
            "ブログの読み込みに失敗しました。";
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
        dateKey => {

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
 *
 * 対象ブログの最新投稿日月を表示
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
     * ========================================
     * 同じ日を再クリック
     *
     * → 月表示へ戻る
     * ========================================
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

    await loadBlogsByDate(
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

    await loadCurrentMonthBlogs();
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
            blogs.length ===
                0
        ) {
            return;
        }

        updateBlogs();
    }
);


/*
 * ========================================
 * ブログ並び替え・描画
 * ========================================
 */

function updateBlogs() {

    filteredBlogs = [
        ...blogs
    ];

    const sortOrder =
        sortSelect.value;

    gallery.render(
        filteredBlogs,
        Boolean(
            memberSelect.value
        ),
        sortOrder
    );


    /*
     * ========================================
     * 通常ギャラリーでは
     * 表示中全ブログの画像を対象にする
     * ========================================
     */

    const imageIds =
        getDisplayedImageIds();

    lightbox.setImages(
        imageIds
    );
}


/*
 * ========================================
 * 戻るボタン
 * ========================================
 */

blogDetailBackButton.addEventListener(
    "click",
    () => {

        history.back();
    }
);

blogImagesBackButton.addEventListener(
    "click",
    () => {

        history.back();
    }
);


/*
 * ========================================
 * ギャラリー表示
 * ========================================
 */

function showGalleryView() {

    blogDetailController.hide();

    blogImagesController.hide();

    galleryView.hidden =
        false;

    /*
     * ========================================
     * 元のスクロール位置へ戻す
     * ========================================
     */

    window.scrollTo({
        top:
            galleryScrollPosition,

        behavior:
            "auto"
    });
}


/*
 * ========================================
 * ブログ詳細表示
 * ========================================
 */

function showBlogDetailView() {

    blogImagesController.hide();

    const shown =
        blogDetailController.showCurrent();

    if (
        !shown
    ) {

        showGalleryView();
    }
}


/*
 * ========================================
 * ブログ画像一覧表示
 * ========================================
 */

function showBlogImagesView() {

    blogDetailController.hide();

    const shown =
        blogImagesController.showCurrent();

    if (
        !shown
    ) {

        showGalleryView();
    }
}


/*
 * ========================================
 * ブラウザ履歴変更
 * ========================================
 */

window.addEventListener(
    "popstate",
    () => {

        const hash =
            window.location.hash;


        /*
         * ========================================
         * ブログ画像一覧
         *
         * #blog-images-12345
         * ========================================
         */

        if (
            hash.startsWith(
                "#blog-images-"
            )
        ) {

            showBlogImagesView();

            return;
        }


        /*
         * ========================================
         * ブログ詳細
         *
         * #blog-12345
         * ========================================
         */

        if (
            hash.startsWith(
                "#blog-"
            )
        ) {

            showBlogDetailView();

            return;
        }


        /*
         * ========================================
         * 通常ギャラリー
         * ========================================
         */

        showGalleryView();
    }
);
