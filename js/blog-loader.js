/*
 * ========================================
 * ブログ一覧データ取得
 *
 * 月別・日別のブログ取得と、通信中/失敗時の
 * 一覧表示更新を担当する。
 * ========================================
 */

export function createBlogLoader({
    fetchBlogs,
    getCurrentGroup,
    getCurrentMember,
    getSelectedGeneration,
    getSelectedDate,
    getCurrentMonthKey,
    isCurrentDataRequest,
    setBlogs,
    updateBlogs,
    clearGallery,
    clearLightbox,
    galleryElement
}) {

    function getRequestTarget() {
        return {
            group:
                getCurrentGroup(),

            member:
                getCurrentMember() ||
                null,

            generation:
                getSelectedGeneration()
        };
    }


    function isSameRequestTarget(
        requestVersion,
        requestTarget
    ) {
        return (
            isCurrentDataRequest(
                requestVersion
            ) &&
            getCurrentGroup() ===
                requestTarget.group &&
            (
                getCurrentMember() ||
                null
            ) ===
                requestTarget.member &&
            getSelectedGeneration() ===
                requestTarget.generation
        );
    }


    function showLoadError() {
        setBlogs(
            []
        );

        clearLightbox();

        galleryElement.textContent =
            "ブログの読み込みに失敗しました。";
    }


    async function loadCurrentMonthBlogs(
        requestVersion
    ) {
        const requestTarget =
            getRequestTarget();

        const month =
            getCurrentMonthKey();

        if (
            !month
        ) {
            setBlogs(
                []
            );

            clearGallery();
            clearLightbox();

            return;
        }

        galleryElement.textContent =
            "読み込み中...";

        try {
            const data =
                await fetchBlogs({
                    group:
                        requestTarget.group,

                    member:
                        requestTarget.member,

                    generation:
                        requestTarget.generation,

                    month:
                        month
                });

            if (
                !isSameRequestTarget(
                    requestVersion,
                    requestTarget
                )
            ) {
                return;
            }

            setBlogs(
                Array.isArray(
                    data.blogs
                )
                    ? data.blogs
                    : []
            );

            updateBlogs();

        } catch (
            error
        ) {
            if (
                !isSameRequestTarget(
                    requestVersion,
                    requestTarget
                )
            ) {
                return;
            }

            console.error(
                error
            );

            showLoadError();
        }
    }


    async function loadBlogsByDate(
        dateKey,
        requestVersion
    ) {
        const requestTarget =
            getRequestTarget();

        galleryElement.textContent =
            "読み込み中...";

        try {
            const data =
                await fetchBlogs({
                    group:
                        requestTarget.group,

                    member:
                        requestTarget.member,

                    generation:
                        requestTarget.generation,

                    date:
                        dateKey
                });

            if (
                !isSameRequestTarget(
                    requestVersion,
                    requestTarget
                ) ||
                getSelectedDate() !==
                    dateKey
            ) {
                return;
            }

            setBlogs(
                Array.isArray(
                    data.blogs
                )
                    ? data.blogs
                    : []
            );

            updateBlogs();

        } catch (
            error
        ) {
            if (
                !isSameRequestTarget(
                    requestVersion,
                    requestTarget
                ) ||
                getSelectedDate() !==
                    dateKey
            ) {
                return;
            }

            console.error(
                error
            );

            showLoadError();
        }
    }


    return {
        loadCurrentMonthBlogs,
        loadBlogsByDate
    };
}
