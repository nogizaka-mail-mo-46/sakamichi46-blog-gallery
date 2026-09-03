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
 * ギャラリー
 * ========================================
 */

export function createGallery({
    element,
    onImageClick
}) {


    /*
     * ========================================
     * ギャラリー初期化
     * ========================================
     */

    function clear() {
        element.innerHTML =
            "";
    }


    /*
     * ========================================
     * ギャラリー表示
     * ========================================
     */

    function render(
        imageIds,
        memberSelected
    ) {
        clear();

        if (
            imageIds.length ===
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

        imageIds.forEach(
            (
                fileId,
                index
            ) => {
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
                        fileId
                    );

                img.alt =
                    `画像 ${index + 1}`;

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

                element.appendChild(
                    item
                );
            }
        );
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
            render
    };
}
