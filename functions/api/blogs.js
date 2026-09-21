import {
    getGoogleAccessToken
} from "../lib/google.js";


import {
    members
} from "../data/member-data.js";


import {
    escapeDriveQueryValue,
    processInBatches,
    getTargetMembers
} from "../lib/api-common.js";


/*
 * ========================================
 * index.json検索
 * ========================================
 */

async function getBlogIndexFile(
    accessToken,
    folderId
) {
    const queryParts = [
        `'${escapeDriveQueryValue(folderId)}' in parents`,
        `name = 'index.json'`,
        "trashed = false"
    ];

    const params =
        new URLSearchParams({
            q:
                queryParts.join(
                    " and "
                ),

            pageSize:
                "1",

            fields:
                "files(id,name,modifiedTime)"
        });

    const response =
        await fetch(
            `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );

    if (
        !response.ok
    ) {
        const errorText =
            await response.text();

        console.error(
            "Google Drive API error:",
            errorText
        );

        throw new Error(
            "index.jsonの検索に失敗しました。"
        );
    }

    const data =
        await response.json();

    if (
        !Array.isArray(
            data.files
        ) ||
        data.files.length ===
            0
    ) {
        return null;
    }

    return data.files[0];
}


/*
 * ========================================
 * Driveファイル本文取得
 * ========================================
 */

async function getDriveFileText(
    accessToken,
    fileId
) {
    const response =
        await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );

    if (
        !response.ok
    ) {
        const errorText =
            await response.text();

        console.error(
            "Google Drive file error:",
            fileId,
            errorText
        );

        throw new Error(
            "index.jsonの取得に失敗しました。"
        );
    }

    return await response.text();
}


/*
 * ========================================
 * 日付キー生成
 *
 * 2026-08-11
 * ↓
 * 20260811
 * ========================================
 */

function createDateKey(
    date
) {
    if (
        typeof date !==
            "string"
    ) {
        return "";
    }

    const dateKey =
        date.replace(
            /-/g,
            ""
        );

    return /^\d{8}$/.test(
        dateKey
    )
        ? dateKey
        : "";
}


/*
 * ========================================
 * index記事データ整形
 * ========================================
 */

function createBlogSummary(
    blog,
    memberKey,
    member,
    indexData
) {
    const images =
        Array.isArray(
            blog.images
        )
            ? blog.images
                .filter(
                    image =>
                        image &&
                        image.fileId
                )
                .map(
                    image => ({
                        imageIndex:
                            Number(
                                image.imageIndex
                            ) ||
                            0,

                        fileId:
                            String(
                                image.fileId
                            ),

                        fileName:
                            image.fileName
                                ? String(
                                    image.fileName
                                )
                                : ""
                    })
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a.imageIndex -
                        b.imageIndex
                )
            : [];

    return {
        articleId:
            String(
                blog.articleId ||
                ""
            ),

        title:
            String(
                blog.title ||
                ""
            ),

        timestamp:
            String(
                blog.timestamp ||
                ""
            ),

        date:
            String(
                blog.date ||
                ""
            ),

        member: {
            key:
                memberKey,

            id:
                indexData.member?.id
                    ? String(
                        indexData.member.id
                    )
                    : "",

            name:
                indexData.member?.name ||
                member.name ||
                ""
        },

        group: {
            id:
                indexData.group?.id ||
                member.group ||
                "",

            name:
                indexData.group?.name ||
                ""
        },

        imageCount:
            images.length,

        images:
            images,

        previewText:
            typeof blog.previewText ===
                "string"
                ? blog.previewText
                : ""
    };
}


/*
 * ========================================
 * 1メンバー分のブログ一覧取得
 *
 * index.jsonだけを取得する
 * ========================================
 */

async function getMemberBlogs(
    accessToken,
    memberKey,
    member
) {
    /*
     * ========================================
     * index.json ファイルID取得
     *
     * blogIndexFileId が設定済みなら
     * Drive検索を省略して直接取得する
     *
     * 未設定なら従来どおり
     * blogDataFolderId から検索する
     * ========================================
     */

    let indexFileId =
        member.blogIndexFileId ||
        null;


    /*
     * ========================================
     * 従来方式
     * ========================================
     */

    if (
        !indexFileId
    ) {

        if (
            !member.blogDataFolderId
        ) {
            console.warn(
                `blogDataFolderId未設定: ${memberKey}`
            );

            return [];
        }

        const indexFile =
            await getBlogIndexFile(
                accessToken,
                member.blogDataFolderId
            );

        if (
            !indexFile
        ) {
            console.warn(
                `index.jsonなし: ${memberKey}`
            );

            return [];
        }

        indexFileId =
            indexFile.id;
    }


    /*
     * ========================================
     * index.json取得
     * ========================================
     */

    const text =
        await getDriveFileText(
            accessToken,
            indexFileId
        );


    /*
     * ========================================
     * JSON解析
     * ========================================
     */

    let indexData;

    try {

        indexData =
            JSON.parse(
                text
            );

    } catch (
        error
    ) {

        console.error(
            `index.json解析失敗: ${memberKey}`,
            error
        );

        return [];
    }


    /*
     * ========================================
     * blogs配列チェック
     * ========================================
     */

    if (
        !indexData ||
        !Array.isArray(
            indexData.blogs
        )
    ) {

        console.warn(
            `index.jsonのblogsが不正: ${memberKey}`
        );

        return [];
    }


    /*
     * ========================================
     * 一覧データ生成
     * ========================================
     */

    return indexData.blogs
        .filter(
            blog =>
                blog &&
                blog.articleId
        )
        .map(
            blog =>
                createBlogSummary(
                    blog,
                    memberKey,
                    member,
                    indexData
                )
        );
}


/*
 * ========================================
 * グループ全体ブログ取得
 *
 * Cloudflare Cache APIで
 * グループごとに1時間キャッシュする
 * ========================================
 */

async function getGroupBlogs(
    group,
    env,
    origin
) {

    /*
     * ========================================
     * キャッシュキー
     * ========================================
     */

    const cache =
        caches.default;

    const cacheRequest =
        new Request(
            `${origin}/__cache/blog-group/` +
            `${encodeURIComponent(group)}`,
            {
                method:
                    "GET"
            }
        );


    /*
     * ========================================
     * キャッシュ確認
     * ========================================
     */

    try {

        const cachedResponse =
            await cache.match(
                cacheRequest
            );

        if (
            cachedResponse
        ) {

            const cachedData =
                await cachedResponse.json();

            if (
                Array.isArray(
                    cachedData.blogs
                )
            ) {

                return cachedData.blogs;
            }
        }

    } catch (
        error
    ) {

        console.warn(
            `グループキャッシュ取得失敗: ${group}`,
            error
        );
    }


    /*
     * ========================================
     * 対象グループ全メンバー
     * ========================================
     */

    const targetMembers =
        getTargetMembers(
            group
        );


    /*
     * ========================================
     * Googleアクセストークン
     *
     * キャッシュミス時だけ取得する
     * ========================================
     */

    const accessToken =
        await getGoogleAccessToken(
            env
        );


    /*
     * ========================================
     * Driveからブログ取得
     * ========================================
     */

    const memberResults =
        await processInBatches(
            targetMembers,
            5,
            async ([
                targetMemberKey,
                member
            ]) =>
                await getMemberBlogs(
                    accessToken,
                    targetMemberKey,
                    member
                )
        );

    const allBlogs =
        memberResults.flat();


    /*
     * ========================================
     * 1時間キャッシュ
     * ========================================
     */

    try {

        const cacheResponse =
            Response.json(
                {
                    blogs:
                        allBlogs
                },
                {
                    headers: {
                        "Cache-Control":
                            "public, max-age=3600"
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
            `グループキャッシュ保存失敗: ${group}`,
            error
        );
    }


    return allBlogs;
}


/*
 * ========================================
 * 対象メンバーだけのブログ取得
 *
 * 個人・期別表示ではグループ全員分を
 * 読まず、必要なメンバーのindex.jsonだけ
 * 取得して1時間キャッシュする。
 *
 * ALL表示は従来のグループキャッシュを使う。
 * ========================================
 */

async function getScopedBlogs(
    group,
    targetMembers,
    memberKey,
    generation,
    env,
    origin
) {
    if (
        !memberKey &&
        generation ===
            null
    ) {
        return await getGroupBlogs(
            group,
            env,
            origin
        );
    }

    const cache =
        caches.default;

    const scopeKey =
        memberKey
            ? `member/${encodeURIComponent(memberKey)}`
            : `generation/${encodeURIComponent(String(generation))}`;

    const cacheRequest =
        new Request(
            `${origin}/__cache/blog-scope/` +
            `${encodeURIComponent(group)}/` +
            scopeKey,
            {
                method:
                    "GET"
            }
        );

    try {
        const cachedResponse =
            await cache.match(
                cacheRequest
            );

        if (
            cachedResponse
        ) {
            const cachedData =
                await cachedResponse.json();

            if (
                Array.isArray(
                    cachedData.blogs
                )
            ) {
                return cachedData.blogs;
            }
        }
    } catch (
        error
    ) {
        console.warn(
            `対象別キャッシュ取得失敗: ${group}/${scopeKey}`,
            error
        );
    }

    const accessToken =
        await getGoogleAccessToken(
            env
        );

    const memberResults =
        await processInBatches(
            targetMembers,
            5,
            async ([
                targetMemberKey,
                member
            ]) =>
                await getMemberBlogs(
                    accessToken,
                    targetMemberKey,
                    member
                )
        );

    const blogs =
        memberResults.flat();

    try {
        const cacheResponse =
            Response.json(
                {
                    blogs:
                        blogs
                },
                {
                    headers: {
                        "Cache-Control":
                            "public, max-age=3600"
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
            `対象別キャッシュ保存失敗: ${group}/${scopeKey}`,
            error
        );
    }

    return blogs;
}


/*
 * ========================================
 * 投稿日一覧生成
 * ========================================
 */

function createPostDates(
    blogs
) {
    const postDates =
        new Set();

    blogs.forEach(
        blog => {
            const dateKey =
                createDateKey(
                    blog.date
                );

            if (
                dateKey
            ) {
                postDates.add(
                    dateKey
                );
            }
        }
    );

    return Array.from(
        postDates
    ).sort();
}


/*
 * ========================================
 * ブログ絞り込み
 * ========================================
 */

function filterBlogs(
    blogs,
    date,
    month
) {
    return blogs.filter(
        blog => {
            const dateKey =
                createDateKey(
                    blog.date
                );

            if (
                date
            ) {
                return (
                    dateKey ===
                    date
                );
            }

            if (
                month
            ) {
                return dateKey.startsWith(
                    month
                );
            }

            return true;
        }
    );
}


/*
 * ========================================
 * ブログ並び替え
 * ========================================
 */

function sortBlogs(
    blogs,
    sort
) {
    const result =
        [
            ...blogs
        ];

    result.sort(
        (
            a,
            b
        ) => {
            const comparison =
                String(
                    a.timestamp
                ).localeCompare(
                    String(
                        b.timestamp
                    )
                );

            if (
                sort ===
                    "asc"
            ) {
                return comparison;
            }

            return -comparison;
        }
    );

    return result;
}


/*
 * ========================================
 * APIレスポンスキャッシュ
 *
 * 同じ検索条件の再表示時は、
 * グループ全体キャッシュのJSON解析・
 * メンバー/日付絞り込み・並び替えを省略する。
 *
 * 元データ側が1時間キャッシュのため、
 * ここでは短めの10分キャッシュとする。
 * ========================================
 */

const BLOGS_RESPONSE_CACHE_SECONDS =
    600;


function createBlogsResponseCacheRequest(
    url
) {
    const cacheUrl =
        new URL(
            `${url.origin}/__cache/blogs-response`
        );

    const sortedParams =
        Array.from(
            url.searchParams.entries()
        ).sort(
            ([aKey, aValue], [bKey, bValue]) => {
                const keyComparison =
                    aKey.localeCompare(
                        bKey
                    );

                if (
                    keyComparison !== 0
                ) {
                    return keyComparison;
                }

                return aValue.localeCompare(
                    bValue
                );
            }
        );

    sortedParams.forEach(
        ([key, value]) => {
            cacheUrl.searchParams.append(
                key,
                value
            );
        }
    );

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
 * API
 * ========================================
 */

export async function onRequestGet(
    context
) {
    const {
        request,
        env
    } = context;

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

    const generationParam =
        url.searchParams.get(
            "generation"
        );

    const generation =
        generationParam ===
            null
            ? null
            : Number(
                generationParam
            );

    const date =
        url.searchParams.get(
            "date"
        );

    const month =
        url.searchParams.get(
            "month"
        );

    const sort =
        url.searchParams.get(
            "sort"
        ) ||
        "desc";


    /*
     * ========================================
     * パラメータチェック
     * ========================================
     */

    if (
        !group
    ) {
        return Response.json(
            {
                error:
                    "groupは必須です。"
            },
            {
                status:
                    400
            }
        );
    }

    if (
        generation !==
            null &&
        (
            !Number.isInteger(
                generation
            ) ||
            generation <=
                0
        )
    ) {
        return Response.json(
            {
                error:
                    "generationは正の整数で指定してください。"
            },
            {
                status:
                    400
            }
        );
    }

    if (
        memberKey &&
        generation !==
            null
    ) {
        return Response.json(
            {
                error:
                    "memberとgenerationは同時に指定できません。"
            },
            {
                status:
                    400
            }
        );
    }

    if (
        date &&
        !/^\d{8}$/.test(
            date
        )
    ) {
        return Response.json(
            {
                error:
                    "dateの形式が正しくありません。"
            },
            {
                status:
                    400
            }
        );
    }

    if (
        month &&
        !/^\d{6}$/.test(
            month
        )
    ) {
        return Response.json(
            {
                error:
                    "monthの形式が正しくありません。"
            },
            {
                status:
                    400
            }
        );
    }

    if (
        date &&
        month
    ) {
        return Response.json(
            {
                error:
                    "dateとmonthは同時に指定できません。"
            },
            {
                status:
                    400
            }
        );
    }

    if (
        sort !==
            "asc" &&
        sort !==
            "desc"
    ) {
        return Response.json(
            {
                error:
                    "sortはascまたはdescを指定してください。"
            },
            {
                status:
                    400
            }
        );
    }


    /*
     * ========================================
     * 完成済みレスポンスキャッシュ確認
     *
     * パラメータ検証後に確認することで、
     * 不正なリクエストは従来どおり
     * 400を返す。
     * ========================================
     */

    const responseCache =
        caches.default;

    const responseCacheRequest =
        createBlogsResponseCacheRequest(
            url
        );

    try {
        const cachedResponse =
            await responseCache.match(
                responseCacheRequest
            );

        if (
            cachedResponse
        ) {
            return cachedResponse;
        }
    } catch (
        error
    ) {
        console.warn(
            "ブログ一覧レスポンスキャッシュ取得失敗:",
            error
        );
    }


    /*
     * ========================================
     * 対象メンバー
     * ========================================
     */

    const targetMembers =
        getTargetMembers(
            group,
            memberKey,
            generation
        );

    if (
        targetMembers.length ===
            0
    ) {
        return Response.json(
            {
                error:
                    memberKey
                        ? "指定されたグループにそのメンバーは存在しません。"
                        : generation !==
                            null
                            ? "指定されたグループにその期は存在しません。"
                            : "存在しないグループです。"
            },
            {
                status:
                    404
            }
        );
    }


    /*
     * ========================================
     * ブログ取得
     * ========================================
     */

    try {

        const allBlogs =
            await getScopedBlogs(
                group,
                targetMembers,
                memberKey,
                generation,
                env,
                url.origin
            );


        /*
         * ========================================
         * カレンダー用投稿日
         *
         * date / monthで絞る前の
         * 対象メンバー全投稿日を返す
         * ========================================
         */

        const postDates =
            createPostDates(
                allBlogs
            );


        /*
         * ========================================
         * 日付・月絞り込み
         * ========================================
         */

        const filteredBlogs =
            filterBlogs(
                allBlogs,
                date,
                month
            );


        /*
         * ========================================
         * 並び替え
         * ========================================
         */

        const blogs =
            sortBlogs(
                filteredBlogs,
                sort
            );


        /*
         * ========================================
         * レスポンス
         * ========================================
         */

        const response =
            Response.json(
                {
                    group:
                        group,

                    member:
                        memberKey,

                    generation:
                        generation,

                    date:
                        date,

                    month:
                        month,

                    sort:
                        sort,

                    postDates:
                        postDates,

                    blogCount:
                        blogs.length,

                    blogs:
                        blogs
                },
                {
                    headers: {
                        "Cache-Control":
                            `public, max-age=${BLOGS_RESPONSE_CACHE_SECONDS}`
                    }
                }
            );

        try {
            const cacheWrite =
                responseCache.put(
                    responseCacheRequest,
                    response.clone()
                );

            if (
                typeof context.waitUntil ===
                    "function"
            ) {
                context.waitUntil(
                    cacheWrite
                );
            } else {
                await cacheWrite;
            }
        } catch (
            error
        ) {
            console.warn(
                "ブログ一覧レスポンスキャッシュ保存失敗:",
                error
            );
        }

        return response;

    } catch (
        error
    ) {
        console.error(
            error
        );

        return Response.json(
            {
                error:
                    "ブログ一覧の取得中にエラーが発生しました。"
            },
            {
                status:
                    500
            }
        );
    }
}
