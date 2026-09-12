import {
    createUiIcon
} from "./ui-icons.js";

import {
    getImageUrl
} from "./image-url.js";


/*
 * ========================================
 * ブログ並び替え
 * ========================================
 */

function sortBlogs(
    blogs,
    sortOrder
) {
    const result = [
        ...blogs
    ];

    result.sort(
        (
            a,
            b
        ) => {
            const comparison =
                String(
                    a.timestamp ||
                    ""
                ).localeCompare(
                    String(
                        b.timestamp ||
                        ""
                    )
                );

            if (
                sortOrder ===
                    "asc"
            ) {
                return comparison;
            }

            return -comparison;
        }
    );

    return result;
}


/*
 * ========================================
 * ギャラリー
 * ========================================
 */

export function createGallery({
    element,
    onImageClick,
    onArticleClick,
    onArticleImagesClick
}) {


    /*
     * ========================================
     * 表示中画像
     *
     * ブログをまたいだライトボックス用
     * ========================================
     */

    let displayedImages =
        [];


    /*
     * ========================================
     * ギャラリー初期化
     * ========================================
     */

    function clear() {
        element.innerHTML =
            "";

        displayedImages =
            [];
    }


    /*
     * ========================================
     * ブログ日付表示
     * ========================================
     */

    function createDateText(
        date
    ) {
        if (
            !date
        ) {
            return "";
        }

        return String(
            date
        ).replace(
            /-/g,
            "."
        );
    }


    /*
     * ========================================
     * ギャラリー表示
     * ========================================
     */

    function render(
        blogs,
        memberSelected,
        sortOrder =
            "desc"
    ) {
        clear();

        if (
            !Array.isArray(
                blogs
            ) ||
            blogs.length ===
                0
        ) {
            if (
                memberSelected
            ) {
                element.textContent =
                    "ブログがありません。";
            }

            return;
        }

        const sortedBlogs =
            sortBlogs(
                blogs,
                sortOrder
            );


        /*
         * ========================================
         * 一括描画用Fragment
         * ========================================
         */

        const fragment =
            document.createDocumentFragment();


        /*
         * ========================================
         * ブログごとに描画
         * ========================================
         */

        sortedBlogs.forEach(
            blog => {

                const articleElement =
                    document.createElement(
                        "section"
                    );

                articleElement.className =
                    "gallery-article";


                /*
                 * ========================================
                 * ブログ日付・メンバー名
                 * ========================================
                 */

                const dateElement =
                    document.createElement(
                        "div"
                    );

                dateElement.className =
                    "gallery-article-date";

                const dateText =
                    createDateText(
                        blog.date
                    );

                const memberName =
                    blog.member?.name ||
                    "";

                dateElement.textContent =
                    memberName
                        ? `${dateText} / ${memberName}`
                        : dateText;

                articleElement.appendChild(
                    dateElement
                );


                /*
                 * ========================================
                 * ブログタイトル
                 * ========================================
                 */

                const titleElement =
                    document.createElement(
                        "button"
                    );

                titleElement.type =
                    "button";

                titleElement.className =
                    "gallery-article-title";

                const titleText =
                    document.createElement(
                        "span"
                    );

                titleText.className =
                    "gallery-article-title-text";

                titleText.textContent =
                    blog.title ||
                    "（無題）";

                titleElement.appendChild(
                    titleText
                );

                titleElement.appendChild(
                    createUiIcon(
                        "chevronRight",
                        {
                            size:
                                22
                        }
                    )
                );

                titleElement.dataset.articleId =
                    blog.articleId ||
                    "";

                titleElement.addEventListener(
                    "click",
                    () => {
                        if (
                            typeof onArticleClick ===
                                "function"
                        ) {
                            onArticleClick({
                                articleId:
                                    blog.articleId,

                                memberKey:
                                    blog.member?.key ||
                                    null
                            });
                        }
                    }
                );

                articleElement.appendChild(
                    titleElement
                );


                /*
                 * ========================================
                 * 画像
                 * ========================================
                 */

                const blogImages =
                    Array.isArray(
                        blog.images
                    )
                        ? blog.images
                        : [];


                /*
                 * ========================================
                 * 画像ありブログ
                 * ========================================
                 */

                if (
                    blogImages.length >
                        0
                ) {

                    const imagesElement =
                        document.createElement(
                            "div"
                        );

                    imagesElement.className =
                        "gallery-article-images";


                    /*
                     * ========================================
                     * 各画像
                     * ========================================
                     */

                    blogImages.forEach(
                        image => {

                            /*
                             * displayedImagesへ入れた時点の位置が
                             * ライトボックスのグローバルindex
                             */

                            const globalIndex =
                                displayedImages.length;

                            displayedImages.push({
                                ...image,

                                articleId:
                                    blog.articleId,

                                title:
                                    blog.title,

                                timestamp:
                                    blog.timestamp,

                                date:
                                    blog.date,

                                member:
                                    blog.member
                            });


                            const item =
                                document.createElement(
                                    "button"
                                );

                            item.type =
                                "button";

                            item.className =
                                "gallery-item";


                            const img =
                                document.createElement(
                                    "img"
                                );

                            img.src =
                                getImageUrl(
                                    image.fileId
                                );

                            img.alt =
                                blog.title ||
                                "ブログ画像";

                            img.decoding =
                                "async";


                            /*
                             * ========================================
                             * 最初の画像だけ優先読込
                             * ========================================
                             */

                            if (
                                globalIndex <
                                    4
                            ) {
                                img.loading =
                                    "eager";

                                img.fetchPriority =
                                    "high";

                            } else {
                                img.loading =
                                    "lazy";

                                img.fetchPriority =
                                    "low";
                            }


                            /*
                             * ========================================
                             * 画像クリック
                             *
                             * 表示中全ブログをまたぐ
                             * ライトボックスを開く
                             * ========================================
                             */

                            item.addEventListener(
                                "click",
                                () => {
                                    if (
                                        typeof onImageClick ===
                                            "function"
                                    ) {
                                        onImageClick(
                                            globalIndex
                                        );
                                    }
                                }
                            );

                            item.appendChild(
                                img
                            );

                            imagesElement.appendChild(
                                item
                            );
                        }
                    );

                    articleElement.appendChild(
                        imagesElement
                    );


                    /*
                     * ========================================
                     * 全画像を見る
                     * ========================================
                     */

                    const imagesLink =
                        document.createElement(
                            "button"
                        );

                    imagesLink.type =
                        "button";

                    imagesLink.className =
                        "gallery-article-images-link";

                    const imagesLinkText =
                        document.createElement(
                            "span"
                        );

                    imagesLinkText.textContent =
                        `全${blogImages.length}枚を見る`;

                    imagesLink.appendChild(
                        imagesLinkText
                    );

                    imagesLink.appendChild(
                        createUiIcon(
                            "chevronRight",
                            {
                                size:
                                    16
                            }
                        )
                    );

                    imagesLink.addEventListener(
                        "click",
                        () => {
                            if (
                                typeof onArticleImagesClick ===
                                    "function"
                            ) {
                                onArticleImagesClick({
                                    articleId:
                                        blog.articleId,

                                    title:
                                        blog.title,

                                    memberKey:
                                        blog.member?.key ||
                                        null,

                                    images:
                                        blogImages
                                });
                            }
                        }
                    );

                    articleElement.appendChild(
                        imagesLink
                    );

                } else {


                    /*
                     * ========================================
                     * 画像なしブログ
                     * ========================================
                     */

                    const emptyImageArea =
                        document.createElement(
                            "div"
                        );

                    emptyImageArea.className =
                        "gallery-article-no-images";


                    /*
                     * ========================================
                     * 本文プレビュー
                     * ========================================
                     */

                    if (
                        blog.previewText
                    ) {

                        const preview =
                            document.createElement(
                                "p"
                            );

                        preview.className =
                            "gallery-article-preview";

                        preview.textContent =
                            blog.previewText;

                        emptyImageArea.appendChild(
                            preview
                        );
                    }


                    /*
                     * ========================================
                     * ブログを読む
                     * ========================================
                     */

                    const readButton =
                        document.createElement(
                            "button"
                        );

                    readButton.type =
                        "button";

                    readButton.className =
                        "gallery-article-read-link";

                    const readButtonText =
                        document.createElement(
                            "span"
                        );

                    readButtonText.textContent =
                        "ブログを読む";

                    readButton.appendChild(
                        readButtonText
                    );

                    readButton.appendChild(
                        createUiIcon(
                            "chevronRight",
                            {
                                size:
                                    16
                            }
                        )
                    );

                    readButton.addEventListener(
                        "click",
                        () => {
                            if (
                                typeof onArticleClick ===
                                    "function"
                            ) {
                                onArticleClick({
                                    articleId:
                                        blog.articleId,

                                    memberKey:
                                        blog.member?.key ||
                                        null
                                });
                            }
                        }
                    );

                    emptyImageArea.appendChild(
                        readButton
                    );

                    articleElement.appendChild(
                        emptyImageArea
                    );
                }


                /*
                 * ========================================
                 * Fragmentへ追加
                 * ========================================
                 */

                fragment.appendChild(
                    articleElement
                );
            }
        );


        /*
         * ========================================
         * ギャラリーへ一括追加
         * ========================================
         */

        element.appendChild(
            fragment
        );
    }


    /*
     * ========================================
     * 表示中画像取得
     *
     * ブログをまたいだライトボックス用
     * ========================================
     */

    function getDisplayedImages() {
        return [
            ...displayedImages
        ];
    }


    /*
     * ========================================
     * 公開メソッド
     * ========================================
     */

    return {
        clear:
            clear,

        render:
            render,

        getDisplayedImages:
            getDisplayedImages
    };
}
