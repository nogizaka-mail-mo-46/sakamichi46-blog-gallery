import {
    getGoogleAccessToken
} from "../lib/google.js";


const READ_STATUS_FILE_NAME =
    "read-status.json";


function jsonResponse(
    data,
    status = 200
) {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                "Content-Type":
                    "application/json; charset=utf-8",
                "Cache-Control":
                    "no-store"
            }
        }
    );
}


function escapeDriveQueryValue(
    value
) {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


function getFolderId(
    env,
    group
) {
    if (
        group ===
            "nogizaka46"
    ) {
        return env.NOGIZAKA_READ_STATUS_FOLDER_ID?.trim() ||
            "";
    }

    return "";
}


async function findReadStatusFile(
    accessToken,
    folderId
) {
    const query =
        `'${escapeDriveQueryValue(folderId)}' in parents and name = '${READ_STATUS_FILE_NAME}' and trashed = false`;

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
        "2"
    );

    url.searchParams.set(
        "fields",
        "files(id,name)"
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
            `Google Drive read-status search error: ${response.status} ${errorText}`
        );
    }

    const data =
        await response.json();

    return Array.isArray(data.files) &&
        data.files.length > 0
            ? data.files[0]
            : null;
}


async function readStatusFile(
    accessToken,
    fileId
) {
    const response =
        await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
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
            `Google Drive read-status download error: ${response.status} ${errorText}`
        );
    }

    const data =
        await response.json();

    return Array.isArray(data.readArticleIds)
        ? data.readArticleIds
            .map(value => String(value))
            .filter(value => /^\d+$/.test(value))
        : [];
}


async function createReadStatusFile(
    accessToken,
    folderId,
    readArticleIds
) {
    /*
     * multipart upload は使わず、
     * 1. Drive にJSONファイルを作成
     * 2. そのファイルへ既読内容を書き込む
     * の2段階に分ける。
     */

    const createResponse =
        await fetch(
            "https://www.googleapis.com/drive/v3/files?fields=id",
            {
                method:
                    "POST",
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`,
                    "Content-Type":
                        "application/json; charset=utf-8"
                },
                body:
                    JSON.stringify({
                        name:
                            READ_STATUS_FILE_NAME,
                        parents: [
                            folderId
                        ],
                        mimeType:
                            "application/json"
                    })
            }
        );

    if (
        !createResponse.ok
    ) {
        const errorText =
            await createResponse.text();

        throw new Error(
            `Google Drive read-status metadata create error: ${createResponse.status} ${errorText}`
        );
    }

    const createdFile =
        await createResponse.json();

    if (
        !createdFile?.id
    ) {
        throw new Error(
            "Google Drive read-status create error: file id was not returned"
        );
    }

    await updateReadStatusFile(
        accessToken,
        createdFile.id,
        readArticleIds
    );
}


async function updateReadStatusFile(
    accessToken,
    fileId,
    readArticleIds
) {
    const response =
        await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`,
            {
                method:
                    "PATCH",
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`,
                    "Content-Type":
                        "application/json; charset=utf-8"
                },
                body:
                    JSON.stringify(
                        {
                            readArticleIds
                        },
                        null,
                        2
                    )
            }
        );

    if (
        !response.ok
    ) {
        const errorText =
            await response.text();

        throw new Error(
            `Google Drive read-status update error: ${response.status} ${errorText}`
        );
    }
}


export async function onRequestGet(
    context
) {
    const {
        request,
        env
    } = context;

    try {
        const url =
            new URL(request.url);

        const group =
            url.searchParams.get("group");

        const folderId =
            getFolderId(
                env,
                group
            );

        if (
            group !== "nogizaka46"
        ) {
            return jsonResponse({
                readArticleIds: []
            });
        }

        if (
            !folderId
        ) {
            return jsonResponse(
                {
                    error:
                        "read status folder is not configured"
                },
                500
            );
        }

        const accessToken =
            await getGoogleAccessToken(
                env
            );

        const file =
            await findReadStatusFile(
                accessToken,
                folderId
            );

        if (
            !file
        ) {
            return jsonResponse({
                readArticleIds: []
            });
        }

        const readArticleIds =
            await readStatusFile(
                accessToken,
                file.id
            );

        return jsonResponse({
            readArticleIds
        });

    } catch (
        error
    ) {
        console.error(error);

        return jsonResponse(
            {
                error:
                    "既読情報の取得に失敗しました。"
            },
            500
        );
    }
}


export async function onRequestPost(
    context
) {
    const {
        request,
        env
    } = context;

    try {
        const body =
            await request.json();

        const group =
            body?.group;

        const articleId =
            String(
                body?.articleId ||
                ""
            );

        if (
            group !== "nogizaka46"
        ) {
            return jsonResponse(
                {
                    error:
                        "read status is not enabled for this group"
                },
                400
            );
        }

        if (
            !/^\d+$/.test(articleId)
        ) {
            return jsonResponse(
                {
                    error:
                        "invalid articleId"
                },
                400
            );
        }

        const folderId =
            getFolderId(
                env,
                group
            );

        if (
            !folderId
        ) {
            return jsonResponse(
                {
                    error:
                        "read status folder is not configured"
                },
                500
            );
        }

        const accessToken =
            await getGoogleAccessToken(
                env
            );

        const file =
            await findReadStatusFile(
                accessToken,
                folderId
            );

        const readArticleIds =
            file
                ? await readStatusFile(
                    accessToken,
                    file.id
                )
                : [];

        if (
            !readArticleIds.includes(
                articleId
            )
        ) {
            readArticleIds.push(
                articleId
            );
        }

        if (
            file
        ) {
            await updateReadStatusFile(
                accessToken,
                file.id,
                readArticleIds
            );

        } else {
            await createReadStatusFile(
                accessToken,
                folderId,
                readArticleIds
            );
        }

        return jsonResponse({
            readArticleIds
        });

    } catch (
        error
    ) {
        console.error(error);

        return jsonResponse(
            {
                error:
                    "既読情報の保存に失敗しました。"
            },
            500
        );
    }
}
