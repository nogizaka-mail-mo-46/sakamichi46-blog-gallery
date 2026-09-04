import {
    members
} from "../data/member-data.js";


/*
 * ========================================
 * Google Access Token取得
 * ========================================
 */

async function getGoogleAccessToken(
    env
) {
    const tokenResponse =
        await fetch(
            "https://oauth2.googleapis.com/token",
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body:
                    new URLSearchParams({
                        client_id:
                            env.GOOGLE_CLIENT_ID.trim(),

                        client_secret:
                            env.GOOGLE_CLIENT_SECRET.trim(),

                        refresh_token:
                            env.GOOGLE_REFRESH_TOKEN.trim(),

                        grant_type:
                            "refresh_token"
                    })
            }
        );

    if (
        !tokenResponse.ok
    ) {
        const errorText =
            await tokenResponse.text();

        console.error(
            "Google token error:",
            errorText
        );

        throw new Error(
            "Google access tokenの取得に失敗しました。"
        );
    }

    const tokenData =
        await tokenResponse.json();

    return tokenData.access_token;
}


/*
 * ========================================
 * Drive検索用文字列のエスケープ
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
 * 一定件数ずつ並列処理
 * ========================================
 */

async function processInBatches(
    items,
    batchSize,
    processor
) {
    const results =
        [];

    for (
        let i = 0;
        i < items.length;
        i += batchSize
    ) {
        const batch =
            items.slice(
                i,
                i + batchSize
            );

        const batchResults =
            await Promise.all(
                batch.map(
                    processor
                )
            );

        results.push(
            ...batchResults
        );
    }

    return results;
}


/*
 * ========================================
 * 対象メンバー取得
 * ========================================
 */

function getTargetMembers(
    group,
    memberKey = null
) {
    if (
        memberKey
    ) {
        const member =
            members[
                memberKey
            ];

        if (
            !member
        ) {
            return [];
        }

        if (
            member.group !==
                group
        ) {
            return [];
        }

        return [
            [
                memberKey,
                member
            ]
        ];
    }

    return Object.entries(
        members
    ).filter(
        ([
            key,
            member
        ]) =>
            member.group ===
            group
    );
}


/*
 * ========================================
 * ブログJSONファイル一覧取得
 * ========================================
 */

async function getBlogJsonFiles(
    accessToken,
    folderId
) {
    const files =
        [];

    let pageToken =
        null;

    do {
        const queryParts = [
            `'${escapeDriveQueryValue(folderId)}' in parents`,
            "trashed = false"
        ];

        const params =
            new URLSearchParams({
                q:
                    queryParts.join(
                        " and "
                    ),

                pageSize:
                    "1000",

                fields:
                    "nextPageToken,files(id,name,mimeType,createdTime,modifiedTime)"
            });

        if (
            pageToken
        ) {
            params.set(
                "pageToken",
                pageToken
            );
        }

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
                "ブログJSON一覧の取得に失敗しました。"
            );
        }

        const data =
            await response.json();

        const jsonFiles =
            Array.isArray(
                data.files
            )
                ? data.files.filter(
                    file =>
                        file.name &&
                        file.name
                            .toLowerCase()
                            .endsWith(
                                ".json"
                            )
                )
                : [];

        files.push(
            ...jsonFiles
        );

        pageToken =
            data.nextPageToken ||
            null;

    } while (
        pageToken
    );

    return files;
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
            "ブログJSONの取得に失敗しました。"
        );
    }

    return await response.text();
}


/*
 * ========================================
 * プレビューテキスト生成
 * ========================================
 */

function createPreviewText(
    blocks,
    maxLength = 120
) {
    if (
        !Array.isArray(
            blocks
        )
    ) {
        return "";
    }

    const firstTextBlock =
        blocks.find(
            block =>
                block &&
                block.type ===
                    "text" &&
                typeof block.text ===
                    "string" &&
                block.text.trim()
        );

    if (
        !firstTextBlock
    ) {
        return "";
    }

    const normalized =
        firstTextBlock.text
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    if (
        normalized.length <=
            maxLength
    ) {
        return normalized;
    }

    return (
        normalized.substring(
            0,
            maxLength
        ) +
        "…"
    );
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
 * 一覧用ブログデータ生成
 * ========================================
 */

function createBlogSummary(
    blogData,
    memberKey,
    member
) {
    const images =
        Array.isArray(
            blogData.images
        )
            ? blogData.images
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
                blogData.articleId ||
                ""
            ),

        title:
            String(
                blogData.title ||
                ""
            ),

        timestamp:
            String(
                blogData.timestamp ||
                ""
            ),

        date:
            String(
                blogData.date ||
                ""
            ),

        member: {
            key:
                memberKey,

            id:
                blogData.member?.id
                    ? String(
                        blogData.member.id
                    )
                    : "",

            name:
                blogData.member?.name ||
                member.name ||
                ""
        },

        group: {
            id:
                blogData.group?.id ||
                member.group ||
                "",

            name:
                blogData.group?.name ||
                ""
        },

        imageCount:
            images.length,

        images:
            images,

        previewText:
            createPreviewText(
                blogData.blocks
            )
    };
}


/*
 * ========================================
 * 1メンバー分のブログ一覧取得
 * ========================================
 */

async function getMemberBlogs(
    accessToken,
    memberKey,
    member
) {
    if (
        !member.blogDataFolderId
    ) {
        console.warn(
            `blogDataFolderId未設定: ${memberKey}`
        );

        return [];
    }

    const files =
        await getBlogJsonFiles(
            accessToken,
            member.blogDataFolderId
        );

    const results =
        await processInBatches(
            files,
            10,
            async file => {
                try {
                    const text =
                        await getDriveFileText(
                            accessToken,
                            file.id
                        );

                    const blogData =
                        JSON.parse(
                            text
                        );

                    if (
                        !blogData ||
                        !blogData.articleId
                    ) {
                        console.warn(
                            `articleIdなし: ${file.name}`
                        );

                        return null;
                    }

                    return createBlogSummary(
                        blogData,
                        memberKey,
                        member
                    );

                } catch (
                    error
                ) {
                    console.error(
                        `ブログJSON読込失敗: ${file.name}`,
                        error
                    );

                    return null;
                }
            }
        );

    return results.filter(
        Boolean
    );
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
     * 対象メンバー
     * ========================================
     */

    const targetMembers =
        getTargetMembers(
            group,
            memberKey
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

        const allBlogs =
            memberResults.flat();


        /*
         * カレンダー用投稿日
         *
         * date/monthで絞る前の
         * 対象メンバー全投稿日を返す
         */

        const postDates =
            createPostDates(
                allBlogs
            );


        /*
         * 日付・月絞り込み
         */

        const filteredBlogs =
            filterBlogs(
                allBlogs,
                date,
                month
            );


        /*
         * 並び替え
         */

        const blogs =
            sortBlogs(
                filteredBlogs,
                sort
            );


        /*
         * レスポンス
         */

        return Response.json({
            group:
                group,

            member:
                memberKey,

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
        });

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
