import { members } from "../data/members.js";

export async function onRequestGet() {
    const memberList =
        Object.entries(
            members
        ).map(
            ([key, member]) => ({
                key:
                    key,

                name:
                    member.name
            })
        );

    return Response.json({
        members:
            memberList
    });
}
