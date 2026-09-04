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
    onOpen
}) {


    /*
     * ========================================
     * 状態
     * ========================================
     */

    let currentBlogDetail =
        null;


    /*
     * ========================================
     * 詳細取得
     * ========================================
     */

    async function open({
        articleId,
        memberKey,
        group
    }) {

        if (
            !memberKey
        ) {

            console.error(
                "ブログのメンバーを特定できません。"
            );

            return;
        }

        if (
            !group
        ) {

            console.error(
                "ブログのグループを特定できません。"
            );

            return;
        }

        try {

            const blogData =
                await fetchBlogDetail({
                    group:
                        group,

                    member:
                        memberKey,

                    articleId:
                        articleId
                });

            currentBlogDetail =
                blogData;

            render(
                blogData
            );

            show();

            if (
                typeof onOpen ===
                    "function"
            ) {

                onOpen(
                    blogData
                );
            }

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
                ? String(
                    blogData.date
                ).replace(
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
                        "ブログ画像";

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
    }


    /*
     * ========================================
     * 詳細画面表示
     * ========================================
     */

    function show() {

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
     * 詳細画面非表示
     * ========================================
     */

    function hide() {

        blogDetailView.hidden =
            true;
    }


    /*
     * ========================================
     * 現在の詳細を再表示
     * ========================================
     */

    function showCurrent() {

        if (
            !currentBlogDetail
        ) {

            return false;
        }

        render(
            currentBlogDetail
        );

        show();

        return true;
    }


    /*
     * ========================================
     * 現在のブログ取得
     * ========================================
     */

    function getCurrent() {

        return currentBlogDetail;
    }


    /*
     * ========================================
     * 公開メソッド
     * ========================================
     */

    return {
        open:
            open,

        show:
            show,

        hide:
            hide,

        showCurrent:
            showCurrent,

        getCurrent:
            getCurrent
    };
}
