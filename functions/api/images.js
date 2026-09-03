import { members } from "../data/members.js";


/*
 * ========================================
 * Google Access Token取得
 * ========================================
 */

async function getGoogleAccessToken(env) {
    const tokenResponse = await fetch(
        "https://oauth2.googleapis.com/token",
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
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

    if (!tokenResponse.ok) {
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

    let pageToken = null;

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

        if (pageToken) {
            params.set(
                "pageToken",
                pageToken
            );
        }

        const driveResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );

        if (!driveResponse.ok) {
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
            driveData.nextPageToken || null;

    } while (pageToken);

    return images;
}


/*
 * ========================================
 * 全メンバーの投稿日取得
 * ========================================
 */

async function getAllPostDates(
    accessToken
) {
    const postDates =
        new Set();

    for (
        const member of
        Object.values(members)
    ) {
        const images =
            await getImagesFromFolder(
                accessToken,
                member.folderId
            );

        images.forEach(
            (image) => {
                const match =
                    image.name.match(
                        /^(\d{8})_/
                    );

                if (match) {
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
 * API
 * ========================================
 */

export async function onRequestGet(context) {
    const {
        request,
        env
    } = context;

    const url =
        new URL(request.url);

    const memberKey =
        url.searchParams.get(
            "member"
        );

    try {
        const accessToken =
            await getGoogleAccessToken(
                env
            );


        /*
         * ========================================
         * メンバー未指定
         *
         * 全メンバーの投稿日だけ返す
         * ========================================
         */

        if (!memberKey) {
            const postDates =
                await getAllPostDates(
                    accessToken
                );

            return Response.json({
                postDates:
                    postDates
            });
        }


        /*
         * ========================================
         * メンバー指定あり
         * ========================================
         */

        const member =
            members[memberKey];

        if (!member) {
            return Response.json(
                {
                    error:
                        "存在しないメンバーです。"
                },
                {
                    status: 404
                }
            );
        }

        const images =
            await getImagesFromFolder(
                accessToken,
                member.folderId
            );

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
                    member.name
            },

            images:
                images
        });

    } catch (error) {
        console.error(
            error
        );

        return Response.json(
            {
                error:
                    "画像一覧の取得中にエラーが発生しました。"
            },
            {
                status: 500
            }
        );
    }
}
