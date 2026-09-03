import {
    members
} from "../data/members.js";


/*
 * ========================================
 * Drive検索用文字列のエスケープ
 * ========================================
 */

function escapeDriveQueryValue(
    value
) {
    return value
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
 * 指定フォルダ内の画像取得
 * ========================================
 */

export async function getImagesFromFolder(
    accessToken,
    folderId,
    namePrefix = null
) {
    const images = [];

    let pageToken =
        null;

    do {
        const queryParts = [
            `'${escapeDriveQueryValue(folderId)}' in parents`,
            "trashed = false"
        ];

        if (
            namePrefix
        ) {
            queryParts.push(
                `name contains '${escapeDriveQueryValue(namePrefix)}'`
            );
        }

        const params =
            new URLSearchParams({
                q:
                    queryParts.join(
                        " and "
                    ),

                pageSize:
                    "1000",

                fields:
                    "nextPageToken,files(id,name,mimeType,createdTime)"
            });

        if (
            pageToken
        ) {
            params.set(
                "pageToken",
                pageToken
            );
        }

        const driveResponse =
            await fetch(
                `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${accessToken}`
                    }
                }
            );

        if (
            !driveResponse.ok
        ) {
            const errorText =
                await driveResponse.text();

            console.error(
                "Google Drive API error:",
                errorText
            );

            throw new Error(
                "Google Driveの画像一覧取得に失敗しました。"
            );
        }

        const driveData =
            await driveResponse.json();

        const imageFiles =
            driveData.files.filter(
                (file) => {
                    if (
                        !file.mimeType ||
                        !file.mimeType.startsWith(
                            "image/"
                        )
                    ) {
                        return false;
                    }

                    if (
                        namePrefix &&
                        (
                            !file.name ||
                            !file.name.startsWith(
                                namePrefix
                            )
                        )
                    ) {
                        return false;
                    }

                    return true;
                }
            );

        images.push(
            ...imageFiles
        );

        pageToken =
            driveData.nextPageToken ||
            null;

    } while (
        pageToken
    );

    return images;
}


/*
 * ========================================
 * 投稿日取得用の軽量画像一覧取得
 * ========================================
 */

async function getImageNamesFromFolder(
    accessToken,
    folderId
) {
    const imageNames = [];

    let pageToken =
        null;

    do {
        const params =
            new URLSearchParams({
                q:
                    [
                        `'${escapeDriveQueryValue(folderId)}' in parents`,
                        "trashed = false"
                    ].join(
                        " and "
                    ),

                pageSize:
                    "1000",

                fields:
                    "nextPageToken,files(name,mimeType)"
            });

        if (
            pageToken
        ) {
            params.set(
                "pageToken",
                pageToken
            );
        }

        const driveResponse =
            await fetch(
                `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${accessToken}`
                    }
                }
            );

        if (
            !driveResponse.ok
        ) {
            const errorText =
                await driveResponse.text();

            console.error(
                "Google Drive API error:",
                errorText
            );

            throw new Error(
                "Google Driveの投稿日一覧取得に失敗しました。"
            );
        }

        const driveData =
            await driveResponse.json();

        const names =
            driveData.files
                .filter(
                    (file) =>
                        file.mimeType &&
                        file.mimeType.startsWith(
                            "image/"
                        ) &&
                        file.name
                )
                .map(
                    (file) =>
                        file.name
                );

        imageNames.push(
            ...names
        );

        pageToken =
            driveData.nextPageToken ||
            null;

    } while (
        pageToken
    );

    return imageNames;
}


/*
 * ========================================
 * 対象メンバー取得
 * ========================================
 */

export function getTargetMembers(
    group
) {
    return Object.entries(
        members
    ).filter(
        ([
            key,
            member
        ]) => {
            if (
                !group
            ) {
                return true;
            }

            return (
                member.group ===
                group
            );
        }
    );
}


/*
 * ========================================
 * 一定件数ずつ並列処理
 * ========================================
 */

async function processInBatches(
    items,
    batchSize,
    processor
) {
    const results = [];

    for (
        let i = 0;
        i < items.length;
        i += batchSize
    ) {
        const batch =
            items.slice(
                i,
                i + batchSize
            );

        const batchResults =
            await Promise.all(
                batch.map(
                    processor
                )
            );

        results.push(
            ...batchResults
        );
    }

    return results;
}


/*
 * ========================================
 * 投稿日取得
 *
 * 5メンバーずつ並列取得
 * ========================================
 */

export async function getPostDates(
    accessToken,
    group
) {
    const targetMembers =
        getTargetMembers(
            group
        );

    const memberPostDates =
        await processInBatches(
            targetMembers,
            5,
            async ([
                memberKey,
                member
            ]) => {
                const imageNames =
                    await getImageNamesFromFolder(
                        accessToken,
                        member.folderId
                    );

                const postDates =
                    new Set();

                imageNames.forEach(
                    (imageName) => {
                        const match =
                            imageName.match(
                                /^(\d{8})_/
                            );

                        if (
                            match
                        ) {
                            postDates.add(
                                match[1]
                            );
                        }
                    }
                );

                return Array.from(
                    postDates
                );
            }
        );

    const postDates =
        new Set(
            memberPostDates.flat()
        );

    return Array.from(
        postDates
    ).sort();
}


/*
 * ========================================
 * メンバー投稿日取得
 * ========================================
 */

export async function getMemberPostDates(
    accessToken,
    member
) {
    const postDates =
        new Set();

    const imageNames =
        await getImageNamesFromFolder(
            accessToken,
            member.folderId
        );

    imageNames.forEach(
        (imageName) => {
            const match =
                imageName.match(
                    /^(\d{8})_/
                );

            if (
                match
            ) {
                postDates.add(
                    match[1]
                );
            }
        }
    );

    return Array.from(
        postDates
    ).sort();
}


/*
 * ========================================
 * 指定日の画像取得
 *
 * 5メンバーずつ並列取得
 * ========================================
 */

export async function getImagesByDate(
    accessToken,
    date,
    group
) {
    const targetMembers =
        getTargetMembers(
            group
        );

    const namePrefix =
        `${date}_`;

    const memberResults =
        await processInBatches(
            targetMembers,
            5,
            async ([
                memberKey,
                member
            ]) => {
                const images =
                    await getImagesFromFolder(
                        accessToken,
                        member.folderId,
                        namePrefix
                    );

                return images.map(
                    (image) => ({
                        id:
                            image.id,

                        name:
                            image.name,

                        mimeType:
                            image.mimeType,

                        createdTime:
                            image.createdTime,

                        memberKey:
                            memberKey,

                        memberName:
                            member.name,

                        group:
                            member.group
                    })
                );
            }
        );

    const result =
        memberResults.flat();

    result.sort(
        (a, b) =>
            b.name.localeCompare(
                a.name
            )
    );

    return result;
}


/*
 * ========================================
 * 指定月の画像取得
 *
 * 5メンバーずつ並列取得
 * ========================================
 */

export async function getImagesByMonth(
    accessToken,
    month,
    group
) {
    const targetMembers =
        getTargetMembers(
            group
        );

    const memberResults =
        await processInBatches(
            targetMembers,
            5,
            async ([
                memberKey,
                member
            ]) => {
                const images =
                    await getImagesFromFolder(
                        accessToken,
                        member.folderId,
                        month
                    );

                return images.map(
                    (image) => ({
                        id:
                            image.id,

                        name:
                            image.name,

                        mimeType:
                            image.mimeType,

                        createdTime:
                            image.createdTime,

                        memberKey:
                            memberKey,

                        memberName:
                            member.name,

                        group:
                            member.group
                    })
                );
            }
        );

    const result =
        memberResults.flat();

    result.sort(
        (a, b) =>
            b.name.localeCompare(
                a.name
            )
    );

    return result;
}
