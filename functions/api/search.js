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

const SEARCH_INDEX_FOLDER_IDS = {
    nogizaka46:
        "1ioTTDWiVdOLSPmELV1XJpF-XcXA7nvJa",

    sakurazaka46:
        "1YUBfz5NDBsyDbzRe8q309fZy2GQUX446",

    hinatazaka46:
        "1fZQoYoVNV5oIbZBOOw10_tjaUIYg7Ybx"
};

const SEARCH_BATCH_SIZE =
    5;

// 検索indexの「ファイル名 ↔ メンバー情報」対応表を
// Cloudflare Cache APIへ保持する時間。
// 新メンバー追加時は、対象が見つからなければ自動で再構築する。
const SEARCH_INDEX_MANIFEST_CACHE_SECONDS =
    86400;


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
 * 検索インデックス一覧取得
 *
 * 検索インデックスは全員分を同一フォルダに保存。
 * ALL検索時も、通常ブログindexはここでは取得しない。
 *
 * これにより1回のFunction内で
 * 「検索index + ブログindex」を全員分取得して
 * サブリクエスト数が増えすぎるのを防ぐ。
 * ========================================
 */

async function getSearchIndexFiles(
    accessToken,
    group
) {
    const searchIndexFolderId =
        SEARCH_INDEX_FOLDER_IDS[
            group
        ];

    if (
        !searchIndexFolderId
    ) {
        throw new Error(
            `検索インデックス保存フォルダが未設定です: ${group}`
        );
    }

    const queryParts = [
        `'${escapeDriveQueryValue(searchIndexFolderId)}' in parents`,
        "trashed = false"
    ];

    const files =
        [];

    let pageToken =
        null;

    do {
        const params =
            new URLSearchParams({
                q:
                    queryParts.join(
                        " and "
                    ),

                pageSize:
                    "1000",

                fields:
                    "nextPageToken,files(id,name)"
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
                "Google Drive search index list error:",
                errorText
            );

            throw new Error(
                "検索インデックス一覧の取得に失敗しました。"
            );
        }

        const data =
            await response.json();

        if (
            Array.isArray(
                data.files
            )
        ) {
            files.push(
                ...data.files.filter(
                    file =>
                        file?.id &&
                        /^\d+\.json$/.test(
                            String(
                                file.name ||
                                ""
                            )
                        )
                )
            );
        }

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
 * 検索indexメタ情報キャッシュ
 *
 * 個人・期別検索のたびに全員分の検索index本文を
 * Driveから取得しないため、ファイルID / メンバー名 /
 * 期 / memberId の対応だけをCache APIへ保存する。
 *
 * キャッシュがない最初の1回だけ全indexを確認する。
 * 以降は対象メンバー分のindexだけを取得する。
 * ========================================
 */

function createSearchManifestCacheRequest(
    origin,
    group
) {
    return new Request(
        `${origin}/__search-index-manifest/${encodeURIComponent(group)}`,
        {
            method:
                "GET"
        }
    );
}


async function buildSearchIndexManifest(
    accessToken,
    group
) {
    const files =
        await getSearchIndexFiles(
            accessToken,
            group
        );

    const rows =
        await processInBatches(
            files,
            SEARCH_BATCH_SIZE,
            async file => {
                const text =
                    await getDriveFileText(
                        accessToken,
                        file.id
                    );

                const data =
                    JSON.parse(
                        text
                    );

                return {
                    id:
                        file.id,

                    name:
                        file.name,

                    memberId:
                        String(
                            data.member?.id ||
                            ""
                        ),

                    memberName:
                        String(
                            data.member?.name ||
                            ""
                        ),

                    generation:
                        Number(
                            data.member?.generation
                        )
                };
            }
        );

    return rows.filter(
        row =>
            row.id &&
            row.memberId &&
            row.memberName &&
            Number.isInteger(
                row.generation
            )
    );
}


async function getSearchIndexManifest(
    accessToken,
    group,
    origin,
    forceRefresh = false
) {
    const cache =
        caches.default;

    const cacheRequest =
        createSearchManifestCacheRequest(
            origin,
            group
        );

    if (
        !forceRefresh
    ) {
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
                    cachedData
                )
            ) {
                return cachedData;
            }
        }
    }

    const manifest =
        await buildSearchIndexManifest(
            accessToken,
            group
        );

    const response =
        Response.json(
            manifest,
            {
                headers: {
                    "Cache-Control":
                        `public, max-age=${SEARCH_INDEX_MANIFEST_CACHE_SECONDS}`
                }
            }
        );

    await cache.put(
        cacheRequest,
        response.clone()
    );

    return manifest;
}


function filterSearchIndexFiles(
    manifest,
    targetMemberConditions
) {
    return manifest.filter(
        file =>
            targetMemberConditions.some(
                target =>
                    target.name ===
                        file.memberName &&
                    target.generation ===
                        file.generation
            )
    );
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
 * 検索対象判定用メンバー情報
 *
 * 検索index内の member.name / generation を使って
 * 個人・期別・ALLの対象を判定する。
 *
 * そのため、各メンバー設定へmemberIdを追加しなくても
 * 全員分の検索indexを利用できる。
 * ========================================
 */

function createTargetMemberConditions(
    targetMembers
) {
    return targetMembers.map(
        ([
            memberKey,
            member
        ]) => ({
            memberKey:
                memberKey,

            name:
                String(
                    member.name ||
                    ""
                ),

            generation:
                member.generation
        })
    );
}


/*
 * ========================================
 * 1検索インデックス分の検索
 *
 * ここでは一致した記事IDだけを返す。
 * 本文全文や一覧表示データは返さない。
 * ========================================
 */

async function searchIndexFile(
    accessToken,
    file,
    targetMemberConditions,
    conditions
) {
    const searchIndexText =
        await getDriveFileText(
            accessToken,
            file.id
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
            `検索インデックスのarticlesが不正です: ${file.name}`
        );
    }

    const indexMemberName =
        String(
            searchIndexData.member?.name ||
            ""
        );

    const indexGeneration =
        Number(
            searchIndexData.member?.generation
        );

    const targetMember =
        targetMemberConditions.find(
            target =>
                target.name ===
                    indexMemberName &&
                target.generation ===
                    indexGeneration
        );

    if (
        !targetMember
    ) {
        return [];
    }

    const memberId =
        String(
            searchIndexData.member?.id ||
            ""
        );

    if (
        !memberId
    ) {
        throw new Error(
            `検索インデックスのmember.idが不正です: ${file.name}`
        );
    }

    const matches =
        [];

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

            matches.push({
                articleId:
                    String(
                        article.articleId
                    ),

                memberId:
                    memberId,

                memberKey:
                    targetMember.memberKey
            });
        }
    );

    return matches;
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
 * 【重要】
 * このAPIは検索一致IDだけを返す。
 * 一覧表示用データは /api/blogs から別取得し、
 * ブラウザ側で一致IDと突き合わせる。
 *
 * これによりALL検索でも、1回のFunction内で
 * 全員分の検索indexとブログindexを二重取得しない。
 *
 * 現在は乃木坂46・櫻坂46・日向坂46に対応
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
        !SEARCH_INDEX_FOLDER_IDS[
            group
        ]
    ) {
        return Response.json(
            {
                error:
                    "現在の検索APIは指定されたグループに対応していません。"
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

        const targetMemberConditions =
            createTargetMemberConditions(
                targetMembers
            );

        let searchIndexManifest =
            await getSearchIndexManifest(
                accessToken,
                group,
                url.origin
            );

        let searchIndexFiles =
            filterSearchIndexFiles(
                searchIndexManifest,
                targetMemberConditions
            );

        // 新メンバー追加直後など、キャッシュ上に対象がいない場合だけ
        // manifestを作り直して再判定する。
        if (
            searchIndexFiles.length <
                targetMembers.length
        ) {
            searchIndexManifest =
                await getSearchIndexManifest(
                    accessToken,
                    group,
                    url.origin,
                    true
                );

            searchIndexFiles =
                filterSearchIndexFiles(
                    searchIndexManifest,
                    targetMemberConditions
                );
        }

        if (
            searchIndexFiles.length ===
                0
        ) {
            throw new Error(
                "検索対象メンバーの検索インデックスが見つかりません。"
            );
        }

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

        const searchResults =
            await processInBatches(
                searchIndexFiles,
                SEARCH_BATCH_SIZE,
                file =>
                    searchIndexFile(
                        accessToken,
                        file,
                        targetMemberConditions,
                        conditions
                    )
            );

        const matches =
            searchResults.flat();

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

            matchCount:
                matches.length,

            matches:
                matches
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
