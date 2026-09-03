import {
    members
} from "../data/members.js";

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
     * date形式チェック
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
                    "dateの形式が正しくありません。"
            },
            {
                status:
                    400
            }
        );
    }


    /*
     * ========================================
     * month形式チェック
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
                    "monthの形式が正しくありません。"
            },
            {
                status:
                    400
            }
        );
    }


    /*
     * ========================================
     * dateとmonth同時指定チェック
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
     * group存在チェック
     * ========================================
     */

    if (
        group &&
        getTargetMembers(
            group
        ).length ===
            0
    ) {
        return Response.json(
            {
                error:
                    "存在しないグループです。"
            },
            {
                status:
                    404
            }
        );
    }


    /*
     * ========================================
     * カレンダー投稿日一覧
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
                error
            );

            return Response.json(
                {
                    error:
                        "投稿日一覧の取得中にエラーが発生しました。"
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
     * メンバーカレンダー投稿日一覧
     * ========================================
     */

    if (
        memberKey &&
        !date &&
        !month
    ) {
        const member =
            members[
                memberKey
            ];

        if (
            !member
        ) {
            return Response.json(
                {
                    error:
                        "存在しないメンバーです。"
                },
                {
                    status:
                        404
                }
            );
        }

        if (
            group &&
            member.group !==
                group
        ) {
            return Response.json(
                {
                    error:
                        "指定されたグループにそのメンバーは存在しません。"
                },
                {
                    status:
                        404
                }
            );
        }

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
                error
            );

            return Response.json(
                {
                    error:
                        "メンバー投稿日一覧の取得中にエラーが発生しました。"
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
     * 画像取得
     * ========================================
     */

    try {
        const accessToken =
            await getGoogleAccessToken(
                env
            );

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
                return Response.json(
                    {
                        error:
                            "存在しないメンバーです。"
                    },
                    {
                        status:
                            404
                    }
                );
            }

            if (
                group &&
                member.group !==
                    group
            ) {
                return Response.json(
                    {
                        error:
                            "指定されたグループにそのメンバーは存在しません。"
                    },
                    {
                        status:
                            404
                    }
                );
            }

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

            let images =
                await getImagesFromFolder(
                    accessToken,
                    member.folderId,
                    namePrefix
                );

            if (
                date
            ) {
                images =
                    images.filter(
                        (image) =>
                            image.name &&
                            image.name.startsWith(
                                `${date}_`
                            )
                    );
            }

            if (
                month
            ) {
                images =
                    images.filter(
                        (image) =>
                            image.name &&
                            image.name.startsWith(
                                month
                            )
                    );
            }

            images.sort(
                (a, b) =>
                    b.name.localeCompare(
                        a.name
                    )
            );

            return Response.json({
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
        }

        if (
            date
        ) {
            const images =
                await getImagesByDate(
                    accessToken,
                    date,
                    group
                );

            return Response.json({
                group:
                    group,

                date:
                    date,

                images:
                    images
            });
        }

        if (
            month
        ) {
            const images =
                await getImagesByMonth(
                    accessToken,
                    month,
                    group
                );

            return Response.json({
                group:
                    group,

                month:
                    month,

                images:
                    images
            });
        }

        return Response.json(
            {
                error:
                    "不正なリクエストです。"
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
            error
        );

        return Response.json(
            {
                error:
                    "画像一覧の取得中にエラーが発生しました。"
            },
            {
                status:
                    500
            }
        );
    }
}
