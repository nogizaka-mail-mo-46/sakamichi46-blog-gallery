import {
    getGoogleAccessToken
} from "../lib/google.js";


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

    const fileId =
        url.searchParams.get(
            "fileId"
        );


    /*
     * ========================================
     * fileId確認
     * ========================================
     */

    if (
        !fileId
    ) {
        return Response.json(
            {
                error:
                    "fileIdを指定してください。"
            },
            {
                status:
                    400
            }
        );
    }


    /*
     * ========================================
     * Google Driveメタデータ取得
     * ========================================
     */

    try {
        const accessToken =
            await getGoogleAccessToken(
                env
            );

        const apiUrl =
            new URL(
                `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`
            );

        apiUrl.searchParams.set(
            "fields",
            "id,name,mimeType,description,properties,appProperties,imageMediaMetadata,createdTime,modifiedTime"
        );

        const response =
            await fetch(
                apiUrl.toString(),
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
                "Google Drive metadata error:",
                errorText
            );

            return Response.json(
                {
                    error:
                        "Google Driveからメタデータを取得できませんでした。",

                    status:
                        response.status
                },
                {
                    status:
                        response.status
                }
            );
        }

        const file =
            await response.json();

        return Response.json(
            file
        );
    } catch (
        error
    ) {
        console.error(
            "Debug file API error:",
            error
        );

        return Response.json(
            {
                error:
                    "画像プロパティの取得に失敗しました。"
            },
            {
                status:
                    500
            }
        );
    }
}
