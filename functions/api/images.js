import {
    members
} from "../data/members.js";


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
    return value
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
 * 指定フォルダ内の画像取得
 * ========================================
 */

async function getImagesFromFolder(
    accessToken,
    folderId,
    namePrefix = null
) {
    const images = [];

    let pageToken =
        null;

    do {
        const queryParts = [
            `'${escapeDriveQueryValue(folderId)}' in parents`,
            "trashed = false"
        ];

        if (
            namePrefix
        ) {
            queryParts.push(
                `name contains '${escapeDriveQueryValue(namePrefix)}'`
            );
        }

        const params =
            new URLSearchParams({
                q:
                    queryParts.join(
                        " and "
                    ),

                pageSize:
                    "1000",

                fields:
                    "nextPageToken,files(id,name,mimeType,createdTime)"
            });

        if (
            pageToken
        ) {
            params.set(
                "pageToken",
                pageToken
            );
        }

        const driveResponse =
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
            !driveResponse.ok
        ) {
            const errorText =
                await driveResponse.text();

            console.error(
                "Google Drive API error:",
                errorText
            );

            throw new Error(
                "Google Driveの画像一覧取得に失敗しました。"
            );
        }

        const driveData =
            await driveResponse.json();

        const imageFiles =
            driveData.files.filter(
                (file) => {
                    if (
                        !file.mimeType ||
                        !file.mimeType.startsWith(
                            "image/"
                        )
                    ) {
                        return false;
                    }

                    if (
                        namePrefix &&
                        (
                            !file.name ||
                            !file.name.startsWith(
                                namePrefix
                            )
                        )
                    ) {
                        return false;
                    }

                    return true;
                }
            );

        images.push(
            ...imageFiles
        );

        pageToken =
            driveData.nextPageToken ||
            null;

    } while (
        pageToken
    );

    return images;
}


/*
 * ========================================
 * 対象メンバー取得
 * ========================================
 */

function getTargetMembers(
    group
) {
    return Object.entries(
        members
    ).filter(
        ([
            key,
            member
        ]) => {
            if (
                !group
            ) {
                return true;
            }

            return (
                member.group ===
                group
            );
        }
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
    const results = [];

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
 * 投稿日取得
 *
 * 5メンバーずつ並列取得
 * ========================================
 */

async function getPostDates(
    accessToken,
    group
) {
    const targetMembers =
        getTargetMembers(
            group
        );

    const memberPostDates =
        await processInBatches(
            targetMembers,
            5,
            async ([
                memberKey,
                member
            ]) => {
                const images =
                    await getImagesFromFolder(
                        accessToken,
                        member.folderId
                    );

                const postDates =
                    new Set();

                images.forEach(
                    (image) => {
                        if (
                            !image.name
                        ) {
                            return;
                        }

                        const match =
                            image.name.match(
                                /^(\d{8})_/
                            );

                        if (
                            match
                        ) {
                            postDates.add(
                                match[1]
                            );
                        }
                    }
                );

                return Array.from(
                    postDates
                );
            }
        );

    const postDates =
        new Set(
            memberPostDates.flat()
        );

    return Array.from(
        postDates
    ).sort();
}


/*
 * ========================================
 * メンバー投稿日取得
 * ========================================
 */

async function getMemberPostDates(
    accessToken,
    member
) {
    const postDates =
        new Set();

    const images =
        await getImagesFromFolder(
            accessToken,
            member.folderId
        );

    images.forEach(
        (image) => {
            if (
                !image.name
            ) {
                return;
            }

            const match =
                image.name.match(
                    /^(\d{8})_/
                );

            if (
                match
            ) {
                postDates.add(
                    match[1]
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
 * カレンダーキャッシュキー作成
 * ========================================
 */

function createCalendarCacheKey(
    request,
    group,
    memberKey = null
) {
    const cacheUrl =
        new URL(
            request.url
        );

    cacheUrl.search =
        "";

    cacheUrl.searchParams.set(
        "calendar",
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
 * カレンダーキャッシュ確認
 * ========================================
 */

async function getCachedCalendarResponse(
    request,
    group,
    memberKey = null
) {
    const cache =
        caches.default;

    const cacheKey =
        createCalendarCacheKey(
            request,
            group,
            memberKey
        );

    return await cache.match(
        cacheKey
    );
}


/*
 * ========================================
 * カレンダー投稿日をキャッシュ保存
 * ========================================
 */

async function createAndCacheCalendarResponse(
    request,
    accessToken,
    group
) {
    const postDates =
        await getPostDates(
            accessToken,
            group
        );

    const response =
        Response.json({
            group:
                group,

            postDates:
                postDates
        });

    response.headers.set(
        "Cache-Control",
        "public, max-age=3600"
    );

    const cache =
        caches.default;

    const cacheKey =
        createCalendarCacheKey(
            request,
            group
        );

    await cache.put(
        cacheKey,
        response.clone()
    );

    return response;
}


/*
 * ========================================
 * メンバーカレンダーをキャッシュ保存
 * ========================================
 */

async function createAndCacheMemberCalendarResponse(
    request,
    accessToken,
    group,
    memberKey,
    member
) {
    const postDates =
        await getMemberPostDates(
            accessToken,
            member
        );

    const response =
        Response.json({
            member: {
                key:
                    memberKey,

                name:
                    member.name,

                group:
                    member.group
            },

            postDates:
                postDates
        });

    response.headers.set(
        "Cache-Control",
        "public, max-age=3600"
    );

    const cache =
        caches.default;

    const cacheKey =
        createCalendarCacheKey(
            request,
            group,
            memberKey
        );

    await cache.put(
        cacheKey,
        response.clone()
    );

    return response;
}


/*
 * ========================================
 * 指定日の画像取得
 *
 * 5メンバーずつ並列取得
 * ========================================
 */

async function getImagesByDate(
    accessToken,
    date,
    group
) {
    const targetMembers =
        getTargetMembers(
            group
        );

    const namePrefix =
        `${date}_`;

    const memberResults =
        await processInBatches(
            targetMembers,
            5,
            async ([
                memberKey,
                member
            ]) => {
                const images =
                    await getImagesFromFolder(
                        accessToken,
                        member.folderId,
                        namePrefix
                    );

                return images.map(
                    (image) => ({
                        id:
                            image.id,

                        name:
                            image.name,

                        mimeType:
                            image.mimeType,

                        createdTime:
                            image.createdTime,

                        memberKey:
                            memberKey,

                        memberName:
                            member.name,

                        group:
                            member.group
                    })
                );
            }
        );

    const result =
        memberResults.flat();

    result.sort(
        (a, b) =>
            b.name.localeCompare(
                a.name
            )
    );

    return result;
}


/*
 * ========================================
 * 指定月の画像取得
 *
 * 5メンバーずつ並列取得
 * ========================================
 */

async function getImagesByMonth(
    accessToken,
    month,
    group
) {
    const targetMembers =
        getTargetMembers(
            group
        );

    const memberResults =
        await processInBatches(
            targetMembers,
            5,
            async ([
                memberKey,
                member
            ]) => {
                const images =
                    await getImagesFromFolder(
                        accessToken,
                        member.folderId,
                        month
                    );

                return images.map(
                    (image) => ({
                        id:
                            image.id,

                        name:
                            image.name,

                        mimeType:
                            image.mimeType,

                        createdTime:
                            image.createdTime,

                        memberKey:
                            memberKey,

                        memberName:
                            member.name,

                        group:
                            member.group
                    })
                );
            }
        );

    const result =
        memberResults.flat();

    result.sort(
        (a, b) =>
            b.name.localeCompare(
                a.name
            )
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


    /*
     * ========================================
     * date形式チェック
     * ========================================
     */

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


    /*
     * ========================================
     * month形式チェック
     * ========================================
     */

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


    /*
     * ========================================
     * dateとmonth同時指定チェック
     * ========================================
     */

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


    /*
     * ========================================
     * group存在チェック
     * ========================================
     */

    if (
        group &&
        getTargetMembers(
            group
        ).length ===
            0
    ) {
        return Response.json(
            {
                error:
                    "存在しないグループです。"
            },
            {
                status:
                    404
            }
        );
    }


    /*
     * ========================================
     * カレンダー投稿日一覧
     *
     * member/date/monthすべて未指定
     *
     * ここだけGoogle Token取得より先に
     * Cloudflare Cacheを見る
     * ========================================
     */

    if (
        !memberKey &&
        !date &&
        !month
    ) {
        try {
            const cachedResponse =
                await getCachedCalendarResponse(
                    request,
                    group
                );

            /*
             * キャッシュヒット
             *
             * Googleへ一切アクセスせず
             * そのまま返却
             */

            if (
                cachedResponse
            ) {
                return cachedResponse;
            }


            /*
             * キャッシュなしの場合のみ
             * Google Access Token取得
             */

            const accessToken =
                await getGoogleAccessToken(
                    env
                );

            return await createAndCacheCalendarResponse(
                request,
                accessToken,
                group
            );

        } catch (
            error
        ) {
            console.error(
                error
            );

            return Response.json(
                {
                    error:
                        "投稿日一覧の取得中にエラーが発生しました。"
                },
                {
                    status:
                        500
                }
            );
        }
    }
    if (
        memberKey &&
        !date &&
        !month
    ) {
        const member =
            members[
                memberKey
            ];

        if (
            !member
        ) {
            return Response.json(
                {
                    error:
                        "存在しないメンバーです。"
                },
                {
                    status:
                        404
                }
            );
        }

        if (
            group &&
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

        try {
            const cachedResponse =
                await getCachedCalendarResponse(
                    request,
                    group,
                    memberKey
                );

            if (
                cachedResponse
            ) {
                return cachedResponse;
            }

            const accessToken =
                await getGoogleAccessToken(
                    env
                );

            return await createAndCacheMemberCalendarResponse(
                request,
                accessToken,
                group,
                memberKey,
                member
            );

        } catch (
            error
        ) {
            console.error(
                error
            );

            return Response.json(
                {
                    error:
                        "メンバー投稿日一覧の取得中にエラーが発生しました。"
                },
                {
                    status:
                        500
                }
            );
        }
    }


    /*
     * ========================================
     * ここから下は画像取得
     *
     * Google APIを使用するので
     * Access Tokenを取得
     * ========================================
     */

    try {
        const accessToken =
            await getGoogleAccessToken(
                env
            );


        /*
         * ========================================
         * メンバー指定あり
         * ========================================
         */

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
                return Response.json(
                    {
                        error:
                            "存在しないメンバーです。"
                    },
                    {
                        status:
                            404
                    }
                );
            }

            if (
                group &&
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


            let namePrefix =
                null;

            if (
                date
            ) {
                namePrefix =
                    `${date}_`;
            } else if (
                month
            ) {
                namePrefix =
                    month;
            }


            let images =
                await getImagesFromFolder(
                    accessToken,
                    member.folderId,
                    namePrefix
                );


            /*
             * 最終チェック
             */

            if (
                date
            ) {
                images =
                    images.filter(
                        (image) =>
                            image.name &&
                            image.name.startsWith(
                                `${date}_`
                            )
                    );
            }

            if (
                month
            ) {
                images =
                    images.filter(
                        (image) =>
                            image.name &&
                            image.name.startsWith(
                                month
                            )
                    );
            }


            images.sort(
                (a, b) =>
                    b.name.localeCompare(
                        a.name
                    )
            );


            return Response.json({
                member: {
                    key:
                        memberKey,

                    name:
                        member.name,

                    group:
                        member.group
                },

                date:
                    date,

                month:
                    month,

                images:
                    images
            });
        }


        /*
         * ========================================
         * メンバー未指定
         * date指定
         * ========================================
         */

        if (
            date
        ) {
            const images =
                await getImagesByDate(
                    accessToken,
                    date,
                    group
                );

            return Response.json({
                group:
                    group,

                date:
                    date,

                images:
                    images
            });
        }


        /*
         * ========================================
         * メンバー未指定
         * month指定
         * ========================================
         */

        if (
            month
        ) {
            const images =
                await getImagesByMonth(
                    accessToken,
                    month,
                    group
                );

            return Response.json({
                group:
                    group,

                month:
                    month,

                images:
                    images
            });
        }


        return Response.json(
            {
                error:
                    "不正なリクエストです。"
            },
            {
                status:
                    400
            }
        );

    } catch (
        error
    ) {
        console.error(
            error
        );

        return Response.json(
            {
                error:
                    "画像一覧の取得中にエラーが発生しました。"
            },
            {
                status:
                    500
            }
        );
    }
}
