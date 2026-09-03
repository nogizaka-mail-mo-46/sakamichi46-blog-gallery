import { members } from "../data/members.js";


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


export async function onRequestGet(context) {
    const {
        request,
        env
    } = context;

    const url =
        new URL(request.url);

    const memberKey =
        url.searchParams.get("member");

    if (!memberKey) {
        return Response.json(
            {
                error:
                    "memberが指定されていません。"
            },
            {
                status: 400
            }
        );
    }

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

    try {
        const accessToken =
            await getGoogleAccessToken(
                env
            );

        const images =
            await getImagesFromFolder(
                accessToken,
                member.folderId
            );

        images.sort(
            (a, b) =>
                new Date(
                    b.createdTime
                ) -
                new Date(
                    a.createdTime
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
        console.error(error);

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
