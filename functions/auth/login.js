export async function onRequestGet(context) {
    const { env } = context;

    const authUrl = new URL(
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
        "access_type",
        "offline"
    );

    authUrl.searchParams.set(
        "prompt",
        "select_account"
    );

    return Response.redirect(
        authUrl.toString(),
        302
    );
}
