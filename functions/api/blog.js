import {
    members
} from "../data/member-data.js";

import {
    getGoogleAccessToken
} from "../lib/google.js";


/*
 * ========================================
 * Google Drive query用文字列エスケープ
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
 * ブログJSON取得
 * ========================================
 */

export async function onRequestGet(
    context
) {
    const {
        request,
        env
    } =
        context;

    try {
        const url =
            new URL(
                request.url
            );

        const group =
            url.searchParams.get(
                "group"
            );

        const memberKey =
            url.searchParams.get(
                "member"
            );

        const articleId =
            url.searchParams.get(
                "articleId"
            );


        /*
         * ========================================
         * パラメータ確認
         * ========================================
         */

        if (
            !group
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "group is required"
                }),
                {
                    status:
                        400,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }

        if (
            !memberKey
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "member is required"
                }),
                {
                    status:
                        400,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }

        if (
            !articleId
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "articleId is required"
                }),
                {
                    status:
                        400,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }

        if (
            !/^\d+$/.test(
                articleId
            )
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "invalid articleId"
                }),
                {
                    status:
                        400,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }


        /*
         * ========================================
         * メンバー確認
         * ========================================
         */

        const member =
            members[
                memberKey
            ];

        if (
            !member
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "member not found"
                }),
                {
                    status:
                        404,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }

        if (
            member.group !==
                group
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "member does not belong to group"
                }),
                {
                    status:
                        400,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }

        if (
            !member.blogDataFolderId
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "blog data folder is not configured"
                }),
                {
                    status:
                        500,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }


        /*
         * ========================================
         * Googleアクセストークン取得
         * ========================================
         */

        const accessToken =
            await getGoogleAccessToken(
                env
            );


        /*
         * ========================================
         * JSONファイル検索
         * ========================================
         */

        const fileName =
            `${articleId}.json`;

        const query =
            `'${escapeDriveQueryValue(
                member.blogDataFolderId
            )}' in parents and name = '${escapeDriveQueryValue(
                fileName
            )}' and trashed = false`;

        const searchUrl =
            new URL(
                "https://www.googleapis.com/drive/v3/files"
            );

        searchUrl.searchParams.set(
            "q",
            query
        );

        searchUrl.searchParams.set(
            "pageSize",
            "2"
        );

        searchUrl.searchParams.set(
            "fields",
            "files(id,name,mimeType)"
        );

        const searchResponse =
            await fetch(
                searchUrl.toString(),
                {
                    headers: {
                        Authorization:
                            `Bearer ${accessToken}`
                    }
                }
            );

        if (
            !searchResponse.ok
        ) {
            const errorText =
                await searchResponse.text();

            throw new Error(
                `Google Drive API error: ${searchResponse.status} ${errorText}`
            );
        }

        const searchData =
            await searchResponse.json();

        const files =
            Array.isArray(
                searchData.files
            )
                ? searchData.files
                : [];

        if (
            files.length ===
                0
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "blog not found"
                }),
                {
                    status:
                        404,

                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    }
                }
            );
        }


        /*
         * ========================================
         * JSONファイル取得
         * ========================================
         */

        const file =
            files[0];

        const downloadUrl =
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
                file.id
            )}?alt=media`;

        const downloadResponse =
            await fetch(
                downloadUrl,
                {
                    headers: {
                        Authorization:
                            `Bearer ${accessToken}`
                    }
                }
            );

        if (
            !downloadResponse.ok
        ) {
            const errorText =
                await downloadResponse.text();

            throw new Error(
                `Google Drive file download error: ${downloadResponse.status} ${errorText}`
            );
        }

        const blogData =
            await downloadResponse.json();


        /*
         * ========================================
         * JSON内容確認
         * ========================================
         */

        if (
            String(
                blogData.articleId
            ) !==
                articleId
        ) {
            throw new Error(
                "Blog JSON articleId mismatch"
            );
        }

        if (
            blogData.group?.id !==
                group
        ) {
            throw new Error(
                "Blog JSON group mismatch"
            );
        }


        /*
         * ========================================
         * レスポンス
         * ========================================
         */

        return new Response(
            JSON.stringify(
                blogData
            ),
            {
                status:
                    200,

                headers: {
                    "Content-Type":
                        "application/json; charset=utf-8",

                    "Cache-Control":
                        "private, max-age=3600"
                }
            }
        );

    } catch (
        error
    ) {
        console.error(
            error
        );

        return new Response(
            JSON.stringify({
                error:
                    "ブログデータの取得に失敗しました。"
            }),
            {
                status:
                    500,

                headers: {
                    "Content-Type":
                        "application/json; charset=utf-8"
                }
            }
        );
    }
}
