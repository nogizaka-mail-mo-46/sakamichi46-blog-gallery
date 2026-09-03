const COOKIE_NAME = "sakamichi_pages_session";

export async function onRequestGet(context) {
    const url = new URL(context.request.url);

    return new Response(null, {
        status: 302,
        headers: {
            Location: "/auth/login",
            "Set-Cookie":
                `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        },
    });
}
