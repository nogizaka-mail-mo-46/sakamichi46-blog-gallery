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
    fetchBlogs,
    fetchBlogSearch
} from "./api.js";

import {
    createBlogDetail
} from "./blog-detail.js";

import {
    createBlogImages
} from "./blog-images.js";

import {
    createUiIcon
} from "./ui-icons.js";

import {
    getImageUrl
} from "./image-url.js";


/*
 * ========================================
 * 履歴スクロール位置
 *
 * ブログ詳細・画像一覧から戻った際の
 * スクロール位置はアプリ側で復元する
 * ========================================
 */

if (
    "scrollRestoration" in
        history
) {
    history.scrollRestoration =
        "manual";
}


/*
 * ========================================
 * DOM
 * ========================================
 */

const memberIconSelector =
    document.getElementById(
        "memberIconSelector"
    );

const memberIconTrack =
    document.getElementById(
        "memberIconTrack"
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
 * 戻るボタン 共通アイコン
 * ========================================
 */

blogDetailBackButton.replaceChildren(
    createUiIcon(
        "arrowLeft",
        {
            size:
                18
        }
    ),
    document.createTextNode(
        "戻る"
    )
);

blogImagesBackButton.replaceChildren(
    createUiIcon(
        "arrowLeft",
        {
            size:
                18
        }
    ),
    document.createTextNode(
        "戻る"
    )
);


/*
 * ========================================
 * スマホ用 ページ上部へ戻るボタン
 * ========================================
 */

const scrollTopButton =
    document.createElement(
        "button"
    );

scrollTopButton.type =
    "button";

scrollTopButton.className =
    "scroll-top-button";

scrollTopButton.setAttribute(
    "aria-label",
    "ページ上部へ戻る"
);

scrollTopButton.appendChild(
    createUiIcon(
        "arrowUp",
        {
            size:
                22
        }
    )
);

document.body.appendChild(
    scrollTopButton
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

let members =
    [];

let selectedGeneration =
    null;

/*
 * グループ別
 * メンバーアイコンMapキャッシュ
 */
const memberIconMaps =
    new Map();

let blogs =
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
 * データ取得 世代番号
 *
 * グループ・メンバー・月・日付などが
 * 切り替わった際に番号を進め、
 * 古い非同期処理の結果を破棄する。
 * ========================================
 */

let dataRequestVersion =
    0;


/*
 * ========================================
 * データ取得 世代更新
 * ========================================
 */

function createDataRequestVersion() {

    dataRequestVersion +=
        1;


    return dataRequestVersion;
}


/*
 * ========================================
 * 最新のデータ取得か確認
 * ========================================
 */

function isCurrentDataRequest(
    requestVersion
) {

    return (
        requestVersion ===
        dataRequestVersion
    );
}


/*
 * ========================================
 * ギャラリーのスクロール位置保存
 * ========================================
 */

function saveGalleryScrollPosition() {

    galleryScrollPosition =
        window.scrollY;

    history.replaceState(
        {
            ...history.state,

            view:
                "gallery",

            scrollY:
                galleryScrollPosition
        },
        "",
        `${window.location.pathname}${window.location.search}`
    );
}


/*
 * ========================================
 * メンバーアイコン設定
 * ========================================
 */

const MEMBER_ICONS_API_URL =
    "/api/member-icons";


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
     * ページ全体のグループクラス
     * ========================================
     */
    
    document.body.classList.remove(
        "group-nogizaka46",
        "group-sakurazaka46",
        "group-hinatazaka46"
    );
    
    document.body.classList.add(
        `group-${group}`
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
 * メンバー名正規化
 * ========================================
 */

function normalizeMemberName(
    value
) {

    return String(
        value || ""
    )
        .normalize(
            "NFKC"
        )
        .replace(
            /\s+/g,
            ""
        );
}


/*
 * ========================================
 * メンバーアイコン取得
 * ========================================
 */

async function loadMemberIconMap(
    group
) {

    /*
     * ========================================
     * キャッシュ済み
     * ========================================
     */

    if (
        memberIconMaps.has(
            group
        )
    ) {

        return memberIconMaps.get(
            group
        );
    }


    const iconMap =
        new Map();


    try {

        /*
         * ========================================
         * グループ別JSON取得
         * ========================================
         */

        const response =
            await fetch(
                `${MEMBER_ICONS_API_URL}` +
                `?group=${encodeURIComponent(group)}`,
                {
                    method:
                        "GET",

                    credentials:
                        "include"
                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `メンバーアイコン一覧の取得に失敗しました: ` +
                `${response.status}`
            );
        }


        const data =
            await response.json();


        if (
            !Array.isArray(
                data.members
            )
        ) {

            throw new Error(
                "メンバーアイコン一覧の形式が不正です。"
            );
        }


        /*
         * ========================================
         * メンバー名 → アイコン情報
         * ========================================
         */

        data.members.forEach(
            member => {

                if (
                    !member?.name ||
                    !member?.fileId
                ) {
                    return;
                }


                iconMap.set(
                    normalizeMemberName(
                        member.name
                    ),
                    {
                        name:
                            member.name,

                        fileId:
                            member.fileId,

                        fileName:
                            member.fileName ||
                            ""
                    }
                );
            }
        );


        /*
         * ========================================
         * グループ別キャッシュ
         * ========================================
         */

        memberIconMaps.set(
            group,
            iconMap
        );


    } catch (
        error
    ) {

        console.error(
            error
        );


        /*
         * 失敗時も空Mapをキャッシュ
         */
        memberIconMaps.set(
            group,
            iconMap
        );
    }


    return iconMap;
}


/*
 * ========================================
 * メンバーアイコン選択状態更新
 * ========================================
 */

function updateMemberIconSelection() {

    if (
        !memberIconTrack
    ) {
        return;
    }

    const selectedMemberKey =
        memberSelect.value;

    const buttons =
        memberIconTrack.querySelectorAll(
            ".member-icon-button"
        );

    buttons.forEach(
        button => {

            const buttonMemberKey =
                button.dataset.memberKey ||
                "";

            const buttonGeneration =
                button.dataset.generation
                    ? Number(
                        button.dataset.generation
                    )
                    : null;

            let selected =
                false;

            if (
                buttonGeneration !==
                    null
            ) {

                selected =
                    !selectedMemberKey &&
                    selectedGeneration ===
                        buttonGeneration;

            } else {

                selected =
                    selectedGeneration ===
                        null &&
                    buttonMemberKey ===
                        selectedMemberKey;
            }

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
}


/*
 * ========================================
 * 期表記
 * ========================================
 */

function getGenerationOrdinal(
    generation
) {

    const value =
        Number(
            generation
        );

    const mod100 =
        value %
        100;

    let suffix =
        "th";

    if (
        mod100 <
            11 ||
        mod100 >
            13
    ) {

        switch (
            value %
            10
        ) {

            case 1:
                suffix =
                    "st";
                break;

            case 2:
                suffix =
                    "nd";
                break;

            case 3:
                suffix =
                    "rd";
                break;
        }
    }

    return `${value}${suffix}`;
}


/*
 * ========================================
 * メンバーアイコンボタン作成
 * ========================================
 */

function createMemberIconButton({
    memberKey = "",
    memberName,
    fileId = null,
    isAll = false,
    generation = null
}) {

    const button =
        document.createElement(
            "button"
        );

    button.type =
        "button";

    button.className =
        "member-icon-button";

    button.dataset.memberKey =
        memberKey;

    if (
        generation !==
            null
    ) {

        button.dataset.generation =
            String(
                generation
            );
    }

    button.setAttribute(
        "aria-pressed",
        "false"
    );

    button.setAttribute(
        "aria-label",
        isAll
            ? "全員を表示"
            : generation !==
                null
                ? `${generation}期生を表示`
                : `${memberName}を選択`
    );


    /*
     * ========================================
     * アイコン
     * ========================================
     */

    const icon =
        document.createElement(
            "span"
        );

    icon.className =
        "member-icon-image-wrap";

    if (
        isAll ||
        generation !==
            null
    ) {

        const textIcon =
            document.createElement(
                "span"
            );

        textIcon.className =
            "member-icon-all-symbol";

        textIcon.textContent =
            isAll
                ? "ALL"
                : getGenerationOrdinal(
                    generation
                );

        icon.appendChild(
            textIcon
        );

    } else if (
        fileId
    ) {

        const image =
            document.createElement(
                "img"
            );

        image.className =
            "member-icon-image";

        image.src =
            getImageUrl(
                fileId
            );

        image.alt =
            "";

        image.loading =
            "lazy";

        image.decoding =
            "async";

        image.addEventListener(
            "error",
            () => {

                image.remove();

                const fallback =
                    document.createElement(
                        "span"
                    );

                fallback.className =
                    "member-icon-fallback";

                fallback.textContent =
                    memberName.substring(
                        0,
                        1
                    );

                icon.appendChild(
                    fallback
                );
            },
            {
                once:
                    true
            }
        );

        icon.appendChild(
            image
        );

    } else {

        const fallback =
            document.createElement(
                "span"
            );

        fallback.className =
            "member-icon-fallback";

        fallback.textContent =
            memberName.substring(
                0,
                1
            );

        icon.appendChild(
            fallback
        );
    }


    /*
     * ========================================
     * 名前
     * ========================================
     */

    const name =
        document.createElement(
            "span"
        );

    name.className =
        "member-icon-name";

    name.textContent =
        isAll
            ? "全員"
            : generation !==
                null
                ? `${generation}期生`
                : memberName;


    /*
     * ========================================
     * ボタン構築
     * ========================================
     */

    button.append(
        icon,
        name
    );


    /*
     * ========================================
     * 選択
     * ========================================
     */

    button.addEventListener(
        "click",
        () => {

            if (
                generation !==
                    null
            ) {

                if (
                    selectedGeneration ===
                        generation &&
                    !memberSelect.value
                ) {

                    updateMemberIconSelection();

                    return;
                }

                selectedGeneration =
                    generation;

                memberSelect.value =
                    "";

                changeGeneration(
                    generation
                );

                return;
            }

            if (
                memberSelect.value ===
                    memberKey &&
                selectedGeneration ===
                    null
            ) {

                updateMemberIconSelection();

                return;
            }

            selectedGeneration =
                null;

            memberSelect.value =
                memberKey;

            memberSelect.dispatchEvent(
                new Event(
                    "change",
                    {
                        bubbles:
                            true
                    }
                )
            );
        }
    );

    return button;
}


/*
 * ========================================
 * メンバー横スクロール フェード状態更新
 *
 * 【スマホ】
 * - 横スクロールが必要な場合だけ
 *   右端フェードを表示する
 * - 右端まで到達したらフェードを消す
 * ========================================
 */

function updateMemberIconFadeState() {

    if (
        !memberIconSelector ||
        !memberIconTrack
    ) {
        return;
    }


    const overflow =
        memberIconTrack.scrollWidth >
            memberIconTrack.clientWidth +
            2;


    const atEnd =
        memberIconTrack.scrollLeft +
            memberIconTrack.clientWidth >=
        memberIconTrack.scrollWidth -
            2;


    memberIconSelector.classList.toggle(
        "has-member-overflow",
        overflow
    );

    memberIconSelector.classList.toggle(
        "member-scroll-end",
        !overflow ||
        atEnd
    );
}


/*
 * ========================================
 * メンバーアイコン描画
 * ========================================
 */

async function renderMemberIconSelector(
    requestVersion =
        dataRequestVersion,
    requestGroup =
        currentGroup
) {

    if (
        !memberIconSelector ||
        !memberIconTrack
    ) {
        return;
    }


    /*
     * ========================================
     * 初期化
     * ========================================
     */

    memberIconTrack.innerHTML =
        "";


    /*
     * ========================================
     * メンバー選択
     *
     * 全グループでアイコン表示
     * ========================================
     */

    memberIconSelector.hidden =
        false;

    memberSelect.hidden =
        true;


    /*
     * ========================================
     * 全員
     * ========================================
     */

    memberIconTrack.appendChild(
        createMemberIconButton({
            memberKey:
                "",

            memberName:
                "全員",

            isAll:
                true
        })
    );


    /*
     * ========================================
     * アー写情報
     * ========================================
     */

    const iconMap =
        await loadMemberIconMap(
            requestGroup
        );


    if (
        !isCurrentDataRequest(
            requestVersion
        ) ||
        currentGroup !==
            requestGroup
    ) {

        return;
    }


    /*
     * ========================================
     * ブログ側メンバー順で描画
     *
     * 期が切り替わる位置に
     * 期選択ボタンを挿入する
     * ========================================
     */

    let previousGeneration =
        null;

    members.forEach(
        member => {

            const generation =
                Number.isInteger(
                    member.generation
                )
                    ? member.generation
                    : null;


            /*
             * ========================================
             * 期
             * ========================================
             */

            if (
                generation !==
                    null &&
                generation !==
                    previousGeneration
            ) {

                memberIconTrack.appendChild(
                    createMemberIconButton({
                        memberName:
                            `${generation}期生`,

                        generation:
                            generation
                    })
                );

                previousGeneration =
                    generation;
            }


            /*
             * ========================================
             * メンバー
             * ========================================
             */

            const normalizedName =
                normalizeMemberName(
                    member.name
                );

            const iconData =
                iconMap.get(
                    normalizedName
                );

            memberIconTrack.appendChild(
                createMemberIconButton({
                    memberKey:
                        member.key,

                    memberName:
                        member.name,

                    fileId:
                        iconData?.fileId ||
                        null
                })
            );
        }
    );


    /*
     * ========================================
     * 選択状態反映
     * ========================================
     */

    updateMemberIconSelection();


    /*
     * DOM描画後に横幅を確定させて
     * フェード状態を更新する
     */
    requestAnimationFrame(
        updateMemberIconFadeState
    );
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

                saveGalleryScrollPosition();

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

                saveGalleryScrollPosition();

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
                ) ||
                selectedGeneration !==
                    null,

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

                const requestVersion =
                    createDataRequestVersion();


                calendarYear =
                    year;

                calendarMonth =
                    month;

                selectedDate =
                    null;

                calendar.updateSelectedDateTitle();

                calendar.render();

                await loadCurrentMonthBlogs(
                    requestVersion
                );
            },

        onClearDate:
            async () => {

                await clearSelectedDate();
            }
    });


/*
 * ========================================
 * メンバー横スクロール フェード更新
 * ========================================
 */

if (
    memberIconTrack
) {

    memberIconTrack.addEventListener(
        "scroll",
        updateMemberIconFadeState,
        {
            passive:
                true
        }
    );
}


window.addEventListener(
    "resize",
    () => {

        requestAnimationFrame(
            updateMemberIconFadeState
        );
    }
);


/*
 * ========================================
 * スマホ ページ上部へ戻る
 * ========================================
 */

const SCROLL_TOP_VISIBLE_Y =
    600;


function updateScrollTopButton() {

    scrollTopButton.classList.toggle(
        "visible",
        window.scrollY >=
            SCROLL_TOP_VISIBLE_Y
    );
}


window.addEventListener(
    "scroll",
    updateScrollTopButton,
    {
        passive:
            true
    }
);


scrollTopButton.addEventListener(
    "click",
    () => {

        window.scrollTo({
            top:
                0,

            behavior:
                "smooth"
        });
    }
);


updateScrollTopButton();


/*
 * ========================================
 * 初期化
 * ========================================
 */

async function initialize() {

    updateHero(
        currentGroup
    );


    const requestVersion =
        dataRequestVersion;


    await Promise.all([
        loadMembers(
            requestVersion
        ),
        loadGroupPostDates(
            requestVersion
        )
    ]);
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


    /*
     * ここより前に開始された
     * データ取得を無効化する。
     */
    const requestVersion =
        createDataRequestVersion();


    currentGroup =
        group;


    updateHero(
        currentGroup
    );


    memberSelect.value =
        "";


    selectedGeneration =
        null;


    members =
        [];


    blogs =
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


    await Promise.all([
        loadMembers(
            requestVersion
        ),
        loadGroupPostDates(
            requestVersion
        )
    ]);
}


/*
 * ========================================
 * メンバー一覧取得
 * ========================================
 */

async function loadMembers(
    requestVersion =
        dataRequestVersion
) {

    const requestGroup =
        currentGroup;


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


    members =
        [];


    try {

        const data =
            await fetchMembers(
                requestGroup
            );


        /*
         * 取得中に画面状態が変わっていたら
         * 古い結果を使用しない。
         */
        if (
            !isCurrentDataRequest(
                requestVersion
            ) ||
            currentGroup !==
                requestGroup
        ) {

            return;
        }


        if (
            !Array.isArray(
                data.members
            )
        ) {

            await renderMemberIconSelector(
                requestVersion,
                requestGroup
            );


            return;
        }


        members = [
            ...data.members
        ];


        members.forEach(
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


        await renderMemberIconSelector(
            requestVersion,
            requestGroup
        );

    } catch (
        error
    ) {

        /*
         * 古いリクエストのエラーなら
         * 現在の画面には反映しない。
         */
        if (
            !isCurrentDataRequest(
                requestVersion
            ) ||
            currentGroup !==
                requestGroup
        ) {

            return;
        }


        console.error(
            error
        );


        members =
            [];


        await renderMemberIconSelector(
            requestVersion,
            requestGroup
        );
    }
}


/*
 * ========================================
 * グループ投稿日取得
 * ========================================
 */

async function loadGroupPostDates(
    requestVersion =
        dataRequestVersion
) {

    const requestGroup =
        currentGroup;

    calendarElement.innerHTML =
        "読み込み中...";

    gallery.clear();

    try {

        const data =
            await fetchBlogs({
                group:
                    requestGroup
            });


        if (
            !isCurrentDataRequest(
                requestVersion
            ) ||
            currentGroup !==
                requestGroup
        ) {

            return;
        }

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

        const month =
            getCurrentMonthKey();

        blogs =
            Array.isArray(
                data.blogs
            )
                ? data.blogs.filter(
                    blog => {

                        const date =
                            String(
                                blog.date ||
                                ""
                            ).replace(
                                /-/g,
                                ""
                            );

                        return (
                            month &&
                            date.startsWith(
                                month
                            )
                        );
                    }
                )
                : [];

        updateBlogs();

    } catch (
        error
    ) {

        if (
            !isCurrentDataRequest(
                requestVersion
            ) ||
            currentGroup !==
                requestGroup
        ) {

            return;
        }

        console.error(
            error
        );

        allPostDates =
            [];

        blogs =
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
 * 期変更
 * ========================================
 */

async function changeGeneration(
    generation
) {

    const requestVersion =
        createDataRequestVersion();

    updateMemberIconSelection();

    blogs =
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

    await loadGenerationPostDates(
        generation,
        requestVersion
    );
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

        selectedGeneration =
            null;

        const requestVersion =
            createDataRequestVersion();

        updateMemberIconSelection();

        blogs =
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

            await loadCurrentMonthBlogs(
                requestVersion
            );

            return;
        }

        await loadMemberPostDates(
            member,
            requestVersion
        );
    }
);


/*
 * ========================================
 * 期投稿日取得
 * ========================================
 */

async function loadGenerationPostDates(
    generation,
    requestVersion =
        dataRequestVersion
) {

    const requestGroup =
        currentGroup;


    calendarElement.innerHTML =
        "読み込み中...";

    gallery.clear();

    try {

        const data =
            await fetchBlogs({
                group:
                    requestGroup,

                generation:
                    generation
            });


        if (
            !isCurrentDataRequest(
                requestVersion
            ) ||
            currentGroup !==
                requestGroup ||
            memberSelect.value ||
            selectedGeneration !==
                generation
        ) {

            return;
        }


        memberPostDates =
            Array.isArray(
                data.postDates
            )
                ? data.postDates
                : [];

        selectedDate =
            null;

        setInitialCalendarMonth();

        calendar.updateSelectedDateTitle();

        calendar.render();

        const month =
            getCurrentMonthKey();

        blogs =
            Array.isArray(
                data.blogs
            )
                ? data.blogs.filter(
                    blog => {

                        const date =
                            String(
                                blog.date ||
                                ""
                            ).replace(
                                /-/g,
                                ""
                            );

                        return (
                            month &&
                            date.startsWith(
                                month
                            )
                        );
                    }
                )
                : [];

        updateBlogs();

    } catch (
        error
    ) {

        if (
            !isCurrentDataRequest(
                requestVersion
            ) ||
            currentGroup !==
                requestGroup ||
            memberSelect.value ||
            selectedGeneration !==
                generation
        ) {

            return;
        }


        console.error(
            error
        );

        blogs =
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
 * メンバー投稿日取得
 * ========================================
 */

async function loadMemberPostDates(
    memberKey,
    requestVersion =
        dataRequestVersion
) {

    const requestGroup =
        currentGroup;


    calendarElement.innerHTML =
        "読み込み中...";

    gallery.clear();

    try {

        const data =
            await fetchBlogs({
                group:
                    requestGroup,

                member:
                    memberKey
            });


        if (
            !isCurrentDataRequest(
                requestVersion
            ) ||
            currentGroup !==
                requestGroup ||
            memberSelect.value !==
                memberKey
        ) {

            return;
        }


        memberPostDates =
            Array.isArray(
                data.postDates
            )
                ? data.postDates
                : [];

        selectedDate =
            null;

        setInitialCalendarMonth();

        calendar.updateSelectedDateTitle();

        calendar.render();

        const month =
            getCurrentMonthKey();

        blogs =
            Array.isArray(
                data.blogs
            )
                ? data.blogs.filter(
                    blog => {

                        const date =
                            String(
                                blog.date ||
                                ""
                            ).replace(
                                /-/g,
                                ""
                            );

                        return (
                            month &&
                            date.startsWith(
                                month
                            )
                        );
                    }
                )
                : [];

        updateBlogs();

    } catch (
        error
    ) {

        if (
            !isCurrentDataRequest(
                requestVersion
            ) ||
            currentGroup !==
                requestGroup ||
            memberSelect.value !==
                memberKey
        ) {

            return;
        }


        console.error(
            error
        );

        blogs =
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

async function loadCurrentMonthBlogs(
    requestVersion =
        dataRequestVersion
) {

    const requestGroup =
        currentGroup;

    const requestMember =
        memberSelect.value ||
        null;

    const requestGeneration =
        selectedGeneration;

    const month =
        getCurrentMonthKey();

    if (
        !month
    ) {

        blogs =
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
                    requestGroup,

                member:
                    requestMember,

                generation:
                    requestGeneration,

                month:
                    month
            });


        if (
            !isCurrentDataRequest(
                requestVersion
            ) ||
            currentGroup !==
                requestGroup ||
            (
                memberSelect.value ||
                null
            ) !==
                requestMember ||
            selectedGeneration !==
                requestGeneration
        ) {

            return;
        }


        blogs =
            Array.isArray(
                data.blogs
            )
                ? data.blogs
                : [];

        updateBlogs();

    } catch (
        error
    ) {

        if (
            !isCurrentDataRequest(
                requestVersion
            ) ||
            currentGroup !==
                requestGroup ||
            (
                memberSelect.value ||
                null
            ) !==
                requestMember ||
            selectedGeneration !==
                requestGeneration
        ) {

            return;
        }


        console.error(
            error
        );

        blogs =
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
    dateKey,
    requestVersion =
        dataRequestVersion
) {

    const requestGroup =
        currentGroup;

    const requestMember =
        memberSelect.value ||
        null;

    const requestGeneration =
        selectedGeneration;


    galleryElement.textContent =
        "読み込み中...";

    try {

        const data =
            await fetchBlogs({
                group:
                    requestGroup,

                member:
                    requestMember,

                generation:
                    requestGeneration,

                date:
                    dateKey
            });


        if (
            !isCurrentDataRequest(
                requestVersion
            ) ||
            currentGroup !==
                requestGroup ||
            (
                memberSelect.value ||
                null
            ) !==
                requestMember ||
            selectedGeneration !==
                requestGeneration ||
            selectedDate !==
                dateKey
        ) {

            return;
        }


        blogs =
            Array.isArray(
                data.blogs
            )
                ? data.blogs
                : [];

        updateBlogs();

    } catch (
        error
    ) {

        if (
            !isCurrentDataRequest(
                requestVersion
            ) ||
            currentGroup !==
                requestGroup ||
            (
                memberSelect.value ||
                null
            ) !==
                requestMember ||
            selectedGeneration !==
                requestGeneration ||
            selectedDate !==
                dateKey
        ) {

            return;
        }


        console.error(
            error
        );

        blogs =
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
        memberSelect.value ||
        selectedGeneration !==
            null
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


    const requestVersion =
        createDataRequestVersion();


    selectedDate =
        dateKey;

    calendar.updateSelectedDateTitle();

    calendar.render();

    await loadBlogsByDate(
        dateKey,
        requestVersion
    );
}


/*
 * ========================================
 * 日付選択解除
 * ========================================
 */

async function clearSelectedDate() {

    const requestVersion =
        createDataRequestVersion();


    selectedDate =
        null;

    calendar.updateSelectedDateTitle();

    calendar.render();

    await loadCurrentMonthBlogs(
        requestVersion
    );
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

    gallery.render(
        blogs,
        Boolean(
            memberSelect.value
        ) ||
        selectedGeneration !==
            null,
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

function showGalleryView(
    scrollPosition =
        galleryScrollPosition
) {

    blogDetailController.hide();

    blogImagesController.hide();

    galleryView.hidden =
        false;

    const restoreScrollPosition =
        Number.isFinite(
            scrollPosition
        )
            ? scrollPosition
            : galleryScrollPosition;

    galleryScrollPosition =
        restoreScrollPosition;

    requestAnimationFrame(
        () => {

            requestAnimationFrame(
                () => {

                    window.scrollTo({
                        top:
                            restoreScrollPosition,

                        behavior:
                            "auto"
                    });
                }
            );
        }
    );
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
    event => {

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

        const scrollPosition =
            Number.isFinite(
                event.state?.scrollY
            )
                ? event.state.scrollY
                : galleryScrollPosition;

        showGalleryView(
            scrollPosition
        );
    }
);


/*
 * ========================================
 * スマホ / タブレット縦 検索条件UI
 *
 * UIと条件保持のみ。
 * 実際のブログ検索処理は次工程で実装する。
 * ========================================
 */

const openSearchFiltersButton =
    document.getElementById(
        "openSearchFiltersButton"
    );

const searchFilterBackdrop =
    document.getElementById(
        "searchFilterBackdrop"
    );

const searchFilterSheet =
    document.getElementById(
        "searchFilterSheet"
    );

const closeSearchFiltersButton =
    document.getElementById(
        "closeSearchFiltersButton"
    );

const searchStartDateButton =
    document.getElementById(
        "searchStartDateButton"
    );

const desktopSearchStartDateButton = document.getElementById("desktopSearchStartDateButton");
const desktopSearchEndDateButton = document.getElementById("desktopSearchEndDateButton");
const desktopSearchStartDateValue = document.getElementById("desktopSearchStartDateValue");
const desktopSearchEndDateValue = document.getElementById("desktopSearchEndDateValue");
const desktopSearchMemberValue = document.getElementById("desktopSearchMemberValue");
const desktopSearchKeywordInput = document.getElementById("desktopSearchKeywordInput");
const desktopExecuteSearchButton = document.getElementById("desktopExecuteSearchButton");
const desktopClearSearchButton = document.getElementById("desktopClearSearchButton");

const searchEndDateButton =
    document.getElementById(
        "searchEndDateButton"
    );

const searchStartDateValue =
    document.getElementById(
        "searchStartDateValue"
    );

const searchEndDateValue =
    document.getElementById(
        "searchEndDateValue"
    );

const searchMemberValue =
    document.getElementById(
        "searchMemberValue"
    );

const searchKeywordToggleButton =
    document.getElementById(
        "searchKeywordToggleButton"
    );

const searchKeywordArea =
    document.getElementById(
        "searchKeywordArea"
    );

const searchKeywordInput =
    document.getElementById(
        "searchKeywordInput"
    );

const searchKeywordValue =
    document.getElementById(
        "searchKeywordValue"
    );

const clearSearchFiltersButton =
    document.getElementById(
        "clearSearchFiltersButton"
    );

const executeSearchButton =
    document.getElementById(
        "executeSearchButton"
    );

const searchDatePickerBackdrop =
    document.getElementById(
        "searchDatePickerBackdrop"
    );

const searchDatePicker =
    document.getElementById(
        "searchDatePicker"
    );

const searchDatePickerTitle =
    document.getElementById(
        "searchDatePickerTitle"
    );

const closeSearchDatePickerButton =
    document.getElementById(
        "closeSearchDatePickerButton"
    );

const searchDateFirstMonth =
    document.getElementById(
        "searchDateFirstMonth"
    );

const searchDatePrevMonth =
    document.getElementById(
        "searchDatePrevMonth"
    );

const searchDateNextMonth =
    document.getElementById(
        "searchDateNextMonth"
    );

const searchDateLastMonth =
    document.getElementById(
        "searchDateLastMonth"
    );

const searchDateMonthTitle =
    document.getElementById(
        "searchDateMonthTitle"
    );

const searchDateMonthPicker =
    document.getElementById(
        "searchDateMonthPicker"
    );

const searchDateMonthPickerPrevYear =
    document.getElementById(
        "searchDateMonthPickerPrevYear"
    );

const searchDateMonthPickerNextYear =
    document.getElementById(
        "searchDateMonthPickerNextYear"
    );

const searchDateMonthPickerYear =
    document.getElementById(
        "searchDateMonthPickerYear"
    );

const searchDateMonthPickerGrid =
    document.getElementById(
        "searchDateMonthPickerGrid"
    );

const searchDateGrid =
    document.getElementById(
        "searchDateGrid"
    );

const unsetSearchDateButton =
    document.getElementById(
        "unsetSearchDateButton"
    );

const confirmSearchDateButton =
    document.getElementById(
        "confirmSearchDateButton"
    );


let searchStartDate = null;
let searchEndDate = null;
let searchDateTarget = null;
let searchDateDraft = null;
let searchPickerYear = null;
let searchPickerMonth = null;
let searchMonthPickerYear = null;
let isSearchMonthPickerOpen = false;


function formatSearchDate(
    date
) {
    if (!date) {
        return "未選択";
    }

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}/${month}/${day}`;
}


function getCurrentSearchMemberLabel() {
    if (
        selectedGeneration !== null
    ) {
        return `${selectedGeneration}期生`;
    }

    if (
        memberSelect.value
    ) {
        const option =
            memberSelect.options[
                memberSelect.selectedIndex
            ];

        return option?.textContent?.trim() ||
            memberSelect.value;
    }

    return "ALL";
}


function updateSearchFilterUi() {
    if (
        searchStartDateValue
    ) {
        searchStartDateValue.textContent =
            formatSearchDate(
                searchStartDate
            );

        searchStartDateValue.classList.toggle(
            "is-set",
            Boolean(searchStartDate)
        );
    }

    if (
        searchEndDateValue
    ) {
        searchEndDateValue.textContent =
            formatSearchDate(
                searchEndDate
            );

        searchEndDateValue.classList.toggle(
            "is-set",
            Boolean(searchEndDate)
        );
    }

    if (
        searchMemberValue
    ) {
        searchMemberValue.textContent =
            getCurrentSearchMemberLabel();
    }

    const memberLabel = getCurrentSearchMemberLabel();
    if (desktopSearchMemberValue) desktopSearchMemberValue.textContent = memberLabel;
    if (desktopSearchStartDateValue) {
        desktopSearchStartDateValue.textContent = formatSearchDate(searchStartDate);
        desktopSearchStartDateValue.classList.toggle("is-set", Boolean(searchStartDate));
    }
    if (desktopSearchEndDateValue) {
        desktopSearchEndDateValue.textContent = formatSearchDate(searchEndDate);
        desktopSearchEndDateValue.classList.toggle("is-set", Boolean(searchEndDate));
    }

    if (
        searchKeywordValue &&
        searchKeywordInput
    ) {
        const keyword =
            searchKeywordInput.value.trim();

        searchKeywordValue.textContent =
            keyword || "未設定";

        searchKeywordValue.classList.toggle(
            "is-set",
            Boolean(keyword)
        );
    }
}


function setSearchFilterSheetOpen(
    open
) {
    if (
        !searchFilterSheet ||
        !searchFilterBackdrop
    ) {
        return;
    }

    if (
        open
    ) {
        updateSearchFilterUi();

        searchFilterSheet.hidden = false;
        searchFilterBackdrop.hidden = false;
        document.body.classList.add(
            "search-filter-lock"
        );

        requestAnimationFrame(
            () => {
                searchFilterSheet.classList.add(
                    "is-open"
                );
                searchFilterBackdrop.classList.add(
                    "is-open"
                );
            }
        );

        return;
    }

    searchFilterSheet.classList.remove(
        "is-open"
    );
    searchFilterBackdrop.classList.remove(
        "is-open"
    );

    window.setTimeout(
        () => {
            searchFilterSheet.hidden = true;
            searchFilterBackdrop.hidden = true;
            document.body.classList.remove(
                "search-filter-lock"
            );
        },
        240
    );
}


function positionSearchDatePickerForViewport() {
    if (!searchDatePicker) {
        return;
    }

    const isDesktopLayout =
        window.matchMedia("(min-width: 1024px)").matches;

    searchDatePicker.classList.toggle(
        "is-desktop-calendar-overlay",
        isDesktopLayout
    );

    if (!isDesktopLayout) {
        searchDatePicker.style.removeProperty(
            "--search-date-picker-left"
        );
        searchDatePicker.style.removeProperty(
            "--search-date-picker-top"
        );
        searchDatePicker.style.removeProperty(
            "--search-date-picker-width"
        );
        return;
    }

    const mainCalendar =
        document.getElementById("calendar");

    if (!mainCalendar) {
        return;
    }

    const rect =
        mainCalendar.getBoundingClientRect();

    // PC / タブレット横では、検索用カレンダーを
    // 左列の本体カレンダーの上に重ねて表示する。
    // 幅は日付操作に必要な広さを確保しつつ、
    // 本体カレンダーの中央を基準に配置する。
    const overlayWidth = Math.min(
        380,
        Math.max(320, window.innerWidth - 32)
    );
    const calendarCenter =
        rect.left + rect.width / 2;
    const halfWidth = overlayWidth / 2;
    const overlayCenter = Math.min(
        window.innerWidth - halfWidth - 16,
        Math.max(halfWidth + 16, calendarCenter)
    );

    searchDatePicker.style.setProperty(
        "--search-date-picker-left",
        `${Math.round(overlayCenter)}px`
    );
    searchDatePicker.style.setProperty(
        "--search-date-picker-top",
        `${Math.round(rect.top)}px`
    );
    searchDatePicker.style.setProperty(
        "--search-date-picker-width",
        `${Math.round(overlayWidth)}px`
    );
}


function updateSearchMonthPickerArrow() {
    if (
        !searchDatePicker ||
        !searchDateMonthPicker ||
        !searchDateMonthTitle ||
        searchDateMonthPicker.hidden
    ) {
        return;
    }

    requestAnimationFrame(
        () => {
            if (searchDateMonthPicker.hidden) {
                return;
            }

            const pickerRect =
                searchDateMonthPicker.getBoundingClientRect();
            const titleRect =
                searchDateMonthTitle.getBoundingClientRect();
            const datePickerRect =
                searchDatePicker.getBoundingClientRect();
            const titleCenter =
                titleRect.left + titleRect.width / 2;
            const arrowLeft =
                titleCenter - pickerRect.left;

            // 本体カレンダーと同じく、吹き出しの先端が
            // 年月ボタンの直下を指す高さにする。
            // 固定 top 値ではなく実際の年月ボタン位置から算出するため、
            // スマホ / タブレット / PC で同じ位置関係になる。
            const monthNav =
                searchDateMonthTitle.closest(
                    ".search-date-picker-month-nav"
                );
            const monthNavRect = monthNav
                ? monthNav.getBoundingClientRect()
                : titleRect;

            // 年月ジャンプの吹き出しは、年月ナビ行の直下に置く。
            // 三角の先端が「YYYY年M月」ボタンの高さを指すよう、
            // タイトル単体ではなくナビ行全体の下端を基準にする。
            // 本体カレンダーと同じく、年月ナビのすぐ下に
            // パネル上端を置く。::before の先端が年月ボタン下端を指す。
            const pickerTop =
                monthNavRect.bottom - datePickerRect.top + 8;

            searchDateMonthPicker.style.setProperty(
                "--search-month-arrow-left",
                `${arrowLeft}px`
            );
            searchDateMonthPicker.style.setProperty(
                "--search-month-picker-top",
                `${Math.round(pickerTop)}px`
            );
        }
    );
}


function setSearchDatePickerOpen(
    open,
    target = null
) {
    if (
        !searchDatePicker ||
        !searchDatePickerBackdrop
    ) {
        return;
    }

    if (
        open
    ) {
        searchDateTarget = target;

        const currentValue =
            target === "end"
                ? searchEndDate
                : searchStartDate;

        const baseDate =
            currentValue ||
            new Date();

        searchDateDraft =
            currentValue
                ? new Date(
                    currentValue.getFullYear(),
                    currentValue.getMonth(),
                    currentValue.getDate()
                )
                : null;

        searchPickerYear =
            baseDate.getFullYear();
        searchPickerMonth =
            baseDate.getMonth();
        searchMonthPickerYear =
            searchPickerYear;
        isSearchMonthPickerOpen = false;

        searchDatePickerTitle.textContent =
            target === "end"
                ? "終了日を選択"
                : "開始日を選択";

        renderSearchDatePicker();
        positionSearchDatePickerForViewport();

        searchDatePicker.hidden = false;
        searchDatePickerBackdrop.hidden = false;

        requestAnimationFrame(
            () => {
                searchDatePicker.classList.add(
                    "is-open"
                );
                searchDatePickerBackdrop.classList.add(
                    "is-open"
                );
            }
        );

        return;
    }

    isSearchMonthPickerOpen = false;
    searchDateMonthPicker?.setAttribute(
        "hidden",
        ""
    );
    searchDateMonthTitle?.setAttribute(
        "aria-expanded",
        "false"
    );

    searchDatePicker.classList.remove(
        "is-open"
    );
    searchDatePickerBackdrop.classList.remove(
        "is-open"
    );

    window.setTimeout(
        () => {
            searchDatePicker.hidden = true;
            searchDatePickerBackdrop.hidden = true;
        },
        180
    );
}


function getSearchPostMonths() {
    const months = new Set();

    getPostDates().forEach(
        (dateKey) => {
            if (/^\d{8}$/.test(dateKey)) {
                months.add(
                    dateKey.substring(0, 6)
                );
            }
        }
    );

    return Array.from(months).sort();
}


function getSearchPostYears() {
    return [
        ...new Set(
            getSearchPostMonths().map(
                (monthKey) =>
                    Number(
                        monthKey.substring(0, 4)
                    )
            )
        )
    ].sort((a, b) => a - b);
}


function getSearchCurrentMonthKey() {
    return (
        String(searchPickerYear) +
        String(searchPickerMonth + 1).padStart(2, "0")
    );
}


function moveSearchPickerToMonthKey(monthKey) {
    if (!monthKey) {
        return;
    }

    searchPickerYear =
        Number(monthKey.substring(0, 4));
    searchPickerMonth =
        Number(monthKey.substring(4, 6)) - 1;
    searchMonthPickerYear =
        searchPickerYear;
    isSearchMonthPickerOpen = false;

    renderSearchDatePicker();
}


function jumpSearchPickerToEdge(position) {
    const months = getSearchPostMonths();

    if (months.length === 0) {
        return;
    }

    moveSearchPickerToMonthKey(
        position === "first"
            ? months[0]
            : months[months.length - 1]
    );
}


function changeSearchPickerPostMonth(amount) {
    const months = getSearchPostMonths();
    const index = months.indexOf(
        getSearchCurrentMonthKey()
    );

    if (index === -1) {
        return;
    }

    const nextIndex = index + amount;

    if (
        nextIndex < 0 ||
        nextIndex >= months.length
    ) {
        return;
    }

    moveSearchPickerToMonthKey(
        months[nextIndex]
    );
}


function toggleSearchMonthPicker() {
    isSearchMonthPickerOpen =
        !isSearchMonthPickerOpen;

    if (isSearchMonthPickerOpen) {
        searchMonthPickerYear =
            searchPickerYear;
    }

    renderSearchDatePicker();
}


function changeSearchMonthPickerYear(direction) {
    const years = getSearchPostYears();
    const index = years.indexOf(
        searchMonthPickerYear
    );

    if (index === -1) {
        return;
    }

    const nextIndex = index + direction;

    if (
        nextIndex < 0 ||
        nextIndex >= years.length
    ) {
        return;
    }

    searchMonthPickerYear =
        years[nextIndex];
    renderSearchMonthPicker();
    updateSearchMonthPickerArrow();
}


function renderSearchMonthPicker() {
    if (
        !searchDateMonthPicker ||
        !searchDateMonthPickerGrid ||
        !searchDateMonthPickerYear
    ) {
        return;
    }

    searchDateMonthPicker.hidden =
        !isSearchMonthPickerOpen;
    searchDateMonthTitle?.setAttribute(
        "aria-expanded",
        String(isSearchMonthPickerOpen)
    );

    if (!isSearchMonthPickerOpen) {
        return;
    }

    const months = getSearchPostMonths();
    const years = getSearchPostYears();

    searchDateMonthPickerYear.textContent =
        `${searchMonthPickerYear}年`;
    searchDateMonthPickerGrid.innerHTML = "";

    const yearIndex = years.indexOf(
        searchMonthPickerYear
    );

    if (searchDateMonthPickerPrevYear) {
        searchDateMonthPickerPrevYear.disabled =
            yearIndex <= 0;
    }

    if (searchDateMonthPickerNextYear) {
        searchDateMonthPickerNextYear.disabled =
            yearIndex === -1 ||
            yearIndex >= years.length - 1;
    }

    for (let month = 1; month <= 12; month += 1) {
        const monthKey =
            String(searchMonthPickerYear) +
            String(month).padStart(2, "0");
        const button =
            document.createElement("button");

        button.type = "button";
        button.className =
            "ui-text-button calendar-month-picker-month search-date-month-picker-month";
        button.textContent =
            `${month}月`;

        if (!months.includes(monthKey)) {
            button.disabled = true;
            button.classList.add("unavailable");
        }

        if (monthKey === getSearchCurrentMonthKey()) {
            button.classList.add("current");
        }

        button.addEventListener(
            "click",
            () => {
                moveSearchPickerToMonthKey(
                    monthKey
                );
            }
        );

        searchDateMonthPickerGrid.appendChild(
            button
        );
    }
}


function renderSearchDatePicker() {
    if (
        !searchDateGrid ||
        searchPickerYear === null ||
        searchPickerMonth === null
    ) {
        return;
    }

    searchDateMonthTitle.textContent =
        `${searchPickerYear}年${searchPickerMonth + 1}月`;

    const searchPostMonths =
        getSearchPostMonths();
    const currentMonthIndex =
        searchPostMonths.indexOf(
            getSearchCurrentMonthKey()
        );

    if (searchDateFirstMonth) {
        searchDateFirstMonth.disabled =
            currentMonthIndex <= 0;
    }
    if (searchDatePrevMonth) {
        searchDatePrevMonth.disabled =
            currentMonthIndex <= 0;
    }
    if (searchDateNextMonth) {
        searchDateNextMonth.disabled =
            currentMonthIndex === -1 ||
            currentMonthIndex >= searchPostMonths.length - 1;
    }
    if (searchDateLastMonth) {
        searchDateLastMonth.disabled =
            currentMonthIndex === -1 ||
            currentMonthIndex >= searchPostMonths.length - 1;
    }

    renderSearchMonthPicker();

    // 年月ジャンプを開いた直後にも、実際の年月ナビ行を基準に
    // ポップアップ位置を再計算する。
    // hidden解除後のレイアウト確定を待つため requestAnimationFrame 内で実行。
    if (isSearchMonthPickerOpen) {
        updateSearchMonthPickerArrow();
    }

    searchDateGrid.innerHTML = "";

    const firstDay =
        new Date(
            searchPickerYear,
            searchPickerMonth,
            1
        ).getDay();

    const daysInMonth =
        new Date(
            searchPickerYear,
            searchPickerMonth + 1,
            0
        ).getDate();

    for (
        let i = 0;
        i < firstDay;
        i += 1
    ) {
        const spacer =
            document.createElement("span");
        spacer.className =
            "search-date-day is-disabled";
        searchDateGrid.appendChild(
            spacer
        );
    }

    for (
        let day = 1;
        day <= daysInMonth;
        day += 1
    ) {
        const button =
            document.createElement("button");

        button.type = "button";
        button.className =
            "search-date-day";
        button.textContent =
            String(day);

        const date =
            new Date(
                searchPickerYear,
                searchPickerMonth,
                day
            );

        if (
            searchDateDraft &&
            date.getFullYear() === searchDateDraft.getFullYear() &&
            date.getMonth() === searchDateDraft.getMonth() &&
            date.getDate() === searchDateDraft.getDate()
        ) {
            button.classList.add(
                "is-selected"
            );
        }

        button.addEventListener(
            "click",
            () => {
                searchDateDraft = date;
                renderSearchDatePicker();
            }
        );

        searchDateGrid.appendChild(
            button
        );
    }

    /*
     * どの月も6週（42マス）固定にする。
     * 5週で収まる月にも空マスを補い、検索カレンダーの高さと
     * 月移動ナビの表示位置が月ごとに動かないようにする。
     */
    const renderedCellCount =
        firstDay + daysInMonth;

    for (
        let i = renderedCellCount;
        i < 42;
        i += 1
    ) {
        const spacer =
            document.createElement("span");
        spacer.className =
            "search-date-day is-disabled";
        searchDateGrid.appendChild(
            spacer
        );
    }
}


function changeSearchPickerMonth(
    amount
) {
    changeSearchPickerPostMonth(amount);
}


function installSearchDatePickerNavIcons() {
    const iconTargets = [
        [searchDateFirstMonth, "chevronsLeft", 18],
        [searchDatePrevMonth, "chevronLeft", 20],
        [searchDateNextMonth, "chevronRight", 20],
        [searchDateLastMonth, "chevronsRight", 18],
        [searchDateMonthPickerPrevYear, "chevronLeft", 20],
        [searchDateMonthPickerNextYear, "chevronRight", 20]
    ];

    iconTargets.forEach(
        ([button, iconName, size]) => {
            if (!button) {
                return;
            }

            button.replaceChildren(
                createUiIcon(
                    iconName,
                    { size }
                )
            );
        }
    );
}


function installSearchFilterIcons() {
    document.querySelectorAll(
        '[data-search-icon="calendar"]'
    ).forEach(
        (element) => {
            element.replaceChildren(
                createUiIcon(
                    "calendar",
                    { size: 20 }
                )
            );
        }
    );

    document.querySelectorAll(
        '[data-search-icon="users"]'
    ).forEach(
        (element) => {
            element.replaceChildren(
                createUiIcon(
                    "users",
                    { size: 20 }
                )
            );
        }
    );
}


installSearchFilterIcons();
installSearchDatePickerNavIcons();
updateSearchFilterUi();


openSearchFiltersButton?.addEventListener(
    "click",
    () => {
        setSearchFilterSheetOpen(true);
    }
);

closeSearchFiltersButton?.addEventListener(
    "click",
    () => {
        setSearchFilterSheetOpen(false);
    }
);

searchFilterBackdrop?.addEventListener(
    "click",
    () => {
        setSearchFilterSheetOpen(false);
    }
);

searchStartDateButton?.addEventListener(
    "click",
    () => {
        setSearchDatePickerOpen(
            true,
            "start"
        );
    }
);

desktopSearchStartDateButton?.addEventListener("click", () => setSearchDatePickerOpen(true, "start"));
desktopSearchEndDateButton?.addEventListener("click", () => setSearchDatePickerOpen(true, "end"));

searchEndDateButton?.addEventListener(
    "click",
    () => {
        setSearchDatePickerOpen(
            true,
            "end"
        );
    }
);

closeSearchDatePickerButton?.addEventListener(
    "click",
    () => {
        setSearchDatePickerOpen(false);
    }
);

searchDatePickerBackdrop?.addEventListener(
    "click",
    () => {
        setSearchDatePickerOpen(false);
    }
);

searchDateFirstMonth?.addEventListener(
    "click",
    () => {
        jumpSearchPickerToEdge("first");
    }
);

searchDatePrevMonth?.addEventListener(
    "click",
    () => {
        changeSearchPickerMonth(-1);
    }
);

searchDateMonthTitle?.addEventListener(
    "click",
    toggleSearchMonthPicker
);

window.addEventListener(
    "resize",
    () => {
        if (
            searchDatePicker &&
            !searchDatePicker.hidden
        ) {
            positionSearchDatePickerForViewport();
            updateSearchMonthPickerArrow();
        }
    }
);

searchDateNextMonth?.addEventListener(
    "click",
    () => {
        changeSearchPickerMonth(1);
    }
);

searchDateLastMonth?.addEventListener(
    "click",
    () => {
        jumpSearchPickerToEdge("last");
    }
);

searchDateMonthPickerPrevYear?.addEventListener(
    "click",
    () => {
        changeSearchMonthPickerYear(-1);
    }
);

searchDateMonthPickerNextYear?.addEventListener(
    "click",
    () => {
        changeSearchMonthPickerYear(1);
    }
);

unsetSearchDateButton?.addEventListener(
    "click",
    () => {
        searchDateDraft = null;

        if (
            searchDateTarget === "end"
        ) {
            searchEndDate = null;
        } else {
            searchStartDate = null;
        }

        updateSearchFilterUi();
        setSearchDatePickerOpen(false);
    }
);

confirmSearchDateButton?.addEventListener(
    "click",
    () => {
        if (
            searchDateTarget === "end"
        ) {
            searchEndDate =
                searchDateDraft;
        } else {
            searchStartDate =
                searchDateDraft;
        }

        updateSearchFilterUi();
        setSearchDatePickerOpen(false);
    }
);

searchKeywordToggleButton?.addEventListener(
    "click",
    () => {
        const willOpen =
            searchKeywordArea.hidden;

        searchKeywordArea.hidden =
            !willOpen;

        searchKeywordToggleButton.setAttribute(
            "aria-expanded",
            String(willOpen)
        );

        if (
            willOpen
        ) {
            window.setTimeout(
                () => {
                    searchKeywordInput?.focus();
                },
                0
            );
        }
    }
);

searchKeywordInput?.addEventListener(
    "input",
    updateSearchFilterUi
);

clearSearchFiltersButton?.addEventListener(
    "click",
    () => {
        searchStartDate = null;
        searchEndDate = null;

        if (
            searchKeywordInput
        ) {
            searchKeywordInput.value = "";
        }

        if (
            searchKeywordArea
        ) {
            searchKeywordArea.hidden = true;
        }

        searchKeywordToggleButton?.setAttribute(
            "aria-expanded",
            "false"
        );

        updateSearchFilterUi();
    }
);

desktopSearchKeywordInput?.addEventListener("input", () => {
    if (searchKeywordInput) searchKeywordInput.value = desktopSearchKeywordInput.value;
    updateSearchFilterUi();
});

desktopClearSearchButton?.addEventListener("click", () => {
    searchStartDate = null;
    searchEndDate = null;
    if (desktopSearchKeywordInput) desktopSearchKeywordInput.value = "";
    if (searchKeywordInput) searchKeywordInput.value = "";
    updateSearchFilterUi();
});

function createSearchApiDate(date) {
    if (!date) {
        return null;
    }

    return (
        String(date.getFullYear()) +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getDate()).padStart(2, "0")
    );
}


async function executeBlogSearch({
    keywordSource = "mobile"
} = {}) {
    const requestGroup = currentGroup;
    const requestMember = memberSelect.value || null;

    if (
        searchStartDate &&
        searchEndDate &&
        searchStartDate.getTime() > searchEndDate.getTime()
    ) {
        galleryElement.textContent =
            "開始日は終了日以前の日付を指定してください。";
        return;
    }

    let keyword = "";

    if (keywordSource === "desktop") {
        keyword = desktopSearchKeywordInput?.value.trim() || "";
        if (searchKeywordInput) {
            searchKeywordInput.value = keyword;
        }
    } else {
        keyword = searchKeywordInput?.value.trim() || "";
        if (desktopSearchKeywordInput) {
            desktopSearchKeywordInput.value = keyword;
        }
    }

    updateSearchFilterUi();

    /*
     * スマホ／タブレット縦向きでは、検索実行と同時に
     * 検索条件シートを閉じて検索結果の一覧へ戻す。
     * PCの検索条件欄には影響させない。
     */
    if (keywordSource === "mobile") {
        setSearchFilterSheetOpen(false);
    }

    galleryElement.textContent = "検索中...";

    try {
        const data = await fetchBlogSearch({
            group: requestGroup,
            member: requestMember,
            generation: selectedGeneration,
            startDate: createSearchApiDate(searchStartDate),
            endDate: createSearchApiDate(searchEndDate),
            keyword: keyword || null,
            sort: sortSelect.value
        });

        if (
            currentGroup !== requestGroup ||
            (memberSelect.value || null) !== requestMember
        ) {
            return;
        }

        blogs = Array.isArray(data.blogs) ? data.blogs : [];
        selectedDate = null;

        /*
         * 検索結果表示中は、通常一覧の「YYYY年M月のブログ」ではなく
         * 検索中であることが分かる見出しへ切り替える。
         * 通常一覧へ戻った場合は calendar.updateSelectedDateTitle() により
         * 元の年月 / 日付見出しへ戻る。
         */
        selectedDateTitle.textContent =
            `検索結果 ${blogs.length}件`;

        selectedDateTitle.classList.add(
            "visible"
        );

        updateBlogs();

        if (blogs.length === 0) {
            galleryElement.textContent = "検索条件に一致するブログはありません。";
            lightbox.setImages([]);
        }

    } catch (error) {
        console.error(error);
        blogs = [];
        lightbox.setImages([]);
        galleryElement.textContent =
            error?.message || "ブログ検索に失敗しました。";
    }
}


desktopExecuteSearchButton?.addEventListener("click", async () => {
    await executeBlogSearch({
        keywordSource: "desktop"
    });
});

executeSearchButton?.addEventListener(
    "click",
    async () => {
        await executeBlogSearch({
            keywordSource: "mobile"
        });
    }
);

/*
 * メンバー選択が変わった後に検索条件表示も追従させる。
 */
memberSelect.addEventListener(
    "change",
    updateSearchFilterUi
);

memberIconTrack?.addEventListener(
    "click",
    () => {
        requestAnimationFrame(
            updateSearchFilterUi
        );
    }
);
