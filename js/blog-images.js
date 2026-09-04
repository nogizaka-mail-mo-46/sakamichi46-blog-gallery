/*
 * ========================================
 * Google Drive画像URL
 * ========================================
 */

function getImageUrl(
    fileId
) {
    return `/image/${fileId}`;
}


/*
 * ========================================
 * ブログ画像一覧
 * ========================================
 */

export function createBlogImages({
    galleryView,
    blogImagesView,
    blogImages,
    blogImagesBackButton,
    lightbox
}) {


    /*
     * ========================================
     * 状態
     * ========================================
     */

    let galleryScrollPosition =
        0;

    let currentBlog =
        null;


    /*
     * ========================================
     * 画像一覧表示
     * ========================================
     */

    function open({
        articleId,
        title,
        memberKey,
        images
    }) {

        const blogImageList =
            Array.isArray(
                images
            )
                ? images.filter(
                    image =>
                        image &&
                        image.fileId
                )
                : [];

        if (
            blogImageList.length ===
                0
        ) {
            return;
        }


        /*
         * ========================================
         * 現在状態保存
         * ========================================
         */

        galleryScrollPosition =
            window.scrollY;

        currentBlog = {
            articleId:
                articleId,

            title:
                title,

            memberKey:
                memberKey,

            images:
                blogImageList
        };


        /*
         * ========================================
         * 描画
         * ========================================
         */

        render(
            currentBlog
        );


        /*
         * ========================================
         * 画面切り替え
         * ========================================
         */

        galleryView.hidden =
            true;

        blogImagesView.hidden =
            false;


        /*
         * ========================================
         * 履歴追加
         * ========================================
         */

        history.pushState(
            {
                view:
                    "blog-images",

                articleId:
                    articleId
            },
            "",
            `#blog-images-${articleId}`
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
     * 画像一覧描画
     * ========================================
     */

    function render(
        blog
    ) {

        blogImages.innerHTML =
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
            "blog-images-header";


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
            "blog-images-title";

        title.textContent =
            blog.title ||
            "（無題）";

        header.appendChild(
            title
        );


        /*
         * ========================================
         * 枚数
         * ========================================
         */

        const count =
            document.createElement(
                "div"
            );

        count.className =
            "blog-images-count";

        count.textContent =
            `${blog.images.length}枚`;

        header.appendChild(
            count
        );

        blogImages.appendChild(
            header
        );


        /*
         * ========================================
         * 画像グリッド
         * ========================================
         */

        const grid =
            document.createElement(
                "div"
            );

        grid.className =
            "blog-images-grid";


        /*
         * ========================================
         * ライトボックス対象
         *
         * このブログ内だけ
         * ========================================
         */

        const imageIds =
            blog.images.map(
                image =>
                    image.fileId
            );

        blog.images.forEach(
            (
                image,
                index
            ) => {

                const item =
                    document.createElement(
                        "button"
                    );

                item.type =
                    "button";

                item.className =
                    "blog-images-item";


                /*
                 * ========================================
                 * 画像
                 * ========================================
                 */

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


                /*
                 * ========================================
                 * 画像番号
                 * ========================================
                 */

                const indexLabel =
                    document.createElement(
                        "span"
                    );

                indexLabel.className =
                    "blog-images-index";

                indexLabel.textContent =
                    String(
                        image.imageIndex ||
                        index + 1
                    );


                /*
                 * ========================================
                 * 画像クリック
                 *
                 * このブログ内だけで
                 * ライトボックス移動
                 * ========================================
                 */

                item.addEventListener(
                    "click",
                    () => {

                        lightbox.setImages(
                            imageIds
                        );

                        lightbox.open(
                            index
                        );
                    }
                );

                item.appendChild(
                    img
                );

                item.appendChild(
                    indexLabel
                );

                grid.appendChild(
                    item
                );
            }
        );

        blogImages.appendChild(
            grid
        );
    }


    /*
     * ========================================
     * ギャラリー表示
     * ========================================
     */

    function showGallery() {

        blogImagesView.hidden =
            true;

        galleryView.hidden =
            false;

        blogImages.innerHTML =
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
     * 現在の画像一覧再表示
     * ========================================
     */

    function showCurrent() {

        if (
            !currentBlog
        ) {
            return;
        }

        galleryView.hidden =
            true;

        blogImagesView.hidden =
            false;

        render(
            currentBlog
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
     * 戻るボタン
     * ========================================
     */

    blogImagesBackButton.addEventListener(
        "click",
        () => {

            history.back();
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

        showCurrent:
            showCurrent
    };
}
