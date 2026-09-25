import {
    getGoogleAccessToken
} from "../lib/google.js";


const FAVORITE_MEMBERS_FILE_NAME =
    "favorite-members.json";


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
    const folderIds = {
        nogizaka46:
            env.NOGIZAKA_USER_DATA_FOLDER_ID,
        sakurazaka46:
            env.SAKURAZAKA_USER_DATA_FOLDER_ID,
        hinatazaka46:
            env.HINATAZAKA_USER_DATA_FOLDER_ID
    };

    return folderIds[group]?.trim() ||
        "";
}


function normalizeFavoriteMemberKeys(
    values
) {
    return Array.isArray(values)
        ? [
            ...new Set(
                values
                    .map(value => String(value))
                    .filter(value => /^[a-z0-9_]+$/i.test(value))
            )
        ]
        : [];
}


async function findFavoriteMembersFile(
    accessToken,
    folderId
) {
    const query =
        `'${escapeDriveQueryValue(folderId)}' in parents and name = '${FAVORITE_MEMBERS_FILE_NAME}' and trashed = false`;

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
            `Google Drive favorite-members search error: ${response.status} ${errorText}`
        );
    }

    const data =
        await response.json();

    return Array.isArray(data.files) &&
        data.files.length > 0
            ? data.files[0]
            : null;
}


async function readFavoriteMembersFile(
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
            `Google Drive favorite-members download error: ${response.status} ${errorText}`
        );
    }

    const data =
        await response.json();

    return normalizeFavoriteMemberKeys(
        data.favoriteMemberKeys
    );
}


async function updateFavoriteMembersFile(
    accessToken,
    fileId,
    favoriteMemberKeys
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
                            favoriteMemberKeys
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
            `Google Drive favorite-members update error: ${response.status} ${errorText}`
        );
    }
}


async function createFavoriteMembersFile(
    accessToken,
    folderId,
    favoriteMemberKeys
) {
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
                            FAVORITE_MEMBERS_FILE_NAME,
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
            `Google Drive favorite-members metadata create error: ${createResponse.status} ${errorText}`
        );
    }

    const createdFile =
        await createResponse.json();

    if (
        !createdFile?.id
    ) {
        throw new Error(
            "Google Drive favorite-members create error: file id was not returned"
        );
    }

    await updateFavoriteMembersFile(
        accessToken,
        createdFile.id,
        favoriteMemberKeys
    );
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

        if (
            ![
                "nogizaka46",
                "sakurazaka46",
                "hinatazaka46"
            ].includes(group)
        ) {
            return jsonResponse({
                favoriteMemberKeys: []
            });
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
                        "favorite members folder is not configured"
                },
                500
            );
        }

        const accessToken =
            await getGoogleAccessToken(
                env
            );

        const file =
            await findFavoriteMembersFile(
                accessToken,
                folderId
            );

        if (
            !file
        ) {
            return jsonResponse({
                favoriteMemberKeys: []
            });
        }

        const favoriteMemberKeys =
            await readFavoriteMembersFile(
                accessToken,
                file.id
            );

        return jsonResponse({
            favoriteMemberKeys
        });

    } catch (
        error
    ) {
        console.error(error);

        return jsonResponse(
            {
                error:
                    "推しメン情報の取得に失敗しました。"
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

        const memberKey =
            String(
                body?.memberKey ||
                ""
            );

        const favorite =
            body?.favorite;

        if (
            ![
                "nogizaka46",
                "sakurazaka46",
                "hinatazaka46"
            ].includes(group) ||
            !/^[a-z0-9_]+$/i.test(memberKey) ||
            typeof favorite !== "boolean"
        ) {
            return jsonResponse(
                {
                    error:
                        "invalid favorite member request"
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
                        "favorite members folder is not configured"
                },
                500
            );
        }

        const accessToken =
            await getGoogleAccessToken(
                env
            );

        const file =
            await findFavoriteMembersFile(
                accessToken,
                folderId
            );

        let favoriteMemberKeys =
            file
                ? await readFavoriteMembersFile(
                    accessToken,
                    file.id
                )
                : [];

        if (
            favorite
        ) {
            if (
                !favoriteMemberKeys.includes(
                    memberKey
                )
            ) {
                favoriteMemberKeys.push(
                    memberKey
                );
            }
        } else {
            favoriteMemberKeys =
                favoriteMemberKeys.filter(
                    value =>
                        value !== memberKey
                );
        }

        if (
            file
        ) {
            await updateFavoriteMembersFile(
                accessToken,
                file.id,
                favoriteMemberKeys
            );
        } else {
            await createFavoriteMembersFile(
                accessToken,
                folderId,
                favoriteMemberKeys
            );
        }

        return jsonResponse({
            favoriteMemberKeys
        });

    } catch (
        error
    ) {
        console.error(error);

        return jsonResponse(
            {
                error:
                    "推しメン情報の保存に失敗しました。"
            },
            500
        );
    }
}
