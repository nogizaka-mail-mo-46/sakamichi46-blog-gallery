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
 * - month
 * - date
 * - sort
 * ========================================
 */

export async function fetchBlogs({
    group,
    member = null,
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
