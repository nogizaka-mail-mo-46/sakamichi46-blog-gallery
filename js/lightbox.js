import {
    createUiIcon
} from "./ui-icons.js";


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

    const lightboxThumbnails =
        document.getElementById(
            "lightboxThumbnails"
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

    closeButton.replaceChildren(
        createUiIcon(
            "x",
            {
                size:
                    24
            }
        )
    );

    prevButton.replaceChildren(
        createUiIcon(
            "chevronLeft",
            {
                size:
                    28
            }
        )
    );

    nextButton.replaceChildren(
        createUiIcon(
            "chevronRight",
            {
                size:
                    28
            }
        )
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

    let touchStartY =
        0;

    let touchEndX =
        0;

    let touchEndY =
        0;

    let isTouchTracking =
        false;


    /*
     * ========================================
     * スワイプ設定
     * ========================================
     */

    const SWIPE_THRESHOLD =
        50;

    const SWIPE_DIRECTION_RATIO =
        1.2;


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

        renderThumbnails();
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
     * サムネイル生成
     * ========================================
     */

    function renderThumbnails() {

        lightboxThumbnails.innerHTML =
            "";


        if (
            imageIds.length ===
                0
        ) {

            return;
        }


        imageIds.forEach(
            (
                fileId,
                index
            ) => {

                const button =
                    document.createElement(
                        "button"
                    );

                button.type =
                    "button";

                button.className =
                    "lightbox-thumbnail";

                button.dataset.index =
                    String(
                        index
                    );

                button.setAttribute(
                    "aria-label",
                    `画像 ${index + 1} を表示`
                );


                const image =
                    document.createElement(
                        "img"
                    );

                image.src =
                    getThumbnailUrl(
                        fileId
                    );

                image.alt =
                    `画像 ${index + 1}`;


                /*
                 * ====================================
                 * ブラウザ標準画像ドラッグ無効化
                 * ====================================
                 */

                image.draggable =
                    false;


                button.appendChild(
                    image
                );


                button.addEventListener(
                    "click",
                    () => {

                        currentIndex =
                            index;

                        update();
                    }
                );


                lightboxThumbnails.appendChild(
                    button
                );
            }
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


        /*
         * ========================================
         * タッチ状態リセット
         * ========================================
         */

        resetTouchTracking();


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


        /*
         * ========================================
         * ブラウザ標準画像ドラッグ無効化
         * ========================================
         */

        lightboxImage.draggable =
            false;


        imageCounter.textContent =
            `${currentIndex + 1} / ${imageIds.length}`;

        updateThumbnailState();
    }


    /*
     * ========================================
     * サムネイル選択状態更新
     * ========================================
     */

    function updateThumbnailState() {

        const thumbnailButtons =
            lightboxThumbnails.querySelectorAll(
                ".lightbox-thumbnail"
            );


        thumbnailButtons.forEach(
            (
                button,
                index
            ) => {

                const isActive =
                    index ===
                    currentIndex;


                button.classList.toggle(
                    "active",
                    isActive
                );

                button.setAttribute(
                    "aria-current",
                    isActive
                        ? "true"
                        : "false"
                );


                if (
                    isActive
                ) {

                    button.scrollIntoView({
                        behavior:
                            "smooth",

                        block:
                            "nearest",

                        inline:
                            "center"
                    });
                }
            }
        );
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
     * タッチ状態リセット
     * ========================================
     */

    function resetTouchTracking() {

        touchStartX =
            0;

        touchStartY =
            0;

        touchEndX =
            0;

        touchEndY =
            0;

        isTouchTracking =
            false;
    }


    /*
     * ========================================
     * メイン画像上のタッチか判定
     * ========================================
     */

    function isMainImageTouch(
        target
    ) {

        return (
            target ===
            lightboxImage
        );
    }


    /*
     * ========================================
     * スワイプ判定
     *
     * 横方向の移動量が
     * 縦方向より十分大きい場合のみ
     * 画像切替する
     * ========================================
     */

    function handleSwipe() {

        if (
            !isTouchTracking
        ) {
            return;
        }


        const differenceX =
            touchEndX -
            touchStartX;

        const differenceY =
            touchEndY -
            touchStartY;


        const absX =
            Math.abs(
                differenceX
            );

        const absY =
            Math.abs(
                differenceY
            );


        /*
         * ========================================
         * 移動量不足
         * ========================================
         */

        if (
            absX <
            SWIPE_THRESHOLD
        ) {

            return;
        }


        /*
         * ========================================
         * 縦方向操作を誤判定しない
         * ========================================
         */

        if (
            absX <
            absY *
            SWIPE_DIRECTION_RATIO
        ) {

            return;
        }


        /*
         * ========================================
         * 左スワイプ
         * → 次へ
         * ========================================
         */

        if (
            differenceX <
            0
        ) {

            showNext();

            return;
        }


        /*
         * ========================================
         * 右スワイプ
         * → 前へ
         * ========================================
         */

        showPrevious();
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
     * メイン画像ドラッグ無効化
     * ========================================
     */

    lightboxImage.addEventListener(
        "dragstart",
        event => {

            event.preventDefault();
        }
    );


    /*
     * ========================================
     * スワイプ開始
     *
     * メイン画像上だけを対象とする
     * ========================================
     */

    lightbox.addEventListener(
        "touchstart",
        event => {

            if (
                event.touches.length !==
                1
            ) {

                resetTouchTracking();

                return;
            }


            if (
                !isMainImageTouch(
                    event.target
                )
            ) {

                resetTouchTracking();

                return;
            }


            const touch =
                event.touches[
                    0
                ];


            touchStartX =
                touch.clientX;

            touchStartY =
                touch.clientY;

            touchEndX =
                touchStartX;

            touchEndY =
                touchStartY;

            isTouchTracking =
                true;
        },
        {
            passive:
                true
        }
    );


    /*
     * ========================================
     * スワイプ移動
     *
     * 横方向の操作が明確になったら
     * ブラウザ側のジェスチャーを抑止
     * ========================================
     */

    lightbox.addEventListener(
        "touchmove",
        event => {

            if (
                !isTouchTracking
            ) {
                return;
            }


            if (
                event.touches.length !==
                1
            ) {

                resetTouchTracking();

                return;
            }


            const touch =
                event.touches[
                    0
                ];


            touchEndX =
                touch.clientX;

            touchEndY =
                touch.clientY;


            const differenceX =
                touchEndX -
                touchStartX;

            const differenceY =
                touchEndY -
                touchStartY;


            const absX =
                Math.abs(
                    differenceX
                );

            const absY =
                Math.abs(
                    differenceY
                );


            /*
             * ====================================
             * 横方向操作の場合だけ
             * ブラウザ標準動作を止める
             * ====================================
             */

            if (
                absX >
                    10 &&
                absX >
                    absY
            ) {

                event.preventDefault();
            }
        },
        {
            passive:
                false
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

            if (
                !isTouchTracking
            ) {
                return;
            }


            if (
                event.changedTouches.length >
                0
            ) {

                const touch =
                    event.changedTouches[
                        0
                    ];


                touchEndX =
                    touch.clientX;

                touchEndY =
                    touch.clientY;
            }


            handleSwipe();

            resetTouchTracking();
        },
        {
            passive:
                true
        }
    );


    /*
     * ========================================
     * タッチキャンセル
     * ========================================
     */

    lightbox.addEventListener(
        "touchcancel",
        () => {

            resetTouchTracking();
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
