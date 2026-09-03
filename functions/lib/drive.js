import {
    members
} from "../data/member-data.js";


/**
 * ============================================
 * ★ Google Drive query用文字列エスケープ
 * ============================================
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


/**
 * ============================================
 * ★ 指定フォルダから画像一覧取得
 *
 * 【namePrefix】
 * - null      → 全画像
 * - YYYYMM    → 指定月
 * - YYYYMMDD_ → 指定日
 *
 * 【properties】
 * - articleId
 * - title
 * - imageIndex
 * - blogDate
 * - blogTimestamp
 * - memberId
 * - groupId
 * ============================================
 */
export async function getImagesFromFolder(
    accessToken,
    folderId,
    namePrefix = null
) {
    const files =
        [];

    let pageToken =
        null;

    do {
        let query =
            `'${escapeDriveQueryValue(
                folderId
            )}' in parents and trashed = false`;

        if (
            namePrefix
        ) {
            query +=
                ` and name contains '${escapeDriveQueryValue(
                    namePrefix
                )}'`;
        }

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
            "1000"
        );

        url.searchParams.set(
            "fields",
            "nextPageToken,files(id,name,mimeType,createdTime,properties)"
        );

        if (
            pageToken
        ) {
            url.searchParams.set(
                "pageToken",
                pageToken
            );
        }

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
                `Google Drive API error: ${response.status} ${errorText}`
            );
        }

        const data =
            await response.json();

        const pageFiles =
            (
                data.files ||
                []
            )
                .filter(
                    file =>
                        file.mimeType &&
                        file.mimeType.startsWith(
                            "image/"
                        )
                )
                .filter(
                    file =>
                        !namePrefix ||
                        file.name.startsWith(
                            namePrefix
                        )
                )
                .map(
                    file => ({
                        id:
                            file.id,

                        name:
                            file.name,

                        mimeType:
                            file.mimeType,

                        createdTime:
                            file.createdTime,

                        articleId:
                            file.properties?.articleId ||
                            null,

                        title:
                            file.properties?.title ||
                            "",

                        imageIndex:
                            Number(
                                file.properties?.imageIndex ||
                                0
                            ),

                        blogDate:
                            file.properties?.blogDate ||
                            null,

                        blogTimestamp:
                            file.properties?.blogTimestamp ||
                            null,

                        memberId:
                            file.properties?.memberId ||
                            null,

                        groupId:
                            file.properties?.groupId ||
                            null
                    })
                );

        files.push(
            ...pageFiles
        );

        pageToken =
            data.nextPageToken ||
            null;

    } while (
        pageToken
    );

    return files;
}


/**
 * ============================================
 * ★ 指定フォルダから画像ファイル名のみ取得
 *
 * カレンダー生成用。
 * 不要なmetadataを取得しない。
 * ============================================
 */
async function getImageNamesFromFolder(
    accessToken,
    folderId
) {
    const names =
        [];

    let pageToken =
        null;

    do {
        const query =
            `'${escapeDriveQueryValue(
                folderId
            )}' in parents and trashed = false`;

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
            "1000"
        );

        url.searchParams.set(
            "fields",
            "nextPageToken,files(name,mimeType)"
        );

        if (
            pageToken
        ) {
            url.searchParams.set(
                "pageToken",
                pageToken
            );
        }

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
                `Google Drive API error: ${response.status} ${errorText}`
            );
        }

        const data =
            await response.json();

        const pageNames =
            (
                data.files ||
                []
            )
                .filter(
                    file =>
                        file.mimeType &&
                        file.mimeType.startsWith(
                            "image/"
                        )
                )
                .map(
                    file =>
                        file.name
                );

        names.push(
            ...pageNames
        );

        pageToken =
            data.nextPageToken ||
            null;

    } while (
        pageToken
    );

    return names;
}


/**
 * ============================================
 * ★ 指定グループのメンバー一覧取得
 * ============================================
 */
export function getTargetMembers(
    group
) {
    return Object.entries(
        members
    )
        .filter(
            (
                [
                    ,
                    member
                ]
            ) =>
                member.group ===
                group
        )
        .map(
            (
                [
                    memberKey,
                    member
                ]
            ) => ({
                memberKey:
                    memberKey,

                ...member
            })
        );
}


/**
 * ============================================
 * ★ 配列を指定件数ずつ並列処理
 * ============================================
 */
async function processInBatches(
    items,
    batchSize,
    processor
) {
    const results =
        [];

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


/**
 * ============================================
 * ★ グループ全体の投稿日一覧取得
 * ============================================
 */
export async function getPostDates(
    accessToken,
    group
) {
    const targetMembers =
        getTargetMembers(
            group
        );

    const memberNames =
        await processInBatches(
            targetMembers,
            5,
            async member => {
                return await getImageNamesFromFolder(
                    accessToken,
                    member.folderId
                );
            }
        );

    const postDates =
        new Set();

    for (
        const names of memberNames
    ) {
        for (
            const name of names
        ) {
            const match =
                name.match(
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
    }

    return [
        ...postDates
    ].sort();
}


/**
 * ============================================
 * ★ メンバー単体の投稿日一覧取得
 * ============================================
 */
export async function getMemberPostDates(
    accessToken,
    member
) {
    const names =
        await getImageNamesFromFolder(
            accessToken,
            member.folderId
        );

    const postDates =
        new Set();

    for (
        const name of names
    ) {
        const match =
            name.match(
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

    return [
        ...postDates
    ].sort();
}


/**
 * ============================================
 * ★ グループ全体から指定日の画像取得
 * ============================================
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

    const memberImages =
        await processInBatches(
            targetMembers,
            5,
            async member => {
                const images =
                    await getImagesFromFolder(
                        accessToken,
                        member.folderId,
                        namePrefix
                    );

                return images.map(
                    image => ({
                        ...image,

                        memberKey:
                            member.memberKey,

                        memberName:
                            member.name,

                        group:
                            member.group
                    })
                );
            }
        );

    return memberImages
        .flat()
        .sort(
            (
                a,
                b
            ) =>
                b.name.localeCompare(
                    a.name
                )
        );
}


/**
 * ============================================
 * ★ グループ全体から指定月の画像取得
 * ============================================
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

    const memberImages =
        await processInBatches(
            targetMembers,
            5,
            async member => {
                const images =
                    await getImagesFromFolder(
                        accessToken,
                        member.folderId,
                        month
                    );

                return images.map(
                    image => ({
                        ...image,

                        memberKey:
                            member.memberKey,

                        memberName:
                            member.name,

                        group:
                            member.group
                    })
                );
            }
        );

    return memberImages
        .flat()
        .sort(
            (
                a,
                b
            ) =>
                b.name.localeCompare(
                    a.name
                )
        );
}
