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
 * ライトボックス
 * ========================================
 */

export function createLightbox({
    onOpen,
    onClose
} = {}) {


    /*
     * ========================================
     * DOM
     * ========================================
     */

    const lightbox =
        document.getElementById(
            "lightbox"
        );

    const lightboxImage =
        document.getElementById(
            "lightboxImage"
        );

    const imageCounter =
        document.getElementById(
            "imageCounter"
        );

    const closeButton =
        document.getElementById(
            "closeButton"
        );

    const prevButton =
        document.getElementById(
            "prevButton"
        );

    const nextButton =
        document.getElementById(
            "nextButton"
        );


    /*
     * ========================================
     * 状態
     * ========================================
     */

    let imageIds =
        [];

    let currentIndex =
        0;

    let touchStartX =
        0;

    let touchEndX =
        0;


    /*
     * ========================================
     * 画像一覧更新
     * ========================================
     */

    function setImages(
        newImageIds
    ) {

        imageIds =
            Array.isArray(
                newImageIds
            )
                ? [
                    ...newImageIds
                ]
                : [];

        currentIndex =
            0;
    }


    /*
     * ========================================
     * ライトボックス表示中判定
     * ========================================
     */

    function isOpen() {

        return lightbox.classList.contains(
            "active"
        );
    }


    /*
     * ========================================
     * ライトボックスを開く
     * ========================================
     */

    function open(
        index
    ) {

        if (
            imageIds.length ===
                0
        ) {
            return;
        }

        const safeIndex =
            Number(
                index
            );

        if (
            !Number.isInteger(
                safeIndex
            ) ||
            safeIndex <
                0 ||
            safeIndex >=
                imageIds.length
        ) {

            currentIndex =
                0;

        } else {

            currentIndex =
                safeIndex;
        }

        update();

        const wasOpen =
            isOpen();

        lightbox.classList.add(
            "active"
        );

        document.body.style.overflow =
            "hidden";

        if (
            !wasOpen &&
            typeof onOpen ===
                "function"
        ) {

            onOpen({
                index:
                    currentIndex,

                imageIds: [
                    ...imageIds
                ]
            });
        }
    }


    /*
     * ========================================
     * ライトボックスを閉じる
     *
     * notify = true
     * → × / 背景 / Escape など
     *
     * notify = false
     * → popstate側から閉じる時
     * ========================================
     */

    function close(
        notify =
            true
    ) {

        if (
            !isOpen()
        ) {
            return;
        }

        lightbox.classList.remove(
            "active"
        );

        document.body.style.overflow =
            "";

        lightboxImage.src =
            "";

        if (
            notify &&
            typeof onClose ===
                "function"
        ) {

            onClose();
        }
    }


    /*
     * ========================================
     * ライトボックス更新
     * ========================================
     */

    function update() {

        if (
            imageIds.length ===
                0
        ) {
            return;
        }

        const fileId =
            imageIds[
                currentIndex
            ];

        lightboxImage.src =
            getThumbnailUrl(
                fileId
            );

        lightboxImage.alt =
            `画像 ${currentIndex + 1}`;

        imageCounter.textContent =
            `${currentIndex + 1} / ${imageIds.length}`;
    }


    /*
     * ========================================
     * 前の画像
     * ========================================
     */

    function showPrevious() {

        if (
            imageIds.length ===
                0
        ) {
            return;
        }

        currentIndex--;

        if (
            currentIndex <
                0
        ) {

            currentIndex =
                imageIds.length -
                1;
        }

        update();
    }


    /*
     * ========================================
     * 次の画像
     * ========================================
     */

    function showNext() {

        if (
            imageIds.length ===
                0
        ) {
            return;
        }

        currentIndex++;

        if (
            currentIndex >=
                imageIds.length
        ) {

            currentIndex =
                0;
        }

        update();
    }


    /*
     * ========================================
     * スワイプ判定
     * ========================================
     */

    function handleSwipe() {

        const difference =
            touchEndX -
            touchStartX;

        if (
            difference <
                -50
        ) {

            showNext();

            return;
        }

        if (
            difference >
                50
        ) {

            showPrevious();
        }
    }


    /*
     * ========================================
     * 閉じるボタン
     * ========================================
     */

    closeButton.addEventListener(
        "click",
        () => {

            close(
                true
            );
        }
    );


    /*
     * ========================================
     * 前へボタン
     * ========================================
     */

    prevButton.addEventListener(
        "click",
        showPrevious
    );


    /*
     * ========================================
     * 次へボタン
     * ========================================
     */

    nextButton.addEventListener(
        "click",
        showNext
    );


    /*
     * ========================================
     * 背景クリック
     * ========================================
     */

    lightbox.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                    lightbox
            ) {

                close(
                    true
                );
            }
        }
    );


    /*
     * ========================================
     * キーボード操作
     * ========================================
     */

    document.addEventListener(
        "keydown",
        event => {

            if (
                !isOpen()
            ) {
                return;
            }

            if (
                event.key ===
                    "Escape"
            ) {

                close(
                    true
                );

                return;
            }

            if (
                event.key ===
                    "ArrowLeft"
            ) {

                showPrevious();

                return;
            }

            if (
                event.key ===
                    "ArrowRight"
            ) {

                showNext();
            }
        }
    );


    /*
     * ========================================
     * スワイプ開始
     * ========================================
     */

    lightbox.addEventListener(
        "touchstart",
        event => {

            touchStartX =
                event
                    .changedTouches[
                        0
                    ]
                    .screenX;
        },
        {
            passive:
                true
        }
    );


    /*
     * ========================================
     * スワイプ終了
     * ========================================
     */

    lightbox.addEventListener(
        "touchend",
        event => {

            touchEndX =
                event
                    .changedTouches[
                        0
                    ]
                    .screenX;

            handleSwipe();
        },
        {
            passive:
                true
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

        close:
            close,

        setImages:
            setImages,

        isOpen:
            isOpen
    };
}
