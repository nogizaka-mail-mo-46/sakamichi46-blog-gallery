export async function onRequestGet(context) {
    const { request, env, params } = context;

    // ログインセッションを確認
    const cookieHeader = request.headers.get("Cookie") || "";

    const match = cookieHeader.match(
        /sakamichi_pages_session=([^;]+)/
    );

    if (!match) {
        return new Response(
            "ログインが必要です。",
            {
                status: 401,
                headers: {
                    "Content-Type": "text/plain; charset=UTF-8",
                },
            }
        );
    }

    // 正しいセッションか確認
    const data = `${env.GOOGLE_ALLOWED_EMAIL}:${env.SESSION_SECRET}`;

    const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(data)
    );

    const expectedSession = Array.from(
        new Uint8Array(hash)
    )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    if (match[1] !== expectedSession) {
        return new Response(
            "ログインが必要です。",
            { status: 401 }
        );
    }

    // URLからGoogle DriveのファイルIDを取得
    const fileId = params.fileId;

    if (!fileId) {
        return new Response(
            "File ID is required",
            { status: 400 }
        );
    }

    try {
        // Googleのアクセストークンを取得
        const tokenResponse = await fetch(
            "https://oauth2.googleapis.com/token",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    client_id: env.GOOGLE_CLIENT_ID,
                    client_secret: env.GOOGLE_CLIENT_SECRET,
                    refresh_token: env.GOOGLE_REFRESH_TOKEN,
                    grant_type: "refresh_token",
                }),
            }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            return new Response(
                JSON.stringify(tokenData, null, 2),
                {
                    status: 500,
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                }
            );
        }

        // Google Driveから画像を取得
        const driveResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`,
                },
            }
        );

        if (!driveResponse.ok) {
            return new Response(
                `Google Drive API error: ${driveResponse.status}`,
                { status: 502 }
            );
        }

        return new Response(
            driveResponse.body,
            {
                status: 200,
                headers: {
                    "Content-Type":
                        driveResponse.headers.get(
                            "Content-Type"
                        ) || "image/jpeg",

                    "Cache-Control":
                        "private, max-age=3600",
                },
            }
        );

    } catch (error) {
        return new Response(
            `Proxy error: ${error.message}`,
            { status: 500 }
        );
    }
}
