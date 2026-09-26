import {
    members
} from "../data/member-data.js";

import {
    getGoogleAccessToken
} from "../lib/google.js";

import {
    CACHE_SECONDS,
    createInternalCacheRequest,
    createPublicCacheControl,
    createPrivateCacheControl
} from "../lib/cache-config.js";


/*
 * ========================================
 * Google Drive query用文字列エスケープ
 * ========================================
 */

function escapeDriveQueryValue(
    value
) {
    return String(
        value
    )
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        );
}


/*
 * ========================================
 * ブログJSON取得
 * ========================================
 */

export async function onRequestGet(
    context
) {
    const {
        request,
        env
    } =
        context;

    try {
        const url =
            new URL(
                request.url
            );

        const group =
            url.searchParams.get(
                "group"
            );

        const memberKey =
            url.searchParams.get(
                "member"
            );

        const articleId =
            url.searchParams.get(
                "articleId"
            );

        const detailFileId =
            url.searchParams.get(
                "detailFileId"
            );


        /*
         * ========================================
         * パラメータ確認
         * ========================================
         */

        if (
            !group
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "group is required"
                }),
                {
                    status:
                        400,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }

        if (
            !memberKey
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "member is required"
                }),
                {
                    status:
                        400,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }

        if (
            !articleId
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "articleId is required"
                }),
                {
                    status:
                        400,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }

        if (
            !/^\d+$/.test(
                articleId
            )
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "invalid articleId"
                }),
                {
                    status:
                        400,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }


        /*
         * ========================================
         * メンバー確認
         * ========================================
         */

        const member =
            members[
                memberKey
            ];

        if (
            !member
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "member not found"
                }),
                {
                    status:
                        404,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }

        if (
            member.group !==
                group
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "member does not belong to group"
                }),
                {
                    status:
                        400,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }

        if (
            !member.blogDataFolderId
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "blog data folder is not configured"
                }),
                {
                    status:
                        500,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }


        /*
         * ========================================
         * Cloudflare Cache確認
         *
         * キャッシュヒット時はGoogle認証・Drive検索・
         * JSON取得をすべて省略する。
         * ========================================
         */

        const cache =
            caches.default;

        const cacheRequest =
            createInternalCacheRequest(
                url.origin,
                `/__cache/blog-detail/${encodeURIComponent(group)}/${encodeURIComponent(memberKey)}/${encodeURIComponent(articleId)}`
            );

        try {
            const cachedResponse =
                await cache.match(
                    cacheRequest
                );

            if (
                cachedResponse
            ) {
                const cachedBlogData =
                    await cachedResponse.json();

                return new Response(
                    JSON.stringify(
                        cachedBlogData
                    ),
                    {
                        status:
                            200,

                        headers: {
                            "Content-Type":
                                "application/json; charset=utf-8",

                            "Cache-Control":
                                createPrivateCacheControl(
                                    CACHE_SECONDS.BLOG_DETAIL
                                )
                        }
                    }
                );
            }
        } catch (
            error
        ) {
            console.warn(
                `ブログ詳細キャッシュ取得失敗: ${group}/${memberKey}/${articleId}`,
                error
            );
        }


        /*
         * ========================================
         * Googleアクセストークン取得
         *
         * キャッシュミス時だけ取得する。
         * ========================================
         */

        const accessToken =
            await getGoogleAccessToken(
                env
            );


        /*
         * ========================================
         * JSONファイル取得
         *
         * detailFileId が利用できる場合は
         * Driveのファイル名検索を省略して直接取得する。
         *
         * 未指定・不正・取得失敗時は
         * 従来の articleId.json 検索へフォールバックする。
         * ========================================
         */

        let blogData =
            null;

        const safeDetailFileId =
            detailFileId &&
            /^[A-Za-z0-9_-]+$/.test(
                detailFileId
            )
                ? detailFileId
                : null;

        if (
            safeDetailFileId
        ) {
            try {
                const directDownloadUrl =
                    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
                        safeDetailFileId
                    )}?alt=media`;

                const directDownloadResponse =
                    await fetch(
                        directDownloadUrl,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${accessToken}`
                            }
                        }
                    );

                if (
                    directDownloadResponse.ok
                ) {
                    const directBlogData =
                        await directDownloadResponse.json();

                    if (
                        String(
                            directBlogData.articleId
                        ) ===
                            articleId &&
                        directBlogData.group?.id ===
                            group &&
                        directBlogData.member?.name ===
                            member.name
                    ) {
                        blogData =
                            directBlogData;
                    }
                }
            } catch (
                error
            ) {
                console.warn(
                    `ブログ詳細の直接取得失敗。従来検索へフォールバック: ${group}/${memberKey}/${articleId}`,
                    error
                );
            }
        }

        if (
            !blogData
        ) {
            const fileName =
                `${articleId}.json`;

            const query =
                `'${escapeDriveQueryValue(
                    member.blogDataFolderId
                )}' in parents and name = '${escapeDriveQueryValue(
                    fileName
                )}' and trashed = false`;

            const searchUrl =
                new URL(
                    "https://www.googleapis.com/drive/v3/files"
                );

            searchUrl.searchParams.set(
                "q",
                query
            );

            searchUrl.searchParams.set(
                "pageSize",
                "2"
            );

            searchUrl.searchParams.set(
                "fields",
                "files(id,name,mimeType)"
            );

            const searchResponse =
                await fetch(
                    searchUrl.toString(),
                    {
                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`
                        }
                    }
                );

            if (
                !searchResponse.ok
            ) {
                const errorText =
                    await searchResponse.text();

                throw new Error(
                    `Google Drive API error: ${searchResponse.status} ${errorText}`
                );
            }

            const searchData =
                await searchResponse.json();

            const files =
                Array.isArray(
                    searchData.files
                )
                    ? searchData.files
                    : [];

            if (
                files.length ===
                    0
            ) {
                return new Response(
                    JSON.stringify({
                        error:
                            "blog not found"
                    }),
                    {
                        status:
                            404,

                        headers: {
                            "Content-Type":
                                "application/json; charset=utf-8"
                        }
                    }
                );
            }

            const file =
                files[0];

            const downloadUrl =
                `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
                    file.id
                )}?alt=media`;

            const downloadResponse =
                await fetch(
                    downloadUrl,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`
                        }
                    }
                );

            if (
                !downloadResponse.ok
            ) {
                const errorText =
                    await downloadResponse.text();

                throw new Error(
                    `Google Drive file download error: ${downloadResponse.status} ${errorText}`
                );
            }

            blogData =
                await downloadResponse.json();
        }


        /*
         * ========================================
         * JSON内容確認
         * ========================================
         */

        if (
            String(
                blogData.articleId
            ) !==
                articleId
        ) {
            throw new Error(
                "Blog JSON articleId mismatch"
            );
        }

        if (
            blogData.group?.id !==
                group
        ) {
            throw new Error(
                "Blog JSON group mismatch"
            );
        }

        if (
            blogData.member?.name !==
                member.name
        ) {
            throw new Error(
                "Blog JSON member mismatch"
            );
        }


        /*
         * ========================================
         * Cloudflare Cache保存
         * ========================================
         */

        try {
            const cacheResponse =
                Response.json(
                    blogData,
                    {
                        headers: {
                            "Cache-Control":
                                createPublicCacheControl(
                                    CACHE_SECONDS.BLOG_DETAIL
                                )
                        }
                    }
                );

            await cache.put(
                cacheRequest,
                cacheResponse
            );
        } catch (
            error
        ) {
            console.warn(
                `ブログ詳細キャッシュ保存失敗: ${group}/${memberKey}/${articleId}`,
                error
            );
        }


        /*
         * ========================================
         * レスポンス
         * ========================================
         */

        return new Response(
            JSON.stringify(
                blogData
            ),
            {
                status:
                    200,

                headers: {
                    "Content-Type":
                        "application/json; charset=utf-8",

                    "Cache-Control":
                        createPrivateCacheControl(
                            CACHE_SECONDS.BLOG_DETAIL
                        )
                }
            }
        );

    } catch (
        error
    ) {
        console.error(
            error
        );

        return new Response(
            JSON.stringify({
                error:
                    "ブログデータの取得に失敗しました。"
            }),
            {
                status:
                    500,

                headers: {
                    "Content-Type":
                        "application/json; charset=utf-8"
                }
            }
        );
    }
}
