/*
 * ========================================
 * Google Drive画像URL
 * ========================================
 */

function getThumbnailUrl(
    fileId
) {
    return `/image/${fileId}`;
}


/*
 * ========================================
 * ブログ単位グループ化
 * ========================================
 */

function groupImagesByArticle(
    images,
    sortOrder
) {
    const articleMap =
        new Map();

    images.forEach(
        image => {
            const articleId =
                image.articleId ||
                image.id;

            if (
                !articleMap.has(
                    articleId
                )
            ) {
                articleMap.set(
                    articleId,
                    {
                        articleId:
                            articleId,

                        title:
                            image.title ||
                            "タイトルなし",

                        blogTimestamp:
                            image.blogTimestamp ||
                            "",

                        memberKey:
                            image.memberKey ||
                            null,

                        images:
                            []
                    }
                );
            }

            articleMap
                .get(
                    articleId
                )
                .images
                .push(
                    image
                );
        }
    );

    const articles =
        Array.from(
            articleMap.values()
        );

    articles.forEach(
        article => {
            article.images.sort(
                (
                    a,
                    b
                ) =>
                    (
                        Number(
                            a.imageIndex
                        ) ||
                        0
                    ) -
                    (
                        Number(
                            b.imageIndex
                        ) ||
                        0
                    )
            );
        }
    );

    articles.sort(
        (
            a,
            b
        ) => {
            const result =
                a.blogTimestamp.localeCompare(
                    b.blogTimestamp
                );

            if (
                sortOrder ===
                    "asc"
            ) {
                return result;
            }

            return -result;
        }
    );

    return articles;
}


/*
 * ========================================
 * ギャラリー
 * ========================================
 */

export function createGallery({
    element,
    onImageClick,
    onArticleClick
}) {


    /*
     * ========================================
     * 表示中画像
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
     * ギャラリー表示
     * ========================================
     */

    function render(
        images,
        memberSelected,
        sortOrder =
            "desc"
    ) {
        clear();

        if (
            images.length ===
                0
        ) {
            if (
                memberSelected
            ) {
                element.textContent =
                    "画像がありません。";
            }

            return;
        }

        const articles =
            groupImagesByArticle(
                images,
                sortOrder
            );

        articles.forEach(
            article => {
                const articleElement =
                    document.createElement(
                        "section"
                    );

                articleElement.className =
                    "gallery-article";


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

                titleElement.textContent =
                    article.title;

                titleElement.dataset.articleId =
                    article.articleId;

                titleElement.addEventListener(
                    "click",
                    () => {
                        if (
                            typeof onArticleClick ===
                                "function"
                        ) {
                            onArticleClick({
                                articleId:
                                    article.articleId,

                                memberKey:
                                    article.memberKey
                            });
                        }
                    }
                );

                articleElement.appendChild(
                    titleElement
                );


                /*
                 * ========================================
                 * ブログ画像
                 * ========================================
                 */

                const imagesElement =
                    document.createElement(
                        "div"
                    );

                imagesElement.className =
                    "gallery-article-images";

                article.images.forEach(
                    image => {
                        const index =
                            displayedImages.length;

                        displayedImages.push(
                            image
                        );

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
                                image.id
                            );

                        img.alt =
                            article.title;

                        img.decoding =
                            "async";

                        if (
                            index <
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

                        item.addEventListener(
                            "click",
                            () => {
                                onImageClick(
                                    index
                                );
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

                element.appendChild(
                    articleElement
                );
            }
        );
    }


    /*
     * ========================================
     * 表示中画像取得
     * ========================================
     */

    function getDisplayedImages() {
        return displayedImages;
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
