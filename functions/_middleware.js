import {
    SESSION_COOKIE_NAME,
    createSession
} from "./lib/session.js";


export async function onRequest(
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


    /*
     * ========================================
     * Googleログイン関連はそのまま通す
     * ========================================
     */

    if (
        url.pathname.startsWith(
            "/auth/"
        )
    ) {
        return context.next();
    }


    /*
     * ========================================
     * Cookie取得
     * ========================================
     */

    const cookieHeader =
        request.headers.get(
            "Cookie"
        ) || "";

    const match =
        cookieHeader.match(
            new RegExp(
                `${SESSION_COOKIE_NAME}=([^;]+)`
            )
        );


    /*
     * ========================================
     * Cookieがない場合
     * ========================================
     */

    if (
        !match
    ) {
        return Response.redirect(
            `${url.origin}/auth/login`,
            302
        );
    }


    /*
     * ========================================
     * 正しいセッションか確認
     * ========================================
     */

    const expectedSession =
        await createSession(
            env.GOOGLE_ALLOWED_EMAIL,
            env.SESSION_SECRET
        );

    if (
        match[1] !==
        expectedSession
    ) {
        return Response.redirect(
            `${url.origin}/auth/login`,
            302
        );
    }


    /*
     * ========================================
     * 認証成功
     * ========================================
     */

    return context.next();
}
