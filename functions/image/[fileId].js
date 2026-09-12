import {
    getGoogleAccessToken
} from "../lib/google.js";


/*
 * ========================================
 * 画像プロキシ
 * ========================================
 */

export async function onRequestGet(
    context
) {
    const {
        request,
        env,
        params
    } = context;


    /*
     * ========================================
     * File ID取得
     * ========================================
     */

    const fileId =
        params.fileId;

    if (
        !fileId
    ) {
        return new Response(
            "File ID is required",
            {
                status:
                    400
            }
        );
    }


    /*
     * ========================================
     * Cloudflareキャッシュ確認
     * ========================================
     */

    const cache =
        caches.default;

    const cacheUrl =
        new URL(
            request.url
        );

    cacheUrl.search =
        "";

    const cacheKey =
        new Request(
            cacheUrl.toString(),
            {
                method:
                    "GET"
            }
        );

    const cachedResponse =
        await cache.match(
            cacheKey
        );

    if (
        cachedResponse
    ) {
        const browserResponse =
            new Response(
                cachedResponse.body,
                cachedResponse
            );

        browserResponse.headers.set(
            "Cache-Control",
            "private, max-age=3600"
        );

        return browserResponse;
    }


    /*
     * ========================================
     * Google Drive画像取得
     * ========================================
     */

    try {


        /*
         * Google Access Token取得
         */

        const accessToken =
            await getGoogleAccessToken(
                env
            );


        /*
         * Google Driveから画像取得
         */

        const driveResponse =
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
            !driveResponse.ok
        ) {
            return new Response(
                `Google Drive API error: ${driveResponse.status}`,
                {
                    status:
                        502
                }
            );
        }


        /*
         * ========================================
         * レスポンス生成
         * ========================================
         */

        const response =
            new Response(
                driveResponse.body,
                {
                    status:
                        200,

                    headers: {
                        "Content-Type":
                            driveResponse.headers.get(
                                "Content-Type"
                            ) || "image/jpeg",

                        "Cache-Control":
                            "private, max-age=3600"
                    }
                }
            );


        /*
         * ========================================
         * Cloudflareキャッシュ保存
         * ========================================
         */

        const cacheResponse =
            response.clone();

        cacheResponse.headers.set(
            "Cache-Control",
            "public, max-age=86400"
        );

        context.waitUntil(
            cache.put(
                cacheKey,
                cacheResponse
            )
        );


        /*
         * ========================================
         * ブラウザへ返却
         * ========================================
         */

        return response;

    } catch (
        error
    ) {
        console.error(
            error
        );

        return new Response(
            `Proxy error: ${error.message}`,
            {
                status:
                    500
            }
        );
    }
}
