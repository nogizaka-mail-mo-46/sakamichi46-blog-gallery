import {
    fetchBlogDetail
} from "./api.js";


/*
 * ========================================
 * ブログ詳細
 * ========================================
 */

export function createBlogDetail({
    galleryView,
    blogDetailView,
    blogDetail,
    blogDetailBackButton,
    getGroup,
    getSelectedMember
}) {


    /*
     * ========================================
     * 状態
     * ========================================
     */

    let galleryScrollPosition =
        0;

    let currentBlogDetail =
        null;


    /*
     * ========================================
     * 詳細取得
     * ========================================
     */

    async function open({
        articleId,
        memberKey
    }) {

        const group =
            getGroup();

        const targetMemberKey =
            memberKey ||
            getSelectedMember();

        if (
            !targetMemberKey
        ) {

            console.error(
                "ブログのメンバーを特定できません。"
            );

            return;
        }

        try {

            const blogData =
                await fetchBlogDetail({
                    group:
                        group,

                    member:
                        targetMemberKey,

                    articleId:
                        articleId
                });

            render(
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
     * 詳細描画
     * ========================================
     */

    function render(
        blogData
    ) {

        blogDetail.innerHTML =
            "";


        /*
         * ========================================
         * ヘッダー
         * ========================================
         */

        const header =
            document.createElement(
                "header"
            );

        header.className =
            "blog-detail-header";


        /*
         * ========================================
         * タイトル
         * ========================================
         */

        const title =
            document.createElement(
                "h2"
            );

        title.className =
            "blog-detail-title";

        title.textContent =
            blogData.title ||
            "（無題）";


        /*
         * ========================================
         * 日付・メンバー
         * ========================================
         */

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


                /*
                 * ========================================
                 * テキスト
                 * ========================================
                 */

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


                /*
                 * ========================================
                 * 画像
                 * ========================================
                 */

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


    /*
     * ========================================
     * ギャラリーへ戻る
     * ========================================
     */

    function showGallery() {

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


    /*
     * ========================================
     * 詳細画面再表示
     * ========================================
     */

    function showCurrentDetail() {

        if (
            !currentBlogDetail
        ) {
            return;
        }

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

                showCurrentDetail();

                return;
            }

            showGallery();
        }
    );


    /*
     * ========================================
     * 公開メソッド
     * ========================================
     */

    return {
        open:
            open,

        showGallery:
            showGallery,

        showCurrentDetail:
            showCurrentDetail
    };
}
