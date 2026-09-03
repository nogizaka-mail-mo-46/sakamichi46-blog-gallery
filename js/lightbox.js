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

export function createLightbox() {


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

    let imageIds = [];

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
        imageIds = [
            ...newImageIds
        ];

        currentIndex =
            0;
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

        currentIndex =
            index;

        update();

        lightbox.classList.add(
            "active"
        );

        document.body.style.overflow =
            "hidden";
    }


    /*
     * ========================================
     * ライトボックスを閉じる
     * ========================================
     */

    function close() {
        lightbox.classList.remove(
            "active"
        );

        document.body.style.overflow =
            "";
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
                imageIds.length - 1;
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
        close
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
        (event) => {
            if (
                event.target ===
                lightbox
            ) {
                close();
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
        (event) => {
            if (
                !lightbox.classList.contains(
                    "active"
                )
            ) {
                return;
            }

            if (
                event.key ===
                "Escape"
            ) {
                close();
            }

            if (
                event.key ===
                "ArrowLeft"
            ) {
                showPrevious();
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
        (event) => {
            touchStartX =
                event
                    .changedTouches[0]
                    .screenX;
        }
    );


    /*
     * ========================================
     * スワイプ終了
     * ========================================
     */

    lightbox.addEventListener(
        "touchend",
        (event) => {
            touchEndX =
                event
                    .changedTouches[0]
                    .screenX;

            handleSwipe();
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
            setImages
    };
}
