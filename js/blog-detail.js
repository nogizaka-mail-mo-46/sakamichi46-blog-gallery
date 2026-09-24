import {
    fetchBlogDetail
} from "./api.js";

import {
    getImageUrl
} from "./image-url.js";


/*
 * ========================================
 * ブログ詳細
 * ========================================
 */

export function createBlogDetail({
    galleryView,
    blogDetailView,
    blogDetail,
    lightbox,
    onOpen
}) {


    /*
     * ========================================
     * 状態
     * ========================================
     */

    let currentBlogDetail =
        null;

    let currentImageIds =
        [];


    /*
     * ========================================
     * 詳細画像クリック
     *
     * render() のたびに画像DOMが作り直されても
     * 確実にライトボックスを開けるよう、
     * 詳細コンテナ側でイベントを受け取る。
     * ========================================
     */

    blogDetail.addEventListener(
        "click",
        event => {

            const image =
                event.target.closest(
                    ".blog-detail-image img[data-lightbox-index]"
                );

            if (
                !image ||
                !blogDetail.contains(
                    image
                ) ||
                !lightbox ||
                currentImageIds.length ===
                    0
            ) {

                return;
            }

            const imageIndex =
                Number(
                    image.dataset.lightboxIndex
                );

            lightbox.setImages(
                currentImageIds
            );

            lightbox.open(
                imageIndex
            );
        }
    );


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

        const imageIds =
            blocks
                .filter(
                    block =>
                        block.type ===
                            "image" &&
                        block.fileId
                )
                .map(
                    block =>
                        block.fileId
                );

        currentImageIds =
            imageIds;

        let imageIndex =
            0;

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


                    /*
                     * ========================================
                     * parts がある場合
                     * ========================================
                     */

                    if (
                        Array.isArray(
                            block.parts
                        ) &&
                        block.parts.length >
                            0
                    ) {

                        block.parts.forEach(
                            part => {

                                if (
                                    !part
                                ) {

                                    return;
                                }


                                /*
                                 * ========================================
                                 * 通常テキスト
                                 * ========================================
                                 */

                                if (
                                    part.type ===
                                        "text"
                                ) {

                                    text.appendChild(
                                        document.createTextNode(
                                            part.text ||
                                            ""
                                        )
                                    );

                                    return;
                                }


                                /*
                                 * ========================================
                                 * リンク
                                 * ========================================
                                 */

                                if (
                                    part.type ===
                                        "link" &&
                                    part.url
                                ) {

                                    let url;

                                    try {

                                        url =
                                            new URL(
                                                part.url
                                            );

                                    } catch (
                                        error
                                    ) {

                                        text.appendChild(
                                            document.createTextNode(
                                                part.text ||
                                                ""
                                            )
                                        );

                                        return;
                                    }


                                    /*
                                     * http / https のみ許可
                                     */

                                    if (
                                        url.protocol !==
                                            "http:" &&
                                        url.protocol !==
                                            "https:"
                                    ) {

                                        text.appendChild(
                                            document.createTextNode(
                                                part.text ||
                                                ""
                                            )
                                        );

                                        return;
                                    }


                                    const link =
                                        document.createElement(
                                            "a"
                                        );

                                    link.href =
                                        url.href;

                                    link.textContent =
                                        part.text ||
                                        part.url;

                                    link.target =
                                        "_blank";

                                    link.rel =
                                        "noopener noreferrer";

                                    text.appendChild(
                                        link
                                    );
                                }
                            }
                        );

                    } else {


                        /*
                         * ========================================
                         * 旧JSON
                         * parts がない場合
                         * ========================================
                         */

                        text.textContent =
                            block.text ||
                            "";
                    }


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
                        getImageUrl(
                            block.fileId
                        );

                    image.alt =
                        blogData.title ||
                        "ブログ画像";

                    image.loading =
                        "lazy";

                    image.decoding =
                        "async";

                    const currentImageIndex =
                        imageIndex;

                    imageIndex +=
                        1;

                    image.dataset.lightboxIndex =
                        String(
                            currentImageIndex
                        );

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
            showCurrent
    };
}
