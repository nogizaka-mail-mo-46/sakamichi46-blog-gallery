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

export async function getGoogleAccessToken(
    env
) {
    const now =
        Date.now();

    /*
     * 有効なAccess Tokenがあれば再利用
     */

    if (
        cachedAccessToken &&
        now <
            accessTokenExpiresAt
    ) {
        return cachedAccessToken;
    }


    /*
     * すでにToken取得中なら
     * 同じPromiseを待つ
     */

    if (
        accessTokenPromise
    ) {
        return await accessTokenPromise;
    }


    /*
     * 新しいAccess Tokenを取得
     */

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

            cachedAccessToken =
                tokenData.access_token;

            const expiresIn =
                Number(
                    tokenData.expires_in
                ) || 3600;


            /*
             * 有効期限の60秒前まで使用
             */

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
