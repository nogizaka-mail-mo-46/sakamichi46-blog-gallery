import {
    getGoogleAccessToken
} from "../lib/google.js";

import {
    members
} from "../data/member-data.js";


/*
 * ========================================
 * 検索設定
 * ========================================
 */

const NOGIZAKA_SEARCH_INDEX_FOLDER_ID =
    "1ioTTDWiVdOLSPmELV1XJpF-XcXA7nvJa";

const SEARCH_BATCH_SIZE =
    5;


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
 *
 * member指定       : 個人
 * generation指定   : 指定期
 * どちらも未指定   : グループ全員
 * ========================================
 */

function getTargetMembers(
    group,
    memberKey = null,
    generation = null
) {
    if (
        memberKey
    ) {
        const member =
            members[
                memberKey
            ];

        if (
            !member ||
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
        ]) => {
            if (
                member.group !==
                    group
            ) {
                return false;
            }

            if (
                generation !==
                    null
            ) {
                return (
                    member.generation ===
                    generation
                );
            }

            return true;
        }
    );
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
 * Google Driveファイル本文取得
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
            "Google Driveファイルの取得に失敗しました。"
        );
    }

    return await response.text();
}


/*
 * ========================================
 * 検索インデックスファイルID取得
 *
 * ファイル名：{memberId}.json
 * ========================================
 */

async function getSearchIndexFileId(
    accessToken,
    memberId
) {
    const fileName =
        `${memberId}.json`;

    const queryParts = [
        `'${escapeDriveQueryValue(NOGIZAKA_SEARCH_INDEX_FOLDER_ID)}' in parents`,
        `name = '${escapeDriveQueryValue(fileName)}'`,
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
                "files(id,name)"
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
            "Google Drive search error:",
            errorText
        );

        throw new Error(
            "検索インデックスの検索に失敗しました。"
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

    return data.files[0].id;
}


/*
 * ========================================
 * 検索文字列正規化
 *
 * - Unicode NFKC
 * - 小文字化
 * ========================================
 */

function normalizeSearchText(
    value
) {
    return String(
        value ||
        ""
    )
        .normalize(
            "NFKC"
        )
        .toLocaleLowerCase(
            "ja-JP"
        );
}


/*
 * ========================================
 * 日付キー生成
 *
 * 2025-01-28
 * ↓
 * 20250128
 * ========================================
 */

function createDateKey(
    date
) {
    const dateKey =
        String(
            date ||
            ""
        ).replace(
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
 * 一覧表示用ブログデータ生成
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
 * 1メンバー分の検索
 *
 * 1. 通常ブログindexを取得
 * 2. member.idを取得
 * 3. {member.id}.json を検索
 * 4. 日付・キーワードで絞り込み
 * 5. 通常ブログindexと突き合わせ
 *
 * 本文全文はレスポンスへ返さない
 * ========================================
 */

async function searchMemberBlogs(
    accessToken,
    memberKey,
    member,
    conditions
) {
    if (
        !member.blogIndexFileId
    ) {
        throw new Error(
            `ブログindexが未設定です: ${memberKey}`
        );
    }

    const blogIndexText =
        await getDriveFileText(
            accessToken,
            member.blogIndexFileId
        );

    const blogIndexData =
        JSON.parse(
            blogIndexText
        );

    if (
        !Array.isArray(
            blogIndexData.blogs
        )
    ) {
        throw new Error(
            `ブログindexのblogsが不正です: ${memberKey}`
        );
    }

    const memberId =
        blogIndexData.member?.id
            ? String(
                blogIndexData.member.id
            )
            : String(
                member.memberId ||
                ""
            );

    if (
        !memberId
    ) {
        throw new Error(
            `memberIdを取得できません: ${memberKey}`
        );
    }

    const searchIndexFileId =
        await getSearchIndexFileId(
            accessToken,
            memberId
        );

    if (
        !searchIndexFileId
    ) {
        throw new Error(
            `検索インデックスが見つかりません: ${memberKey}`
        );
    }

    const searchIndexText =
        await getDriveFileText(
            accessToken,
            searchIndexFileId
        );

    const searchIndexData =
        JSON.parse(
            searchIndexText
        );

    if (
        !Array.isArray(
            searchIndexData.articles
        )
    ) {
        throw new Error(
            `検索インデックスのarticlesが不正です: ${memberKey}`
        );
    }

    const matchedArticleIds =
        new Set();

    searchIndexData.articles.forEach(
        article => {
            if (
                !article ||
                !article.articleId
            ) {
                return;
            }

            const dateKey =
                createDateKey(
                    article.date
                );

            if (
                !dateKey
            ) {
                return;
            }

            if (
                conditions.startDate &&
                dateKey <
                    conditions.startDate
            ) {
                return;
            }

            if (
                conditions.endDate &&
                dateKey >
                    conditions.endDate
            ) {
                return;
            }

            if (
                conditions.normalizedKeyword
            ) {
                const searchableText =
                    normalizeSearchText(
                        `${article.title || ""}\n${article.text || ""}`
                    );

                if (
                    !searchableText.includes(
                        conditions.normalizedKeyword
                    )
                ) {
                    return;
                }
            }

            matchedArticleIds.add(
                String(
                    article.articleId
                )
            );
        }
    );

    return blogIndexData.blogs
        .filter(
            blog =>
                blog &&
                matchedArticleIds.has(
                    String(
                        blog.articleId ||
                        ""
                    )
                )
        )
        .map(
            blog =>
                createBlogSummary(
                    blog,
                    memberKey,
                    member,
                    blogIndexData
                )
        );
}


/*
 * ========================================
 * API
 *
 * 【検索対象】
 * - 個人メンバー
 * - 期別
 * - ALL
 *
 * 現在は乃木坂46のみ対応
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
        generationParam !==
            null
            ? Number(
                generationParam
            )
            : null;

    const startDate =
        url.searchParams.get(
            "startDate"
        );

    const endDate =
        url.searchParams.get(
            "endDate"
        );

    const keyword =
        url.searchParams.get(
            "keyword"
        ) ||
        "";

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
        group !==
            "nogizaka46"
    ) {
        return Response.json(
            {
                error:
                    "現在の検索APIは乃木坂46のみ対応しています。"
            },
            {
                status:
                    400
            }
        );
    }

    if (
        generationParam !==
            null &&
        !Number.isInteger(
            generation
        )
    ) {
        return Response.json(
            {
                error:
                    "generationの形式が正しくありません。"
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
        startDate &&
        !/^\d{8}$/.test(
            startDate
        )
    ) {
        return Response.json(
            {
                error:
                    "startDateの形式が正しくありません。"
            },
            {
                status:
                    400
            }
        );
    }

    if (
        endDate &&
        !/^\d{8}$/.test(
            endDate
        )
    ) {
        return Response.json(
            {
                error:
                    "endDateの形式が正しくありません。"
            },
            {
                status:
                    400
            }
        );
    }

    if (
        startDate &&
        endDate &&
        startDate >
            endDate
    ) {
        return Response.json(
            {
                error:
                    "startDateはendDate以前の日付を指定してください。"
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
     * 対象メンバー確認
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
                    "検索対象のメンバーが見つかりません。"
            },
            {
                status:
                    404
            }
        );
    }


    /*
     * ========================================
     * 検索実行
     * ========================================
     */

    try {
        const accessToken =
            await getGoogleAccessToken(
                env
            );

        const conditions = {
            startDate:
                startDate,

            endDate:
                endDate,

            normalizedKeyword:
                normalizeSearchText(
                    keyword.trim()
                )
        };

        const memberResults =
            await processInBatches(
                targetMembers,
                SEARCH_BATCH_SIZE,
                ([
                    targetMemberKey,
                    targetMember
                ]) =>
                    searchMemberBlogs(
                        accessToken,
                        targetMemberKey,
                        targetMember,
                        conditions
                    )
            );

        const blogs =
            memberResults
                .flat()
                .sort(
                    (
                        a,
                        b
                    ) => {
                        const comparison =
                            String(
                                a.timestamp ||
                                a.date
                            ).localeCompare(
                                String(
                                    b.timestamp ||
                                    b.date
                                )
                            );

                        return sort ===
                            "asc"
                            ? comparison
                            : -comparison;
                    }
                );

        return Response.json({
            group:
                group,

            member:
                memberKey,

            generation:
                generation,

            startDate:
                startDate,

            endDate:
                endDate,

            keyword:
                keyword,

            sort:
                sort,

            blogCount:
                blogs.length,

            blogs:
                blogs
        });

    } catch (
        error
    ) {
        console.error(
            "Blog search error:",
            error
        );

        return Response.json(
            {
                error:
                    error?.message ||
                    "ブログ検索に失敗しました。"
            },
            {
                status:
                    500
            }
        );
    }
}
