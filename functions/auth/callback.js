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

    try {
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
                    client_secret: env.GOOGLE_CLIENT_SECRET,
                    redirect_uri:
                        env.GOOGLE_PAGES_REDIRECT_URI,
                    grant_type: "authorization_code",
                }),
            }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            return new Response(
                JSON.stringify(tokenData, null, 2),
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "application/json; charset=UTF-8",
                        "Cache-Control": "no-store",
                    },
                }
            );
        }

        if (!tokenData.refresh_token) {
            return new Response(
                [
                    "Refresh Tokenが返ってきませんでした。",
                    "",
                    "Googleの認証を prompt=consent 付きで",
                    "もう一度実行する必要があります。",
                ].join("\n"),
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=UTF-8",
                        "Cache-Control": "no-store",
                    },
                }
            );
        }

        return new Response(
            [
                "Refresh Tokenを取得できました。",
                "",
                "↓↓↓ この値をCloudflareへ直接コピーしてください ↓↓↓",
                "",
                tokenData.refresh_token,
                "",
                "※ このTokenはチャットには貼らないでください。",
            ].join("\n"),
            {
                status: 200,
                headers: {
                    "Content-Type":
                        "text/plain; charset=UTF-8",
                    "Cache-Control": "no-store",
                },
            }
        );

    } catch (error) {
        return new Response(
            `Error: ${error.message}`,
            {
                status: 500,
                headers: {
                    "Content-Type":
                        "text/plain; charset=UTF-8",
                    "Cache-Control": "no-store",
                },
            }
        );
    }
}
