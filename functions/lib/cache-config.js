/**
 * ============================================
 * ★ Cloudflare Cache 共通設定
 *
 * キャッシュ時間と内部キャッシュキー生成をここへ集約する。
 * APIごとの取得・検証ロジックは各API側に残す。
 * ============================================
 */

export const CACHE_SECONDS = Object.freeze({
    // /api/search: 検索indexのファイル一覧・manifest
    SEARCH_INDEX_METADATA: 86400,

    // /api/blogs: グループ全体 / 個人 / 期別の元ブログ一覧
    BLOGS_SOURCE: 3600,

    // /api/blogs: 絞り込み・並び替え後の完成レスポンス
    BLOGS_RESPONSE: 600,

    // /api/blog: ブログ詳細JSON
    BLOG_DETAIL: 3600,

    // /api/member-icons: グループ別アイコン一覧
    MEMBER_ICONS: 3600
});


export function createInternalCacheRequest(
    origin,
    pathname,
    searchParams = null
) {
    const url =
        new URL(
            pathname,
            origin
        );

    if (
        searchParams
    ) {
        for (
            const [key, value] of searchParams
        ) {
            url.searchParams.append(
                key,
                value
            );
        }
    }

    return new Request(
        url.toString(),
        {
            method:
                "GET"
        }
    );
}


export function createPublicCacheControl(
    seconds
) {
    return `public, max-age=${seconds}`;
}


export function createPrivateCacheControl(
    seconds
) {
    return `private, max-age=${seconds}`;
}
