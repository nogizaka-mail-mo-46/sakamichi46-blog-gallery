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
 * ヒーロー DOM
 * ========================================
 */

const hero =
    document.getElementById(
        "hero"
    );

const heroBackgroundA =
    document.getElementById(
        "heroBackgroundA"
    );

const heroBackgroundB =
    document.getElementById(
        "heroBackgroundB"
    );

const heroTitle =
    document.getElementById(
        "heroTitle"
    );

const heroSubtitle =
    document.getElementById(
        "heroSubtitle"
    );

const heroGroupButtons =
    Array.from(
        document.querySelectorAll(
            ".hero-group-button"
        )
    );


/*
 * ========================================
 * 状態
 * ========================================
 */

let currentGroup =
    "nogizaka46";

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
 * ヒーロー設定
 * ========================================
 */

const heroGroupData = {

    nogizaka46: {
        title:
            "乃木坂46",

        subtitle:
            "NOGIZAKA46 BLOG GALLERY",

        background:
            "/images/hero/nogizaka46.webp"
    },

    sakurazaka46: {
        title:
            "櫻坂46",

        subtitle:
            "SAKURAZAKA46 BLOG GALLERY",

        background:
            "/images/hero/sakurazaka46.webp"
    },

    hinatazaka46: {
        title:
            "日向坂46",

        subtitle:
            "HINATAZAKA46 BLOG GALLERY",

        background:
            "/images/hero/hinatazaka46.webp"
    }
};


/*
 * ========================================
 * ヒーロー背景状態
 * ========================================
 */

let activeHeroBackground =
    "A";

let currentHeroGroup =
    null;

let requestedHeroGroup =
    null;


/*
 * ========================================
 * ヒーロー更新
 * ========================================
 */

function updateHero(
    group
) {

    const data =
        heroGroupData[
            group
        ];

    if (
        !data
    ) {
        return;
    }


    /*
     * ========================================
     * タイトル
     * ========================================
     */

    heroTitle.textContent =
        data.title;

    heroSubtitle.textContent =
        data.subtitle;


    /*
     * ========================================
     * グループクラス
     * ========================================
     */

    hero.classList.remove(
        "hero-nogizaka46",
        "hero-sakurazaka46",
        "hero-hinatazaka46"
    );

    hero.classList.add(
        `hero-${group}`
    );


    /*
     * ========================================
     * タブ選択状態
     * ========================================
     */

    heroGroupButtons.forEach(
        button => {

            const selected =
                button.dataset.group ===
                group;

            button.classList.toggle(
                "active",
                selected
            );

            button.setAttribute(
                "aria-pressed",
                selected
                    ? "true"
                    : "false"
            );
        }
    );


    /*
     * ========================================
     * 初回
     * ========================================
     */

    if (
        currentHeroGroup ===
            null
    ) {

        heroBackgroundA.style.backgroundImage =
            `url("${data.background}")`;

        heroBackgroundA.classList.add(
            "active"
        );

        heroBackgroundB.classList.remove(
            "active"
        );

        activeHeroBackground =
            "A";

        currentHeroGroup =
            group;

        requestedHeroGroup =
            group;

        return;
    }


    /*
     * ========================================
     * 同じグループ
     * ========================================
     */

    if (
        currentHeroGroup ===
            group
    ) {

        requestedHeroGroup =
            group;

        return;
    }


    /*
     * ========================================
     * 次背景先読み
     * ========================================
     */

    requestedHeroGroup =
        group;

    const preloadImage =
        new Image();

    preloadImage.src =
        data.background;

    preloadImage.onload =
        () => {

            if (
                requestedHeroGroup !==
                    group
            ) {
                return;
            }

            const currentBackground =
                activeHeroBackground ===
                    "A"
                    ? heroBackgroundA
                    : heroBackgroundB;

            const nextBackground =
                activeHeroBackground ===
                    "A"
                    ? heroBackgroundB
                    : heroBackgroundA;

            nextBackground.style.backgroundImage =
                `url("${data.background}")`;

            nextBackground.classList.add(
                "active"
            );

            currentBackground.classList.remove(
                "active"
            );

            activeHeroBackground =
                activeHeroBackground ===
                    "A"
                    ? "B"
                    : "A";

            currentHeroGroup =
                group;
        };
}


/*
 * ========================================
 * ライトボックス
 * ========================================
 */

const lightbox =
    createLightbox({
        onOpen:
            () => {

                history.pushState(
                    {
                        view:
                            "lightbox"
                    },
                    "",
                    `${window.location.pathname}${window.location.search}${window.location.hash}`
                );
            },

        onClose:
            () => {

                if (
                    history.state?.view ===
                        "lightbox"
                ) {

                    history.back();
                }
            }
    });


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
                        currentGroup
                });
            },

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

    updateHero(
        currentGroup
    );

    await loadMembers();

    await loadGroupPostDates();
}

initialize();


/*
 * ========================================
 * グループタブ
 * ========================================
 */

heroGroupButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            async () => {

                const group =
                    button.dataset.group;

                if (
                    !group
                ) {
                    return;
                }

                await changeGroup(
                    group
                );
            }
        );
    }
);


/*
 * ========================================
 * グループ変更
 * ========================================
 */

async function changeGroup(
    group
) {

    if (
        !heroGroupData[
            group
        ]
    ) {
        return;
    }

    if (
        currentGroup ===
            group
    ) {

        updateHero(
            group
        );

        return;
    }

    currentGroup =
        group;

    updateHero(
        currentGroup
    );

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


/*
 * ========================================
 * メンバー一覧取得
 * ========================================
 */

async function loadMembers() {

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
                currentGroup
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

    calendarElement.innerHTML =
        "読み込み中...";

    gallery.clear();

    try {

        const data =
            await fetchBlogs({
                group:
                    currentGroup
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

        if (
            !member
        ) {

            setInitialCalendarMonth();

            calendar.updateSelectedDateTitle();

            calendar.render();

            await loadCurrentMonthBlogs();

            return;
        }

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

    calendarElement.innerHTML =
        "読み込み中...";

    gallery.clear();

    try {

        const data =
            await fetchBlogs({
                group:
                    currentGroup,

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
 * 表示中の月ブログ取得
 * ========================================
 */

async function loadCurrentMonthBlogs() {

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
                    currentGroup,

                member:
                    memberSelect.value ||
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

    galleryElement.textContent =
        "読み込み中...";

    try {

        const data =
            await fetchBlogs({
                group:
                    currentGroup,

                member:
                    memberSelect.value ||
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
 * 現在対象の投稿日
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
 * 投稿日月
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
            postMonths.length -
            1
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
 * ブログ描画
 * ========================================
 */

function updateBlogs() {

    filteredBlogs = [
        ...blogs
    ];

    gallery.render(
        filteredBlogs,
        Boolean(
            memberSelect.value
        ),
        sortSelect.value
    );

    lightbox.setImages(
        getDisplayedImageIds()
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

        if (
            lightbox.isOpen()
        ) {

            lightbox.close(
                false
            );

            return;
        }

        const hash =
            window.location.hash;

        if (
            hash.startsWith(
                "#blog-images-"
            )
        ) {

            showBlogImagesView();

            return;
        }

        if (
            hash.startsWith(
                "#blog-"
            )
        ) {

            showBlogDetailView();

            return;
        }

        showGalleryView();
    }
);
