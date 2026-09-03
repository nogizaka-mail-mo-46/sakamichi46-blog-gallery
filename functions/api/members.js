import {
    members
} from "../data/member-data.js";


/*
 * ========================================
 * メンバー一覧API
 * ========================================
 */

export async function onRequestGet(
    context
) {
    const {
        request
    } = context;

    const url =
        new URL(
            request.url
        );

    const group =
        url.searchParams.get(
            "group"
        );


    /*
     * ========================================
     * メンバー一覧作成
     * ========================================
     */

    const memberList =
        Object.entries(
            members
        )
            .filter(
                ([
                    key,
                    member
                ]) => {
                    /*
                     * group指定なし
                     * → 全メンバー
                     */

                    if (
                        !group
                    ) {
                        return true;
                    }


                    /*
                     * group指定あり
                     * → 同じグループのみ
                     */

                    return (
                        member.group ===
                        group
                    );
                }
            )
            .map(
                ([
                    key,
                    member
                ]) => ({
                    key:
                        key,

                    name:
                        member.name,

                    group:
                        member.group
                })
            );


    /*
     * ========================================
     * レスポンス
     * ========================================
     */

    return Response.json({
        members:
            memberList
    });
}
