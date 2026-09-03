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

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // Googleログイン関連のURLはそのまま通す
    if (url.pathname.startsWith("/auth/")) {
        return context.next();
    }

    const cookieHeader = request.headers.get("Cookie") || "";

    const match = cookieHeader.match(
        new RegExp(`${COOKIE_NAME}=([^;]+)`)
    );

    if (!match) {
        return Response.redirect(
            `${url.origin}/auth/login`,
            302
        );
    }

    const expectedSession = await createSession(
        env.GOOGLE_ALLOWED_EMAIL,
        env.SESSION_SECRET
    );

    if (match[1] !== expectedSession) {
        return Response.redirect(
            `${url.origin}/auth/login`,
            302
        );
    }

    return context.next();
}
