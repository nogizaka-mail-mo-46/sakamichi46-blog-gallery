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
    lightbox,
    onOpen
}) {


    /*
     * ========================================
     * 状態
     * ========================================
     */

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

        render(
            currentBlog
        );

        show();

        if (
            typeof onOpen ===
                "function"
        ) {
            onOpen(
                currentBlog
            );
        }
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


        const title =
            document.createElement(
                "h2"
            );

        title.className =
            "blog-images-title";

        title.textContent =
            blog.title ||
            "（無題）";


        const count =
            document.createElement(
                "div"
            );

        count.className =
            "blog-images-count";

        count.textContent =
            `${blog.images.length}枚`;

        header.appendChild(
            title
        );

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
                 * このブログ内だけで移動
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
     * 画像一覧表示
     * ========================================
     */

    function show() {

        galleryView.hidden =
            true;

        blogImagesView.hidden =
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
     * 画像一覧非表示
     * ========================================
     */

    function hide() {

        blogImagesView.hidden =
            true;
    }


    /*
     * ========================================
     * 現在の画像一覧を再表示
     * ========================================
     */

    function showCurrent() {

        if (
            !currentBlog
        ) {
            return false;
        }

        render(
            currentBlog
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

        return currentBlog;
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
