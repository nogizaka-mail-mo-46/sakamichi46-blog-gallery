import {
    createUiIcon
} from "./ui-icons.js";

import {
    getImageUrl
} from "./image-url.js";


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

    let scale =
        1;

    let translateX =
        0;

    let translateY =
        0;

    let isPinching =
        false;

    let pinchStartDistance =
        0;

    let pinchStartScale =
        1;

    let pinchAnchorX =
        0;

    let pinchAnchorY =
        0;

    let isPanning =
        false;

    let panStartX =
        0;

    let panStartY =
        0;

    let panStartTranslateX =
        0;

    let panStartTranslateY =
        0;

    let isMouseDragging =
        false;

    let mouseDragStartX =
        0;

    let mouseDragStartY =
        0;

    let mouseDragStartTranslateX =
        0;

    let mouseDragStartTranslateY =
        0;


    /*
     * ========================================
     * スワイプ・ズーム設定
     * ========================================
     */

    const SWIPE_THRESHOLD =
        50;

    const SWIPE_DIRECTION_RATIO =
        1.2;

    const MIN_SCALE =
        1;

    const MAX_SCALE =
        4;

    const WHEEL_ZOOM_SPEED =
        0.0015;


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
                    getImageUrl(
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

        const wasOpen =
            isOpen();


        lightbox.classList.add(
            "active"
        );

        document.body.style.overflow =
            "hidden";


        update();


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

        resetZoom();


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


        resetZoom();


        const fileId =
            imageIds[
                currentIndex
            ];


        lightboxImage.src =
            getImageUrl(
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
     * ズーム値制限
     * ========================================
     */

    function clampScale(
        value
    ) {

        return Math.min(
            MAX_SCALE,
            Math.max(
                MIN_SCALE,
                value
            )
        );
    }


    /*
     * ========================================
     * 画像移動範囲制限
     * ========================================
     */

    function clampTranslation() {

        if (
            scale <=
                MIN_SCALE
        ) {

            translateX =
                0;

            translateY =
                0;

            return;
        }


        const scaledWidth =
            lightboxImage.offsetWidth *
            scale;

        const scaledHeight =
            lightboxImage.offsetHeight *
            scale;

        const maxX =
            Math.max(
                0,
                (
                    scaledWidth -
                    window.innerWidth
                ) /
                2 +
                24
            );

        const maxY =
            Math.max(
                0,
                (
                    scaledHeight -
                    window.innerHeight
                ) /
                2 +
                24
            );


        translateX =
            Math.max(
                -maxX,
                Math.min(
                    maxX,
                    translateX
                )
            );

        translateY =
            Math.max(
                -maxY,
                Math.min(
                    maxY,
                    translateY
                )
            );
    }


    /*
     * ========================================
     * ズーム表示反映
     * ========================================
     */

    function applyZoomTransform() {

        clampTranslation();

        lightboxImage.style.transform =
            `translate(${translateX}px, ${translateY}px) scale(${scale})`;

        lightboxImage.classList.toggle(
            "zoomed",
            scale >
                MIN_SCALE
        );
    }


    /*
     * ========================================
     * ズーム状態リセット
     * ========================================
     */

    function resetZoom() {

        scale =
            MIN_SCALE;

        translateX =
            0;

        translateY =
            0;

        isPinching =
            false;

        isPanning =
            false;

        isMouseDragging =
            false;

        lightboxImage.classList.remove(
            "zoomed",
            "dragging"
        );

        lightboxImage.style.transform =
            "";
    }


    /*
     * ========================================
     * 2点間距離
     * ========================================
     */

    function getTouchDistance(
        firstTouch,
        secondTouch
    ) {

        return Math.hypot(
            secondTouch.clientX -
                firstTouch.clientX,
            secondTouch.clientY -
                firstTouch.clientY
        );
    }


    /*
     * ========================================
     * 2点の中心座標
     * ========================================
     */

    function getTouchMidpoint(
        firstTouch,
        secondTouch
    ) {

        return {
            x:
                (
                    firstTouch.clientX +
                    secondTouch.clientX
                ) /
                2,

            y:
                (
                    firstTouch.clientY +
                    secondTouch.clientY
                ) /
                2
        };
    }


    /*
     * ========================================
     * 画像の変形前中心座標
     * ========================================
     */

    function getImageBaseCenter() {

        const rect =
            lightboxImage.getBoundingClientRect();


        return {
            x:
                rect.left +
                rect.width /
                2 -
                translateX,

            y:
                rect.top +
                rect.height /
                2 -
                translateY
        };
    }


    /*
     * ========================================
     * 指定位置を基準にズーム
     * ========================================
     */

    function zoomAtPoint(
        nextScale,
        clientX,
        clientY
    ) {

        const limitedScale =
            clampScale(
                nextScale
            );


        if (
            limitedScale ===
                scale
        ) {
            return;
        }


        if (
            limitedScale <=
                MIN_SCALE
        ) {

            scale =
                MIN_SCALE;

            translateX =
                0;

            translateY =
                0;

            applyZoomTransform();

            return;
        }


        const center =
            getImageBaseCenter();

        const ratio =
            limitedScale /
            scale;


        translateX =
            clientX -
            center.x -
            (
                clientX -
                center.x -
                translateX
            ) *
            ratio;

        translateY =
            clientY -
            center.y -
            (
                clientY -
                center.y -
                translateY
            ) *
            ratio;

        scale =
            limitedScale;

        applyZoomTransform();
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

        isPinching =
            false;

        isPanning =
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
            !isTouchTracking ||
            scale >
                MIN_SCALE
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
     * PC: マウスホイールでズーム
     * ========================================
     */

    lightboxImage.addEventListener(
        "wheel",
        event => {

            if (
                !isOpen()
            ) {
                return;
            }


            event.preventDefault();


            const zoomFactor =
                Math.exp(
                    -event.deltaY *
                    WHEEL_ZOOM_SPEED
                );


            zoomAtPoint(
                scale *
                    zoomFactor,
                event.clientX,
                event.clientY
            );
        },
        {
            passive:
                false
        }
    );


    /*
     * ========================================
     * PC: 拡大中のマウスドラッグ開始
     * ========================================
     */

    lightboxImage.addEventListener(
        "mousedown",
        event => {

            if (
                event.button !==
                    0 ||
                scale <=
                    MIN_SCALE
            ) {
                return;
            }


            event.preventDefault();

            isMouseDragging =
                true;

            mouseDragStartX =
                event.clientX;

            mouseDragStartY =
                event.clientY;

            mouseDragStartTranslateX =
                translateX;

            mouseDragStartTranslateY =
                translateY;

            lightboxImage.classList.add(
                "dragging"
            );
        }
    );


    document.addEventListener(
        "mousemove",
        event => {

            if (
                !isMouseDragging
            ) {
                return;
            }


            translateX =
                mouseDragStartTranslateX +
                event.clientX -
                mouseDragStartX;

            translateY =
                mouseDragStartTranslateY +
                event.clientY -
                mouseDragStartY;

            applyZoomTransform();
        }
    );


    document.addEventListener(
        "mouseup",
        () => {

            if (
                !isMouseDragging
            ) {
                return;
            }


            isMouseDragging =
                false;

            lightboxImage.classList.remove(
                "dragging"
            );
        }
    );


    /*
     * ========================================
     * スマホ・タブレット: タッチ開始
     *
     * 1本指 + 1倍
     * → 左右スワイプ
     *
     * 1本指 + 拡大中
     * → 画像移動
     *
     * 2本指
     * → ピンチズーム
     * ========================================
     */

    lightbox.addEventListener(
        "touchstart",
        event => {

            if (
                !isMainImageTouch(
                    event.target
                )
            ) {

                resetTouchTracking();

                return;
            }


            if (
                event.touches.length ===
                    2
            ) {

                const firstTouch =
                    event.touches[
                        0
                    ];

                const secondTouch =
                    event.touches[
                        1
                    ];

                const midpoint =
                    getTouchMidpoint(
                        firstTouch,
                        secondTouch
                    );

                const center =
                    getImageBaseCenter();


                pinchStartDistance =
                    getTouchDistance(
                        firstTouch,
                        secondTouch
                    );

                pinchStartScale =
                    scale;

                pinchAnchorX =
                    (
                        midpoint.x -
                        center.x -
                        translateX
                    ) /
                    scale;

                pinchAnchorY =
                    (
                        midpoint.y -
                        center.y -
                        translateY
                    ) /
                    scale;

                isPinching =
                    true;

                isPanning =
                    false;

                isTouchTracking =
                    false;

                event.preventDefault();

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


            if (
                scale >
                    MIN_SCALE
            ) {

                isPanning =
                    true;

                panStartX =
                    touch.clientX;

                panStartY =
                    touch.clientY;

                panStartTranslateX =
                    translateX;

                panStartTranslateY =
                    translateY;

                event.preventDefault();

                return;
            }


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
                false
        }
    );


    /*
     * ========================================
     * スマホ・タブレット: タッチ移動
     * ========================================
     */

    lightbox.addEventListener(
        "touchmove",
        event => {

            if (
                isPinching &&
                event.touches.length ===
                    2
            ) {

                const firstTouch =
                    event.touches[
                        0
                    ];

                const secondTouch =
                    event.touches[
                        1
                    ];

                const distance =
                    getTouchDistance(
                        firstTouch,
                        secondTouch
                    );

                const midpoint =
                    getTouchMidpoint(
                        firstTouch,
                        secondTouch
                    );

                const center =
                    getImageBaseCenter();

                const nextScale =
                    clampScale(
                        pinchStartScale *
                        distance /
                        pinchStartDistance
                    );


                translateX =
                    midpoint.x -
                    center.x -
                    pinchAnchorX *
                    nextScale;

                translateY =
                    midpoint.y -
                    center.y -
                    pinchAnchorY *
                    nextScale;

                scale =
                    nextScale;


                if (
                    scale <=
                        MIN_SCALE
                ) {

                    translateX =
                        0;

                    translateY =
                        0;
                }


                applyZoomTransform();

                event.preventDefault();

                return;
            }


            if (
                isPanning &&
                event.touches.length ===
                    1
            ) {

                const touch =
                    event.touches[
                        0
                    ];


                translateX =
                    panStartTranslateX +
                    touch.clientX -
                    panStartX;

                translateY =
                    panStartTranslateY +
                    touch.clientY -
                    panStartY;

                applyZoomTransform();

                event.preventDefault();

                return;
            }


            if (
                !isTouchTracking ||
                event.touches.length !==
                    1
            ) {
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
     * スマホ・タブレット: タッチ終了
     * ========================================
     */

    lightbox.addEventListener(
        "touchend",
        event => {

            if (
                isPinching
            ) {

                if (
                    event.touches.length ===
                        1 &&
                    scale >
                        MIN_SCALE
                ) {

                    const touch =
                        event.touches[
                            0
                        ];

                    isPinching =
                        false;

                    isPanning =
                        true;

                    panStartX =
                        touch.clientX;

                    panStartY =
                        touch.clientY;

                    panStartTranslateX =
                        translateX;

                    panStartTranslateY =
                        translateY;

                } else {

                    isPinching =
                        false;

                    isPanning =
                        false;
                }


                if (
                    scale <=
                        MIN_SCALE
                ) {

                    resetZoom();
                }


                return;
            }


            if (
                isPanning
            ) {

                if (
                    event.touches.length ===
                        0
                ) {

                    isPanning =
                        false;
                }

                return;
            }


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
     * 画面サイズ変更時
     * ========================================
     */

    window.addEventListener(
        "resize",
        () => {

            if (
                scale <=
                    MIN_SCALE
            ) {
                return;
            }


            applyZoomTransform();
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
