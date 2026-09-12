const OAUTH_STATE_COOKIE_NAME =
    "sakamichi_oauth_state";


function createOAuthState() {

    const bytes =
        new Uint8Array(
            32
        );

    crypto.getRandomValues(
        bytes
    );

    return Array.from(
        bytes
    )
        .map(
            (byte) =>
                byte
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
}


export async function onRequestGet(
    context
) {
    const {
        env
    } = context;

    const state =
        createOAuthState();

    const authUrl =
        new URL(
            "https://accounts.google.com/o/oauth2/v2/auth"
        );

    authUrl.searchParams.set(
        "client_id",
        env.GOOGLE_CLIENT_ID
    );

    authUrl.searchParams.set(
        "redirect_uri",
        env.GOOGLE_PAGES_REDIRECT_URI
    );

    authUrl.searchParams.set(
        "response_type",
        "code"
    );

    authUrl.searchParams.set(
        "scope",
        "openid email"
    );

    authUrl.searchParams.set(
        "state",
        state
    );

    authUrl.searchParams.set(
        "prompt",
        "select_account"
    );

    return new Response(
        null,
        {
            status:
                302,

            headers: {
                Location:
                    authUrl.toString(),

                "Set-Cookie":
                    `${OAUTH_STATE_COOKIE_NAME}=${state}; Path=/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
            }
        }
    );
}
