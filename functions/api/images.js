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
 *
 * namePrefixを指定した場合は
 * Google Drive側で先に候補を絞る
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

                    /*
                     * Driveの contains は
                     * 前方一致専用ではないため、
                     * 最後にstartsWithで厳密チェック
                     */

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
 * 投稿日取得
 *
 * カレンダー作成用なので
 * ここだけは全期間を見る必要がある
 * ========================================
 */

async function getPostDates(
    accessToken,
    group
) {
    const postDates =
        new Set();

    const targetMembers =
        getTargetMembers(
            group
        );

    for (
        const [
            memberKey,
            member
        ] of targetMembers
    ) {
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
    }

    return Array.from(
        postDates
    ).sort();
}


/*
 * ========================================
 * 指定日の画像取得
 * ========================================
 */

async function getImagesByDate(
    accessToken,
    date,
    group
) {
    const result = [];

    const targetMembers =
        getTargetMembers(
            group
        );

    const namePrefix =
        `${date}_`;

    for (
        const [
            memberKey,
            member
        ] of targetMembers
    ) {
        const images =
            await getImagesFromFolder(
                accessToken,
                member.folderId,
                namePrefix
            );

        images.forEach(
            (image) => {
                result.push({
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
                });
            }
        );
    }

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
 * ========================================
 */

async function getImagesByMonth(
    accessToken,
    month,
    group
) {
    const result = [];

    const targetMembers =
        getTargetMembers(
            group
        );

    for (
        const [
            memberKey,
            member
        ] of targetMembers
    ) {
        const images =
            await getImagesFromFolder(
                accessToken,
                member.folderId,
                month
            );

        images.forEach(
            (image) => {
                result.push({
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
                });
            }
        );
    }

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


            /*
             * date/monthに応じて
             * Drive側で先に絞る
             */

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
             * 念のため最終チェック
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
         * date指定あり
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
         * month指定あり
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


        /*
         * ========================================
         * date・month指定なし
         *
         * カレンダー用投稿日一覧
         * ========================================
         */

        const postDates =
            await getPostDates(
                accessToken,
                group
            );

        return Response.json({
            group:
                group,

            postDates:
                postDates
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
                    "画像一覧の取得中にエラーが発生しました。"
            },
            {
                status:
                    500
            }
        );
    }
}
