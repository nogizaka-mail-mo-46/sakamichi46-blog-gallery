import {
    nogizakaMembers
} from "./nogizaka-members.js";

import {
    sakurazakaMembers
} from "./sakurazaka-members.js";

import {
    hinatazakaMembers
} from "./hinatazaka-members.js";


export const members = {
    ...nogizakaMembers,
    ...sakurazakaMembers,
    ...hinatazakaMembers
};
