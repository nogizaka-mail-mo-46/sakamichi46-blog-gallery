/*
 * ========================================
 * Google Access Tokenキャッシュ
 * ========================================
 */

let cachedAccessToken =
    null;

let accessTokenExpiresAt =
    0;

let accessTokenPromise =
    null;


/*
 * ========================================
 * Google Access Token取得
 * ========================================
 */

async function getGoogleAccessToken(
    env
) {
    const now =
        Date.now();

    if (
        cachedAccessToken &&
        now <
            accessTokenExpiresAt
    ) {
        return cachedAccessToken;
    }

    if (
        accessTokenPromise
    ) {
        return await accessTokenPromise;
    }

    accessTokenPromise =
        (async () => {
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
                                    env.GOOGLE_CLIENT_ID,

                                client_secret:
                                    env.GOOGLE_CLIENT_SECRET,

                                refresh_token:
                                    env.GOOGLE_REFRESH_TOKEN,

                                grant_type:
                                    "refresh_token"
                            })
                    }
                );

            const tokenData =
                await tokenResponse.json();

            if (
                !tokenResponse.ok
            ) {
                console.error(
                    "Google token error:",
                    tokenData
                );

                throw new Error(
                    "Google access tokenの取得に失敗しました。"
                );
            }

            cachedAccessToken =
                tokenData.access_token;

            const expiresIn =
                Number(
                    tokenData.expires_in
                ) || 3600;

            accessTokenExpiresAt =
                Date.now() +
                Math.max(
                    expiresIn - 60,
                    60
                ) *
                    1000;

            return cachedAccessToken;
        })();

    try {
        return await accessTokenPromise;

    } finally {
        accessTokenPromise =
            null;
    }
}


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
     * ログインセッション確認
     * ========================================
     */

    const cookieHeader =
        request.headers.get(
            "Cookie"
        ) || "";

    const match =
        cookieHeader.match(
            /sakamichi_pages_session=([^;]+)/
        );

    if (
        !match
    ) {
        return new Response(
            "ログインが必要です。",
            {
                status:
                    401,

                headers: {
                    "Content-Type":
                        "text/plain; charset=UTF-8"
                }
            }
        );
    }


    /*
     * ========================================
     * 正しいセッションか確認
     * ========================================
     */

    const data =
        `${env.GOOGLE_ALLOWED_EMAIL}:${env.SESSION_SECRET}`;

    const hash =
        await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(
                data
            )
        );

    const expectedSession =
        Array.from(
            new Uint8Array(
                hash
            )
        )
            .map(
                (b) =>
                    b
                        .toString(
                            16
                        )
                        .padStart(
                            2,
                            "0"
                        )
            )
            .join(
                ""
            );

    if (
        match[1] !==
        expectedSession
    ) {
        return new Response(
            "ログインが必要です。",
            {
                status:
                    401
            }
        );
    }


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
