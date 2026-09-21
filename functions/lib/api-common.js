/**
 * ============================================
 * ★ API 共通ユーティリティ
 *
 * blogs.js / search.js で共通利用する処理。
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


function getTargetMembers(
    group,
    memberKey = null,
    generation = null
) {
    if (
        memberKey
    ) {
        const member =
            members[
                memberKey
            ];

        if (
            !member
        ) {
            return [];
        }

        if (
            member.group !==
                group
        ) {
            return [];
        }

        return [
            [
                memberKey,
                member
            ]
        ];
    }

    return Object.entries(
        members
    ).filter(
        ([
            key,
            member
        ]) => {

            if (
                member.group !==
                    group
            ) {
                return false;
            }

            if (
                generation !==
                    null
            ) {
                return (
                    member.generation ===
                    generation
                );
            }

            return true;
        }
    );
}


async function getDriveFileText(
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

        console.error(
            "Google Drive file error:",
            fileId,
            errorText
        );

        throw new Error(
            "index.jsonの取得に失敗しました。"
        );
    }

    return await response.text();
}


function createDateKey(
    date
) {
    if (
        typeof date !==
            "string"
    ) {
        return "";
    }

    const dateKey =
        date.replace(
            /-/g,
            ""
        );

    return /^\d{8}$/.test(
        dateKey
    )
        ? dateKey
        : "";
}

export {
    escapeDriveQueryValue,
    processInBatches,
    getTargetMembers,
    getDriveFileText,
    createDateKey
};
