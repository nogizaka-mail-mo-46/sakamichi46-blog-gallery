import {
    SESSION_COOKIE_NAME,
    createSession
} from "../lib/session.js";


const OAUTH_STATE_COOKIE_NAME =
    "sakamichi_oauth_state";


function getCookieValue(
    cookieHeader,
    cookieName
) {

    const match =
        cookieHeader.match(
            new RegExp(
                `(?:^|;\\s*)${cookieName}=([^;]+)`
            )
        );

    return match
        ? match[1]
        : null;
}


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

    const code =
        url.searchParams.get(
            "code"
        );

    const state =
        url.searchParams.get(
            "state"
        );

    const cookieHeader =
        request.headers.get(
            "Cookie"
        ) || "";

    const expectedState =
        getCookieValue(
            cookieHeader,
            OAUTH_STATE_COOKIE_NAME
        );


    /*
     * ========================================
     * OAuth state確認
     * ========================================
     */

    if (
        !state ||
        !expectedState ||
        state !==
            expectedState
    ) {
        return new Response(
            "Invalid OAuth state",
            {
                status:
                    400,

                headers: {
                    "Set-Cookie":
                        `${OAUTH_STATE_COOKIE_NAME}=; Path=/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
                }
            }
        );
    }


    if (
        !code
    ) {
        return new Response(
            "Authorization code not found",
            {
                status:
                    400,

                headers: {
                    "Set-Cookie":
                        `${OAUTH_STATE_COOKIE_NAME}=; Path=/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
                }
            }
        );
    }


    /*
     * ========================================
     * Googleの認証コードを
     * アクセストークンに交換
     * ========================================
     */

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
                        code,

                        client_id:
                            env.GOOGLE_CLIENT_ID,

                        client_secret:
                            env.GOOGLE_CLIENT_SECRET,

                        redirect_uri:
                            env.GOOGLE_PAGES_REDIRECT_URI,

                        grant_type:
                            "authorization_code"
                    })
            }
        );

    if (
        !tokenResponse.ok
    ) {
        return new Response(
            "Google token exchange failed",
            {
                status:
                    400,

                headers: {
                    "Set-Cookie":
                        `${OAUTH_STATE_COOKIE_NAME}=; Path=/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
                }
            }
        );
    }

    const tokenData =
        await tokenResponse.json();


    /*
     * ========================================
     * ログインしたGoogleアカウント取得
     * ========================================
     */

    const userResponse =
        await fetch(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`
                }
            }
        );

    if (
        !userResponse.ok
    ) {
        return new Response(
            "Failed to get Google account",
            {
                status:
                    400,

                headers: {
                    "Set-Cookie":
                        `${OAUTH_STATE_COOKIE_NAME}=; Path=/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
                }
            }
        );
    }

    const user =
        await userResponse.json();


    /*
     * ========================================
     * 許可したGoogleアカウント以外は拒否
     * ========================================
     */

    if (
        user.email !==
        env.GOOGLE_ALLOWED_EMAIL
    ) {
        return new Response(
            "このGoogleアカウントにはアクセス権がありません。",
            {
                status:
                    403,

                headers: {
                    "Content-Type":
                        "text/plain; charset=UTF-8",

                    "Set-Cookie":
                        `${OAUTH_STATE_COOKIE_NAME}=; Path=/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
                }
            }
        );
    }


    /*
     * ========================================
     * Pages用ログインセッション作成
     * ========================================
     */

    const session =
        await createSession(
            user.email,
            env.SESSION_SECRET
        );


    /*
     * ========================================
     * Cookie設定 → ギャラリーへ戻す
     * ========================================
     */

    const headers =
        new Headers();

    headers.set(
        "Location",
        "/"
    );

    headers.append(
        "Set-Cookie",
        `${SESSION_COOKIE_NAME}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
    );

    headers.append(
        "Set-Cookie",
        `${OAUTH_STATE_COOKIE_NAME}=; Path=/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
    );

    return new Response(
        null,
        {
            status:
                302,

            headers
        }
    );
}
