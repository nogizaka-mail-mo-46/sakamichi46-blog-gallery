import {
    SESSION_COOKIE_NAME
} from "../lib/session.js";


/*
 * ========================================
 * ログアウト
 * ========================================
 */

export async function onRequestGet() {

    return new Response(
        null,
        {
            status:
                302,

            headers: {
                Location:
                    "/auth/login",

                "Set-Cookie":
                    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
            }
        }
    );
}
