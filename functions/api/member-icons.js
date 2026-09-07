import {
    getGoogleAccessToken
} from "../lib/google.js";


/*
 * ========================================
 * ★ グループ別設定
 * ========================================
 */

const MEMBER_ICONS_CONFIG = {

    /*
     * ========================================
     * 乃木坂46
     * ========================================
     */

    nogizaka46: {

        /*
         * Google Drive
         * currentフォルダ
         */
        folderId:
            "1XOt-8OYSUGF3cVG-QdiXl6BXiqM4-GLD",

        /*
         * JSONファイル名
         */
        fileName:
            "nogizaka46-member-icons.json"
    },


    /*
     * ========================================
     * 日向坂46
     * ========================================
     */

    hinatazaka46: {

        /*
         * Google Drive
         * currentフォルダ
         */
        folderId:
            "1BqeDZsOkuNLgN9CfYGhgS_BclNus6jrP",

        /*
         * JSONファイル名
         */
        fileName:
            "hinatazaka46-member-icons.json"
    },


    /*
     * ========================================
     * 櫻坂46
     * ========================================
     */

    sakurazaka46: {

        /*
         * Google Drive
         * currentフォルダ
         */
        folderId:
            "1bMcvVIkhYQiQU_y1Vn5705EOa75g8Slf",

        /*
         * JSONファイル名
         */
        fileName:
            "sakurazaka46-member-icons.json"
    }
};


/*
 * ========================================
 * ★ Drive query用文字列エスケープ
 * ========================================
 */

function escapeDriveQueryValue(
    value
) {

    return String(
        value
    )
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        );
}


/*
 * ========================================
 * ★ member-icons JSON のFile ID取得
 * ========================================
 */

async function getMemberIconsFileId(
    accessToken,
    folderId,
    fileName
) {

    const escapedFolderId =
        escapeDriveQueryValue(
            folderId
        );

    const escapedFileName =
        escapeDriveQueryValue(
            fileName
        );


    /*
     * ========================================
     * currentフォルダ内から
     * 対象JSONを検索
     * ========================================
     */

    const query =
        `'${escapedFolderId}' in parents` +
        ` and name = '${escapedFileName}'` +
        ` and trashed = false`;


    const url =
        new URL(
            "https://www.googleapis.com/drive/v3/files"
        );


    url.searchParams.set(
        "q",
        query
    );

    url.searchParams.set(
        "pageSize",
        "10"
    );

    url.searchParams.set(
        "fields",
        "files(id,name,mimeType,modifiedTime)"
    );


    const response =
        await fetch(
            url.toString(),
            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );


    if (
        !response.ok
    ) {

        const errorText =
            await response.text();


        throw new Error(
            `${fileName}検索失敗: ` +
            `${response.status} ${errorText}`
        );
    }


    const data =
        await response.json();


    const files =
        Array.isArray(
            data.files
        )
            ? data.files
            : [];


    if (
        files.length ===
        0
    ) {

        throw new Error(
            `${fileName}が見つかりません。`
        );
    }


    /*
     * ========================================
     * 万一複数あった場合
     * 最終更新日時が新しいものを使用
     * ========================================
     */

    files.sort(
        (
            a,
            b
        ) => {

            const timeA =
                new Date(
                    a.modifiedTime || 0
                ).getTime();

            const timeB =
                new Date(
                    b.modifiedTime || 0
                ).getTime();


            return (
                timeB -
                timeA
            );
        }
    );


    return files[0].id;
}


/*
 * ========================================
 * ★ member-icons JSON 本体取得
 * ========================================
 */

async function getMemberIconsJson(
    accessToken,
    fileId,
    fileName
) {

    const url =
        `https://www.googleapis.com/drive/v3/files/` +
        `${encodeURIComponent(fileId)}` +
        `?alt=media`;


    const response =
        await fetch(
            url,
            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );


    if (
        !response.ok
    ) {

        const errorText =
            await response.text();


        throw new Error(
            `${fileName}取得失敗: ` +
            `${response.status} ${errorText}`
        );
    }


    const text =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(
                text
            );

    } catch (
        error
    ) {

        throw new Error(
            `${fileName}のJSON解析に失敗しました。`
        );
    }


    /*
     * ========================================
     * 最低限の形式チェック
     * ========================================
     */

    if (
        !data ||
        !Array.isArray(
            data.members
        )
    ) {

        throw new Error(
            `${fileName}の形式が不正です。`
        );
    }


    return data;
}


/*
 * ========================================
 * ★ メンバーアイコン一覧API
 *
 * GET /api/member-icons?group=nogizaka46
 *
 * GET /api/member-icons?group=hinatazaka46
 *
 * GET /api/member-icons?group=sakurazaka46
 * ========================================
 */

export async function onRequestGet(
    context
) {

    const {
        request,
        env
    } = context;


    try {

        /*
         * ========================================
         * group取得
         * ========================================
         */

        const url =
            new URL(
                request.url
            );


        const group =
            url.searchParams.get(
                "group"
            );


        /*
         * ========================================
         * group未指定
         * ========================================
         */

        if (
            !group
        ) {

            return Response.json(
                {
                    error:
                        "groupが指定されていません。"
                },
                {
                    status:
                        400,

                    headers: {
                        "Cache-Control":
                            "no-store"
                    }
                }
            );
        }


        /*
         * ========================================
         * グループ設定取得
         * ========================================
         */

        const config =
            MEMBER_ICONS_CONFIG[
                group
            ];


        /*
         * ========================================
         * 未対応グループ
         * ========================================
         */

        if (
            !config
        ) {

            return Response.json(
                {
                    error:
                        `未対応のgroupです: ${group}`
                },
                {
                    status:
                        400,

                    headers: {
                        "Cache-Control":
                            "no-store"
                    }
                }
            );
        }


        /*
         * ========================================
         * Google Access Token
         * ========================================
         */

        const accessToken =
            await getGoogleAccessToken(
                env
            );


        /*
         * ========================================
         * member-icons JSON のFile ID
         * ========================================
         */

        const fileId =
            await getMemberIconsFileId(
                accessToken,
                config.folderId,
                config.fileName
            );


        /*
         * ========================================
         * JSON取得
         * ========================================
         */

        const data =
            await getMemberIconsJson(
                accessToken,
                fileId,
                config.fileName
            );


        /*
         * ========================================
         * レスポンス
         * ========================================
         */

        return Response.json(
            data,
            {
                headers: {

                    /*
                     * GASでJSONを更新したあとも
                     * 比較的早く反映されるようにする
                     */

                    "Cache-Control":
                        "private, max-age=60"
                }
            }
        );


    } catch (
        error
    ) {

        console.error(
            "member-icons API error:",
            error
        );


        return Response.json(
            {
                error:
                    "メンバーアイコン一覧の取得に失敗しました。",

                detail:
                    error.message
            },
            {
                status:
                    500,

                headers: {
                    "Cache-Control":
                        "no-store"
                }
            }
        );
    }
}
