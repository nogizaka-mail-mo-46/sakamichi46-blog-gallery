import {
    getGoogleAccessToken
} from "../lib/google.js";


/*
 * ========================================
 * ★ 設定
 * ========================================
 */

/*
 * Google Drive
 * currentフォルダ
 */
const MEMBER_ICONS_FOLDER_ID =
    "1XOt-8OYSUGF3cVG-QdiXl6BXiqM4-GLD";


/*
 * JSONファイル名
 */
const MEMBER_ICONS_FILE_NAME =
    "member-icons.json";


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
 * ★ member-icons.json のFile ID取得
 * ========================================
 */

async function getMemberIconsFileId(
    accessToken
) {

    const folderId =
        escapeDriveQueryValue(
            MEMBER_ICONS_FOLDER_ID
        );

    const fileName =
        escapeDriveQueryValue(
            MEMBER_ICONS_FILE_NAME
        );


    /*
     * ========================================
     * currentフォルダ内から
     * member-icons.json を検索
     * ========================================
     */

    const query =
        `'${folderId}' in parents` +
        ` and name = '${fileName}'` +
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
            `member-icons.json検索失敗: ` +
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
            "member-icons.jsonが見つかりません。"
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
 * ★ member-icons.json 本体取得
 * ========================================
 */

async function getMemberIconsJson(
    accessToken,
    fileId
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
            `member-icons.json取得失敗: ` +
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
            "member-icons.jsonのJSON解析に失敗しました。"
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
            "member-icons.jsonの形式が不正です。"
        );
    }


    return data;
}


/*
 * ========================================
 * ★ メンバーアイコン一覧API
 *
 * GET /api/member-icons
 * ========================================
 */

export async function onRequestGet(
    context
) {

    const {
        env
    } = context;


    try {

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
         * member-icons.json のFile ID
         * ========================================
         */

        const fileId =
            await getMemberIconsFileId(
                accessToken
            );


        /*
         * ========================================
         * JSON取得
         * ========================================
         */

        const data =
            await getMemberIconsJson(
                accessToken,
                fileId
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
