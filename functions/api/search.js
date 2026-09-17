import {
    getGoogleAccessToken
} from "../lib/google.js";

import {
    members
} from "../data/member-data.js";


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
 * 検索インデックスファイルID取得
 * ========================================
 */

async function getSearchIndexFileId(
    accessToken,
    folderId,
    memberId
) {
    const fileName =
        `${memberId}.json`;

    const queryParts = [
        `'${escapeDriveQueryValue(folderId)}' in parents`,
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
 * 2025-01-28 -> 20250128
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
                            ) || 0,
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
                    (a, b) =>
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
                    : String(
                        member.memberId ||
                        ""
                    ),
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
 * API
 *
 * 第1段階：乃木坂46・個人メンバー検索
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
        !group ||
        !memberKey
    ) {
        return Response.json(
            {
                error:
                    "groupとmemberは必須です。"
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
     * メンバー確認
     * ========================================
     */

    const member =
        members[
            memberKey
        ];

    if (
        !member ||
        member.group !==
            group
    ) {
        return Response.json(
            {
                error:
                    "指定されたグループにそのメンバーは存在しません。"
            },
            {
                status:
                    404
            }
        );
    }

    if (
        !member.memberId ||
        !member.searchIndexFolderId
    ) {
        return Response.json(
            {
                error:
                    "このメンバーの検索インデックスは未設定です。"
            },
            {
                status:
                    400
            }
        );
    }

    if (
        !member.blogIndexFileId
    ) {
        return Response.json(
            {
                error:
                    "このメンバーのブログindexが未設定です。"
            },
            {
                status:
                    500
            }
        );
    }


    /*
     * ========================================
     * Driveから検索インデックス取得
     * ========================================
     */

    try {
        const accessToken =
            await getGoogleAccessToken(
                env
            );

        const searchIndexFileId =
            await getSearchIndexFileId(
                accessToken,
                member.searchIndexFolderId,
                member.memberId
            );

        if (
            !searchIndexFileId
        ) {
            return Response.json(
                {
                    error:
                        "検索インデックスが見つかりません。"
                },
                {
                    status:
                        404
                }
            );
        }

        const [
            searchIndexText,
            blogIndexText
        ] =
            await Promise.all([
                getDriveFileText(
                    accessToken,
                    searchIndexFileId
                ),
                getDriveFileText(
                    accessToken,
                    member.blogIndexFileId
                )
            ]);

        const searchIndexData =
            JSON.parse(
                searchIndexText
            );

        const blogIndexData =
            JSON.parse(
                blogIndexText
            );

        if (
            !Array.isArray(
                searchIndexData.articles
            )
        ) {
            throw new Error(
                "検索インデックスのarticlesが不正です。"
            );
        }

        if (
            !Array.isArray(
                blogIndexData.blogs
            )
        ) {
            throw new Error(
                "ブログindexのblogsが不正です。"
            );
        }


        /*
         * ========================================
         * 日付 + キーワード検索
         *
         * キーワードはタイトルと本文を対象
         * ========================================
         */

        const normalizedKeyword =
            normalizeSearchText(
                keyword.trim()
            );

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
                    startDate &&
                    dateKey <
                        startDate
                ) {
                    return;
                }

                if (
                    endDate &&
                    dateKey >
                        endDate
                ) {
                    return;
                }

                if (
                    normalizedKeyword
                ) {
                    const searchableText =
                        normalizeSearchText(
                            `${article.title || ""}\n${article.text || ""}`
                        );

                    if (
                        !searchableText.includes(
                            normalizedKeyword
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


        /*
         * ========================================
         * 通常ブログindexと突き合わせ
         *
         * 本文全文はレスポンスへ返さない
         * ========================================
         */

        const blogs =
            blogIndexData.blogs
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
                )
                .sort(
                    (a, b) => {
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
            "検索APIエラー:",
            error
        );

        return Response.json(
            {
                error:
                    "ブログ検索中にエラーが発生しました。"
            },
            {
                status:
                    500
            }
        );
    }
}
