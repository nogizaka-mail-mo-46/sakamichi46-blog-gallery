import {
    fetchReadStatus,
    markArticleRead
} from "./api.js";


/*
 * ========================================
 * 既読管理
 *
 * Google Drive 上の既読情報の取得・登録と、
 * ギャラリーへの反映をまとめて扱う。
 * ========================================
 */

export function createReadStatusManager({
    getCurrentGroup,
    isCurrentDataRequest,
    gallery,
    hasBlogs,
    onReadStatusChange
}) {

    let readArticleIds =
        [];


    function normalizeReadArticleIds(
        values
    ) {
        return Array.isArray(
            values
        )
            ? values.map(
                value => String(value)
            )
            : [];
    }


    function applyReadArticleIds(
        values
    ) {
        readArticleIds =
            normalizeReadArticleIds(
                values
            );

        gallery.setReadArticleIds(
            readArticleIds
        );

        if (
            hasBlogs()
        ) {
            onReadStatusChange();
        }
    }


    async function loadReadStatus(
        requestVersion
    ) {
        const requestGroup =
            getCurrentGroup();

        try {
            const data =
                await fetchReadStatus(
                    requestGroup
                );

            if (
                !isCurrentDataRequest(
                    requestVersion
                ) ||
                getCurrentGroup() !==
                    requestGroup
            ) {
                return;
            }

            applyReadArticleIds(
                data.readArticleIds
            );

        } catch (
            error
        ) {
            console.error(
                error
            );
        }
    }


    async function registerArticleRead(
        articleId,
        group
    ) {
        if (
            ![
                "nogizaka46",
                "sakurazaka46",
                "hinatazaka46"
            ].includes(group) ||
            !articleId
        ) {
            return;
        }

        const normalizedArticleId =
            String(articleId);

        if (
            readArticleIds.includes(
                normalizedArticleId
            )
        ) {
            return;
        }

        try {
            const data =
                await markArticleRead({
                    group,
                    articleId:
                        normalizedArticleId
                });

            if (
                getCurrentGroup() !==
                    group
            ) {
                return;
            }

            applyReadArticleIds(
                Array.isArray(
                    data.readArticleIds
                )
                    ? data.readArticleIds
                    : [
                        ...readArticleIds,
                        normalizedArticleId
                    ]
            );

        } catch (
            error
        ) {
            console.error(
                error
            );
        }
    }


    function getReadArticleIds() {
        return readArticleIds;
    }


    return {
        loadReadStatus,
        registerArticleRead,
        getReadArticleIds
    };
}
