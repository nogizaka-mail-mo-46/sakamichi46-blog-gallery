import {
    getMemberPostDates,
    getPostDates
} from "./drive.js";


function createCalendarCacheKey(
    request,
    group,
    memberKey = null
) {
    const cacheUrl =
        new URL(
            request.url
        );

    cacheUrl.search =
        "";

    cacheUrl.searchParams.set(
        "calendar",
        "1"
    );

    if (
        group
    ) {
        cacheUrl.searchParams.set(
            "group",
            group
        );
    }

    if (
        memberKey
    ) {
        cacheUrl.searchParams.set(
            "member",
            memberKey
        );
    }

    return new Request(
        cacheUrl.toString(),
        {
            method:
                "GET"
        }
    );
}


export async function getCachedCalendarResponse(
    request,
    group,
    memberKey = null
) {
    const cache =
        caches.default;

    const cacheKey =
        createCalendarCacheKey(
            request,
            group,
            memberKey
        );

    return await cache.match(
        cacheKey
    );
}


export async function createAndCacheCalendarResponse(
    context,
    request,
    accessToken,
    group
) {
    const postDates =
        await getPostDates(
            accessToken,
            group
        );

    const response =
        Response.json({
            group:
                group,

            postDates:
                postDates
        });

    response.headers.set(
        "Cache-Control",
        "public, max-age=3600"
    );

    const cache =
        caches.default;

    const cacheKey =
        createCalendarCacheKey(
            request,
            group
        );

    context.waitUntil(
        cache.put(
            cacheKey,
            response.clone()
        )
    );

    return response;
}


export async function createAndCacheMemberCalendarResponse(
    context,
    request,
    accessToken,
    group,
    memberKey,
    member
) {
    const postDates =
        await getMemberPostDates(
            accessToken,
            member
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

            postDates:
                postDates
        });

    response.headers.set(
        "Cache-Control",
        "public, max-age=3600"
    );

    const cache =
        caches.default;

    const cacheKey =
        createCalendarCacheKey(
            request,
            group,
            memberKey
        );

    context.waitUntil(
        cache.put(
            cacheKey,
            response.clone()
        )
    );

    return response;
}
