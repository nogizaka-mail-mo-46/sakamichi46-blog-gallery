/*
 * ========================================
 * API共通処理
 * ========================================
 */

const GET_RETRY_DELAY_MS =
    350;


function wait(
    milliseconds
) {
    return new Promise(
        resolve =>
            window.setTimeout(
                resolve,
                milliseconds
            )
    );
}


function shouldRetryResponse(
    response
) {
    return (
        response.status === 429 ||
        response.status >= 500
    );
}


async function fetchJson(
    url,
    errorMessage
) {
    let lastError =
        null;

    for (
        let attempt = 0;
        attempt < 2;
        attempt += 1
    ) {
        try {
            const response =
                await fetch(
                    url
                );

            if (
                response.ok
            ) {
                return await response.json();
            }

            if (
                attempt === 0 &&
                shouldRetryResponse(
                    response
                )
            ) {
                await wait(
                    GET_RETRY_DELAY_MS
                );

                continue;
            }

            throw new Error(
                errorMessage
            );

        } catch (
            error
        ) {
            lastError =
                error;

            if (
                attempt === 0 &&
                !(error instanceof Error &&
                    error.message === errorMessage)
            ) {
                await wait(
                    GET_RETRY_DELAY_MS
                );

                continue;
            }

            throw error;
        }
    }

    throw lastError ||
        new Error(
            errorMessage
        );
}


/*
 * ========================================
 * メンバー一覧取得
 * ========================================
 */

export async function fetchMembers(
    group
) {
    return await fetchJson(
        `/api/members?group=${encodeURIComponent(group)}`,
        "メンバー一覧の取得に失敗しました。"
    );
}


/*
 * ========================================
 * ブログ一覧取得
 *
 * 【対応パラメータ】
 * - group
 * - member
 * - generation
 * - month
 * - date
 * - sort
 * ========================================
 */

export async function fetchBlogs({
    group,
    member = null,
    generation = null,
    month = null,
    date = null,
    sort = null
}) {
    const params =
        new URLSearchParams({
            group:
                group
        });

    if (
        member
    ) {
        params.set(
            "member",
            member
        );
    }

    if (
        generation !==
            null
    ) {
        params.set(
            "generation",
            generation
        );
    }

    if (
        month
    ) {
        params.set(
            "month",
            month
        );
    }

    if (
        date
    ) {
        params.set(
            "date",
            date
        );
    }

    if (
        sort
    ) {
        params.set(
            "sort",
            sort
        );
    }

    return await fetchJson(
        `/api/blogs?${params.toString()}`,
        "ブログ一覧の取得に失敗しました。"
    );
}


/*
 * ========================================
 * ブログ詳細取得
 * ========================================
 */

export async function fetchBlogDetail({
    group,
    member,
    articleId,
    detailFileId
}) {
    const params =
        new URLSearchParams({
            group:
                group,

            member:
                member,

            articleId:
                articleId
        });

    if (
        detailFileId
    ) {
        params.set(
            "detailFileId",
            detailFileId
        );
    }

    return await fetchJson(
        `/api/blog?${params.toString()}`,
        "ブログ詳細の取得に失敗しました。"
    );
}


/*
 * ========================================
 * 既読情報取得
 * ========================================
 */

export async function fetchReadStatus(
    group
) {
    return await fetchJson(
        `/api/read-status?group=${encodeURIComponent(group)}`,
        "既読情報の取得に失敗しました。"
    );
}


/*
 * ========================================
 * 既読登録
 * ========================================
 */

export async function markArticleRead({
    group,
    articleId
}) {
    const response =
        await fetch(
            "/api/read-status",
            {
                method:
                    "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify({
                        group,
                        articleId
                    })
            }
        );

    if (
        !response.ok
    ) {
        throw new Error(
            "既読情報の保存に失敗しました。"
        );
    }

    return await response.json();
}

/*
 * ========================================
 * 推しメン情報取得
 * ========================================
 */

export async function fetchFavoriteMembers(
    group
) {
    return await fetchJson(
        `/api/favorite-members?group=${encodeURIComponent(group)}`,
        "推しメン情報の取得に失敗しました。"
    );
}


/*
 * ========================================
 * 推しメン登録・解除
 * ========================================
 */

export async function updateFavoriteMember({
    group,
    memberKey,
    favorite
}) {
    const response =
        await fetch(
            "/api/favorite-members",
            {
                method:
                    "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify({
                        group,
                        memberKey,
                        favorite
                    })
            }
        );

    if (
        !response.ok
    ) {
        throw new Error(
            "推しメン情報の保存に失敗しました。"
        );
    }

    return await response.json();
}


/*
 * ========================================
 * ブログ検索
 *
 * 【対応パラメータ】
 * - group
 * - member
 * - generation
 * - startDate
 * - endDate
 * - keyword
 * - sort
 * ========================================
 */

export async function fetchBlogSearch({
    group,
    member = null,
    generation = null,
    startDate = null,
    endDate = null,
    keyword = null,
    sort = null
}) {
    const searchParams =
        new URLSearchParams({
            group:
                group
        });

    if (
        member
    ) {
        searchParams.set(
            "member",
            member
        );
    }

    if (
        generation !==
            null
    ) {
        searchParams.set(
            "generation",
            generation
        );
    }

    if (
        startDate
    ) {
        searchParams.set(
            "startDate",
            startDate
        );
    }

    if (
        endDate
    ) {
        searchParams.set(
            "endDate",
            endDate
        );
    }

    if (
        keyword
    ) {
        searchParams.set(
            "keyword",
            keyword
        );
    }

    /*
     * ========================================
     * 検索一致IDと一覧表示データを別APIで取得
     *
     * /api/search : 全文検索して一致IDだけ返す
     * /api/blogs  : 通常の一覧表示データを返す
     *
     * ALL検索時に1つのCloudflare Functionへ
     * 全員分のDrive取得を集中させないため、
     * 2つのAPIを別リクエストとして並列実行する。
     * ========================================
     */

    const [
        searchData,
        blogData
    ] =
        await Promise.all([
            fetchJson(
                `/api/search?${searchParams.toString()}`,
                "ブログ検索に失敗しました。"
            ),

            fetchBlogs({
                group:
                    group,

                member:
                    member,

                generation:
                    generation,

                sort:
                    sort
            })
        ]);

    const matchedKeys =
        new Set(
            Array.isArray(
                searchData.matches
            )
                ? searchData.matches.map(
                    match =>
                        `${String(match.memberId || "")}\u0000${String(match.articleId || "")}`
                )
                : []
        );

    const blogs =
        Array.isArray(
            blogData.blogs
        )
            ? blogData.blogs.filter(
                blog =>
                    matchedKeys.has(
                        `${String(blog.member?.id || "")}\u0000${String(blog.articleId || "")}`
                    )
            )
            : [];

    return {
        group:
            group,

        member:
            member,

        generation:
            generation,

        startDate:
            startDate,

        endDate:
            endDate,

        keyword:
            keyword ||
            "",

        sort:
            sort ||
            "desc",

        postDates:
            Array.isArray(
                blogData.postDates
            )
                ? blogData.postDates
                : [],

        blogCount:
            blogs.length,

        blogs:
            blogs
    };
}
