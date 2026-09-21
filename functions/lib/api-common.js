import {
    members
} from "../data/member-data.js";


/**
 * ============================================
 * ★ API共通ユーティリティ
 * ★ api-common.js
 *
 * blogs.js / search.js で同じ挙動の処理のみ共通化
 * ============================================
 */


/*
 * ========================================
 * Drive検索用文字列のエスケープ
 * ========================================
 */

export function escapeDriveQueryValue(
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
 * 一定件数ずつ並列処理
 * ========================================
 */

export async function processInBatches(
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


/*
 * ========================================
 * 対象メンバー取得
 * ========================================
 */

export function getTargetMembers(
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
