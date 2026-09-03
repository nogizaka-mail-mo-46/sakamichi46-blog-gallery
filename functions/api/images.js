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
 * 指定フォルダ内の画像取得
 * ========================================
 */

async function getImagesFromFolder(
    accessToken,
    folderId
) {
    const images = [];

    let pageToken =
        null;

    do {
        const params =
            new URLSearchParams({
                q:
                    `'${folderId}' in parents and trashed = false`,

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
                (file) =>
                    file.mimeType &&
                    file.mimeType.startsWith(
                        "image/"
                    )
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
            /*
             * group指定なし
             * → 全メンバー
             */

            if (
                !group
            ) {
                return true;
            }


            /*
             * group指定あり
             * → 指定グループのみ
             */

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

        const matchedImages =
            images.filter(
                (image) =>
                    image.name &&
                    image.name.startsWith(
                        `${date}_`
                    )
            );

        matchedImages.forEach(
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


            /*
             * groupとmemberの
             * 組み合わせチェック
             */

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


            let images =
                await getImagesFromFolder(
                    accessToken,
                    member.folderId
                );


            /*
             * date指定あり
             * → その日の画像だけ
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

                images:
                    images
            });
        }


        /*
         * ========================================
         * メンバー未指定
         * date指定あり
         *
         * 対象グループの
         * 指定日の全メンバー画像
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
         * date指定なし
         *
         * 対象グループの投稿日一覧
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
