const COOKIE_NAME = "sakamichi_pages_session";

async function createSession(email, secret) {
    const data = `${email}:${secret}`;

    const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(data)
    );

    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    const code = url.searchParams.get("code");

    if (!code) {
        return new Response(
            "Authorization code not found",
            { status: 400 }
        );
    }

    // Googleからアクセストークンを取得
    const tokenResponse = await fetch(
        "https://oauth2.googleapis.com/token",
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code,
                client_id: env.GOOGLE_CLIENT_ID,
                client_secret:
                    env.GOOGLE_CLIENT_SECRET,
                redirect_uri:
                    env.GOOGLE_PAGES_REDIRECT_URI,
                grant_type:
                    "authorization_code",
            }),
        }
    );

    if (!tokenResponse.ok) {
        return new Response(
            "Google token exchange failed",
            { status: 400 }
        );
    }

    const tokenData =
        await tokenResponse.json();

    // Googleアカウント情報を取得
    const userResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
            headers: {
                Authorization:
                    `Bearer ${tokenData.access_token}`,
            },
        }
    );

    if (!userResponse.ok) {
        return new Response(
            "Failed to get Google account",
            { status: 400 }
        );
    }

    const user =
        await userResponse.json();

    // 許可したGoogleアカウント以外は拒否
    if (
        user.email !==
        env.GOOGLE_ALLOWED_EMAIL
    ) {
        return new Response(
            "このGoogleアカウントにはアクセス権がありません。",
            {
                status: 403,
                headers: {
                    "Content-Type":
                        "text/plain; charset=UTF-8",
                },
            }
        );
    }

    // セッション作成
    const session =
        await createSession(
            user.email,
            env.SESSION_SECRET
        );

    // ギャラリーへ戻す
    return new Response(null, {
        status: 302,
        headers: {
            Location: "/",
            "Set-Cookie":
                `${COOKIE_NAME}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
    });
}
