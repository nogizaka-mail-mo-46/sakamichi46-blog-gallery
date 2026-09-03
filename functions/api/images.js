import {
    members
} from "../data/member-data.js";

import {
    getGoogleAccessToken
} from "../lib/google.js";

import {
    getImagesByDate,
    getImagesByMonth,
    getImagesFromFolder,
    getTargetMembers
} from "../lib/drive.js";

import {
    createAndCacheCalendarResponse,
    createAndCacheMemberCalendarResponse,
    getCachedCalendarResponse
} from "../lib/calendar-cache.js";

import {
    cacheImageListResponse,
    getCachedImageListResponse
} from "../lib/image-list-cache.js";


export async function onRequestGet(
    context
) {
    const {
        request,
        env
    } = context;

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

    const date =
        url.searchParams.get(
            "date"
        );

    const month =
        url.searchParams.get(
            "month"
        );


    /*
     * ========================================
     * グループ確認
     * ========================================
     */

    if (
        !group
    ) {
        return Response.json(
            {
                error:
                    "groupを指定してください。"
            },
            {
                status:
                    400
            }
        );
    }

    const targetMembers =
        getTargetMembers(
            group
        );

    if (
        targetMembers.length === 0
    ) {
        return Response.json(
            {
                error:
                    "指定されたグループが見つかりません。"
            },
            {
                status:
                    404
            }
        );
    }


    /*
     * ========================================
     * 日付確認
     * ========================================
     */

    if (
        date &&
        !/^\d{8}$/.test(
            date
        )
    ) {
        return Response.json(
            {
                error:
                    "dateはYYYYMMDD形式で指定してください。"
            },
            {
                status:
                    400
            }
        );
    }


    /*
     * ========================================
     * 月確認
     * ========================================
     */

    if (
        month &&
        !/^\d{6}$/.test(
            month
        )
    ) {
        return Response.json(
            {
                error:
                    "monthはYYYYMM形式で指定してください。"
            },
            {
                status:
                    400
            }
        );
    }


    /*
     * ========================================
     * dateとmonthの同時指定は禁止
     * ========================================
     */

    if (
        date &&
        month
    ) {
        return Response.json(
            {
                error:
                    "dateとmonthは同時に指定できません。"
            },
            {
                status:
                    400
            }
        );
    }


    /*
     * ========================================
     * グループ全体の投稿日取得
     * ========================================
     */

    if (
        !memberKey &&
        !date &&
        !month
    ) {
        try {
            const cachedResponse =
                await getCachedCalendarResponse(
                    request,
                    group
                );

            if (
                cachedResponse
            ) {
                return cachedResponse;
            }

            const accessToken =
                await getGoogleAccessToken(
                    env
                );

            return await createAndCacheCalendarResponse(
                context,
                request,
                accessToken,
                group
            );
        } catch (
            error
        ) {
            console.error(
                "Calendar API error:",
                error
            );

            return Response.json(
                {
                    error:
                        "投稿日情報の取得に失敗しました。"
                },
                {
                    status:
                        500
                }
            );
        }
    }


    /*
     * ========================================
     * メンバー確認
     * ========================================
     */

    let member =
        null;

    if (
        memberKey
    ) {
        member =
            members[
                memberKey
            ];

        if (
            !member
        ) {
            return Response.json(
                {
                    error:
                        "指定されたメンバーが見つかりません。"
                },
                {
                    status:
                        404
                }
            );
        }

        if (
            member.group !==
            group
        ) {
            return Response.json(
                {
                    error:
                        "指定されたメンバーはこのグループに所属していません。"
                },
                {
                    status:
                        400
                }
            );
        }
    }


    /*
     * ========================================
     * メンバー個別の投稿日取得
     * ========================================
     */

    if (
        memberKey &&
        !date &&
        !month
    ) {
        try {
            const cachedResponse =
                await getCachedCalendarResponse(
                    request,
                    group,
                    memberKey
                );

            if (
                cachedResponse
            ) {
                return cachedResponse;
            }

            const accessToken =
                await getGoogleAccessToken(
                    env
                );

            return await createAndCacheMemberCalendarResponse(
                context,
                request,
                accessToken,
                group,
                memberKey,
                member
            );
        } catch (
            error
        ) {
            console.error(
                "Member calendar API error:",
                error
            );

            return Response.json(
                {
                    error:
                        "投稿日情報の取得に失敗しました。"
                },
                {
                    status:
                        500
                }
            );
        }
    }


    /*
     * ========================================
     * 画像一覧キャッシュ確認
     * ========================================
     */

    try {
        const cachedResponse =
            await getCachedImageListResponse(
                request,
                group,
                memberKey,
                date,
                month
            );

        if (
            cachedResponse
        ) {
            return cachedResponse;
        }


        /*
         * ========================================
         * キャッシュなしの場合のみ
         * Google Access Token取得
         * ========================================
         */

        const accessToken =
            await getGoogleAccessToken(
                env
            );


        /*
         * ========================================
         * メンバー指定あり
         * ========================================
         */

        if (
            memberKey
        ) {
            let namePrefix =
                null;

            if (
                date
            ) {
                namePrefix =
                    `${date}_`;
            } else if (
                month
            ) {
                namePrefix =
                    month;
            }

            const images =
                await getImagesFromFolder(
                    accessToken,
                    member.folderId,
                    namePrefix
                );

            images.sort(
                (
                    a,
                    b
                ) =>
                    b.name.localeCompare(
                        a.name
                    )
            );

            const response =
                Response.json({
                    member: {
                        key:
                            memberKey,

                        name:
                            member.name,

                        group:
                            member.group
                    },

                    date:
                        date,

                    month:
                        month,

                    images:
                        images
                });

            cacheImageListResponse(
                context,
                request,
                group,
                memberKey,
                date,
                month,
                response
            );

            return response;
        }


        /*
         * ========================================
         * グループ全体・日付指定
         * ========================================
         */

        if (
            date
        ) {
            const images =
                await getImagesByDate(
                    accessToken,
                    date,
                    group
                );

            const response =
                Response.json({
                    group:
                        group,

                    date:
                        date,

                    images:
                        images
                });

            cacheImageListResponse(
                context,
                request,
                group,
                memberKey,
                date,
                month,
                response
            );

            return response;
        }


        /*
         * ========================================
         * グループ全体・月指定
         * ========================================
         */

        if (
            month
        ) {
            const images =
                await getImagesByMonth(
                    accessToken,
                    month,
                    group
                );

            const response =
                Response.json({
                    group:
                        group,

                    month:
                        month,

                    images:
                        images
                });

            cacheImageListResponse(
                context,
                request,
                group,
                memberKey,
                date,
                month,
                response
            );

            return response;
        }


        /*
         * ========================================
         * 想定外
         * ========================================
         */

        return Response.json(
            {
                error:
                    "dateまたはmonthを指定してください。"
            },
            {
                status:
                    400
            }
        );
    } catch (
        error
    ) {
        console.error(
            "Images API error:",
            error
        );

        return Response.json(
            {
                error:
                    "画像一覧の取得に失敗しました。"
            },
            {
                status:
                    500
            }
        );
    }
}
