/*
 * ========================================
 * セッション共通設定
 * ========================================
 */

export const SESSION_COOKIE_NAME =
    "sakamichi_pages_session";


/*
 * ========================================
 * セッショントークン生成
 * ========================================
 */

export async function createSession(
    email,
    secret
) {
    const data =
        `${email}:${secret}`;

    const hash =
        await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(
                data
            )
        );

    return Array.from(
        new Uint8Array(
            hash
        )
    )
        .map(
            (b) =>
                b
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
