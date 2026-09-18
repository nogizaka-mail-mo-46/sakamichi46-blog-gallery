/*
 * ========================================
 * API共通処理
 * ========================================
 */

async function fetchJson(
    url,
    errorMessage
) {
    const response =
        await fetch(
            url
        );

    if (
        !response.ok
    ) {
        throw new Error(
            errorMessage
        );
    }

    return await response.json();
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
    articleId
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

    return await fetchJson(
        `/api/blog?${params.toString()}`,
        "ブログ詳細の取得に失敗しました。"
    );
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
