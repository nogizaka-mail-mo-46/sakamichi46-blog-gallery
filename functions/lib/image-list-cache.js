/*
 * ========================================
 * 画像一覧キャッシュキー作成
 * ========================================
 */

function createImageListCacheKey(
    request,
    group,
    memberKey,
    date,
    month
) {
    const cacheUrl =
        new URL(
            request.url
        );

    cacheUrl.search =
        "";

    cacheUrl.searchParams.set(
        "image-list",
        "1"
    );

    if (
        group
    ) {
        cacheUrl.searchParams.set(
            "group",
            group
        );
    }

    if (
        memberKey
    ) {
        cacheUrl.searchParams.set(
            "member",
            memberKey
        );
    }

    if (
        date
    ) {
        cacheUrl.searchParams.set(
            "date",
            date
        );
    }

    if (
        month
    ) {
        cacheUrl.searchParams.set(
            "month",
            month
        );
    }

    return new Request(
        cacheUrl.toString(),
        {
            method:
                "GET"
        }
    );
}


/*
 * ========================================
 * 画像一覧キャッシュ確認
 * ========================================
 */

export async function getCachedImageListResponse(
    request,
    group,
    memberKey,
    date,
    month
) {
    const cache =
        caches.default;

    const cacheKey =
        createImageListCacheKey(
            request,
            group,
            memberKey,
            date,
            month
        );

    return await cache.match(
        cacheKey
    );
}


/*
 * ========================================
 * 画像一覧キャッシュ保存
 * ========================================
 */

export function cacheImageListResponse(
    context,
    request,
    group,
    memberKey,
    date,
    month,
    response
) {
    const cache =
        caches.default;

    const cacheKey =
        createImageListCacheKey(
            request,
            group,
            memberKey,
            date,
            month
        );

    const cacheResponse =
        response.clone();

    cacheResponse.headers.set(
        "Cache-Control",
        "public, max-age=3600"
    );

    context.waitUntil(
        cache.put(
            cacheKey,
            cacheResponse
        )
    );
}
