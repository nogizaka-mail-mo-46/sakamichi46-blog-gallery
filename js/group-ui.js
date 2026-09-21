/*
 * ========================================
 * グループUI
 *
 * グループの保存・検証と、
 * ヒーロー表示の更新を担当する。
 * ========================================
 */

const hero =
    document.getElementById(
        "hero"
    );

const heroBackgroundA =
    document.getElementById(
        "heroBackgroundA"
    );

const heroBackgroundB =
    document.getElementById(
        "heroBackgroundB"
    );

const heroTitle =
    document.getElementById(
        "heroTitle"
    );

const heroSubtitle =
    document.getElementById(
        "heroSubtitle"
    );

export const heroGroupButtons =
    Array.from(
        document.querySelectorAll(
            ".hero-group-button"
        )
    );

const LAST_GROUP_STORAGE_KEY =
    "sakamichi46-last-group";

const heroGroupData = {

    nogizaka46: {
        title:
            "乃木坂46",
        subtitle:
            "NOGIZAKA46 BLOG GALLERY",
        background:
            "/images/hero/nogizaka46.webp"
    },

    sakurazaka46: {
        title:
            "櫻坂46",
        subtitle:
            "SAKURAZAKA46 BLOG GALLERY",
        background:
            "/images/hero/sakurazaka46.webp"
    },

    hinatazaka46: {
        title:
            "日向坂46",
        subtitle:
            "HINATAZAKA46 BLOG GALLERY",
        background:
            "/images/hero/hinatazaka46.webp"
    }
};

let activeHeroBackground =
    "A";

let currentHeroGroup =
    null;

let requestedHeroGroup =
    null;

export function isValidGroup(
    group
) {
    return Boolean(
        heroGroupData[
            group
        ]
    );
}

export function getSavedGroup() {
    try {
        const savedGroup =
            localStorage.getItem(
                LAST_GROUP_STORAGE_KEY
            );
        if (
            isValidGroup(
                savedGroup
            )
        ) {
            return savedGroup;
        }
    } catch (error) {
        // localStorage が利用できない環境では既定値を使う
    }
    return "nogizaka46";
}

export function saveCurrentGroup(
    group
) {
    try {
        localStorage.setItem(
            LAST_GROUP_STORAGE_KEY,
            group
        );
    } catch (error) {
        // 保存できない環境でもグループ切替自体は継続する
    }
}

export function updateHero(
    group
) {
    const data =
        heroGroupData[
            group
        ];

    if (
        !data
    ) {
        return;
    }

    heroTitle.textContent =
        data.title;
    heroSubtitle.textContent =
        data.subtitle;

    hero.classList.remove(
        "hero-nogizaka46",
        "hero-sakurazaka46",
        "hero-hinatazaka46"
    );
    hero.classList.add(
        `hero-${group}`
    );

    document.body.classList.remove(
        "group-nogizaka46",
        "group-sakurazaka46",
        "group-hinatazaka46"
    );
    document.body.classList.add(
        `group-${group}`
    );

    heroGroupButtons.forEach(
        button => {
            const selected =
                button.dataset.group ===
                    group;
            button.classList.toggle(
                "active",
                selected
            );
            button.setAttribute(
                "aria-pressed",
                selected
                    ? "true"
                    : "false"
            );
        }
    );

    if (
        currentHeroGroup ===
            null
    ) {
        heroBackgroundA.style.backgroundImage =
            `url("${data.background}")`;
        heroBackgroundA.classList.add(
            "active"
        );
        heroBackgroundB.classList.remove(
            "active"
        );
        activeHeroBackground =
            "A";
        currentHeroGroup =
            group;
        requestedHeroGroup =
            group;
        return;
    }

    if (
        currentHeroGroup ===
            group
    ) {
        requestedHeroGroup =
            group;
        return;
    }

    requestedHeroGroup =
        group;
    const preloadImage =
        new Image();
    preloadImage.src =
        data.background;
    preloadImage.onload =
        () => {
            if (
                requestedHeroGroup !==
                    group
            ) {
                return;
            }

            const currentBackground =
                activeHeroBackground ===
                    "A"
                    ? heroBackgroundA
                    : heroBackgroundB;
            const nextBackground =
                activeHeroBackground ===
                    "A"
                    ? heroBackgroundB
                    : heroBackgroundA;

            nextBackground.style.backgroundImage =
                `url("${data.background}")`;
            nextBackground.classList.add(
                "active"
            );
            currentBackground.classList.remove(
                "active"
            );
            activeHeroBackground =
                activeHeroBackground ===
                    "A"
                    ? "B"
                    : "A";
            currentHeroGroup =
                group;
        };
}
