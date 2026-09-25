import {
    getImageUrl
} from "./image-url.js";

import {
    fetchFavoriteMembers,
    updateFavoriteMember
} from "./api.js";

const MEMBER_ICONS_API_URL =
    "/api/member-icons";

export function createMemberSelector({
    memberIconSelector,
    memberIconTrack,
    memberSelect,
    getMembers,
    getSelectedGeneration,
    setSelectedGeneration,
    getCurrentGroup,
    getDataRequestVersion,
    isCurrentDataRequest,
    onGenerationChange,
    onFavoriteFilterChange
}) {

    const memberIconMaps =
        new Map();

    const favoriteMemberMaps =
        new Map();

    let favoriteOnlyMode =
        false;

    let renderedGroup =
        null;

    async function loadFavoriteMemberKeys(
        group
    ) {
        if (
            favoriteMemberMaps.has(
                group
            )
        ) {
            return favoriteMemberMaps.get(
                group
            );
        }

        try {
            const data =
                await fetchFavoriteMembers(
                    group
                );

            const favoriteMemberKeys =
                new Set(
                    Array.isArray(
                        data.favoriteMemberKeys
                    )
                        ? data.favoriteMemberKeys.map(
                            value => String(value)
                        )
                        : []
                );

            favoriteMemberMaps.set(
                group,
                favoriteMemberKeys
            );

            return favoriteMemberKeys;

        } catch (
            error
        ) {
            console.error(
                error
            );

            return new Set();
        }
    }


    function normalizeMemberName(
        value
    ) {
        return String(
            value || ""
        )
            .normalize(
                "NFKC"
            )
            .replace(
                /\s+/g,
                ""
            );
    }

    async function loadMemberIconMap(
        group
    ) {
        if (
            memberIconMaps.has(
                group
            )
        ) {
            return memberIconMaps.get(
                group
            );
        }

        const iconMap =
            new Map();

        try {
            let response =
                null;

            for (
                let attempt = 0;
                attempt < 2;
                attempt += 1
            ) {
                try {
                    response =
                        await fetch(
                            `${MEMBER_ICONS_API_URL}` +
                            `?group=${encodeURIComponent(group)}`,
                            {
                                method:
                                    "GET",
                                credentials:
                                    "include"
                            }
                        );

                    if (
                        response.ok ||
                        (response.status !== 429 &&
                            response.status < 500) ||
                        attempt > 0
                    ) {
                        break;
                    }

                } catch (
                    error
                ) {
                    if (
                        attempt > 0
                    ) {
                        throw error;
                    }
                }

                await new Promise(
                    resolve =>
                        window.setTimeout(
                            resolve,
                            350
                        )
                );
            }

            if (
                !response?.ok
            ) {
                throw new Error(
                    `メンバーアイコン一覧の取得に失敗しました: ` +
                    `${response?.status || "network"}`
                );
            }

            const data =
                await response.json();

            if (
                !Array.isArray(
                    data.members
                )
            ) {
                throw new Error(
                    "メンバーアイコン一覧の形式が不正です。"
                );
            }

            data.members.forEach(
                member => {
                    if (
                        !member?.name ||
                        !member?.fileId
                    ) {
                        return;
                    }

                    iconMap.set(
                        normalizeMemberName(
                            member.name
                        ),
                        {
                            name:
                                member.name,
                            fileId:
                                member.fileId,
                            fileName:
                                member.fileName ||
                                ""
                        }
                    );
                }
            );

            memberIconMaps.set(
                group,
                iconMap
            );

        } catch (
            error
        ) {
            console.error(
                error
            );

            /*
             * 一時的な通信失敗で空Mapを固定しない。
             * 次回表示時には再取得できるようにする。
             */
        }

        return iconMap;
    }

    /*
     * ========================================
     * 他グループのアイコン一覧をアイドル時に先読み
     * ========================================
     *
     * 実画像は先読みしないため通信量を大きく増やさず、
     * グループ切替時の /api/member-icons 待ちだけを省く。
     */

    let iconMapWarmupScheduled =
        false;

    function scheduleMemberIconMapWarmup(
        currentGroup
    ) {
        if (
            iconMapWarmupScheduled
        ) {
            return;
        }

        iconMapWarmupScheduled =
            true;

        const groups = [
            "nogizaka46",
            "sakurazaka46",
            "hinatazaka46"
        ].filter(
            group =>
                group !== currentGroup
        );

        const warmup =
            () => {
                groups.forEach(
                    group => {
                        loadMemberIconMap(
                            group
                        ).catch(
                            error => {
                                console.error(
                                    error
                                );
                            }
                        );
                    }
                );
            };

        if (
            "requestIdleCallback" in window
        ) {
            window.requestIdleCallback(
                warmup,
                {
                    timeout: 2000
                }
            );
        } else {
            window.setTimeout(
                warmup,
                500
            );
        }
    }

    function updateSelection() {
        if (
            !memberIconTrack
        ) {
            return;
        }

        const selectedMemberKey =
            memberSelect.value;

        const selectedGeneration =
            getSelectedGeneration();

        const buttons =
            memberIconTrack.querySelectorAll(
                ".member-icon-button"
            );

        buttons.forEach(
            button => {
                const buttonMemberKey =
                    button.dataset.memberKey ||
                    "";

                const buttonGeneration =
                    button.dataset.generation
                        ? Number(
                            button.dataset.generation
                        )
                        : null;

                const buttonFavoriteFilter =
                    button.dataset.favoriteFilter ===
                        "true";

                let selected =
                    false;

                if (
                    buttonFavoriteFilter
                ) {
                    selected =
                        favoriteOnlyMode &&
                        !selectedMemberKey &&
                        selectedGeneration ===
                            null;
                } else if (
                    buttonGeneration !==
                        null
                ) {
                    selected =
                        !selectedMemberKey &&
                        selectedGeneration ===
                            buttonGeneration;
                } else {
                    selected =
                        !favoriteOnlyMode &&
                        selectedGeneration ===
                            null &&
                        buttonMemberKey ===
                            selectedMemberKey;
                }

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
    }

    function getGenerationOrdinal(
        generation
    ) {
        const value =
            Number(
                generation
            );

        const mod100 =
            value %
            100;

        let suffix =
            "th";

        if (
            mod100 < 11 ||
            mod100 > 13
        ) {
            switch (
                value % 10
            ) {
                case 1:
                    suffix = "st";
                    break;
                case 2:
                    suffix = "nd";
                    break;
                case 3:
                    suffix = "rd";
                    break;
            }
        }

        return `${value}${suffix}`;
    }

    function createMemberIconButton({
        memberKey = "",
        memberName,
        fileId = null,
        isAll = false,
        generation = null,
        imagePriority = false,
        favorite = false,
        favoriteFilter = false,
        onFavoriteToggle = null
    }) {
        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";
        button.className =
            "member-icon-button";
        button.dataset.memberKey =
            memberKey;

        if (
            favoriteFilter
        ) {
            button.dataset.favoriteFilter =
                "true";
        }

        if (
            generation !== null
        ) {
            button.dataset.generation =
                String(
                    generation
                );
        }

        button.setAttribute(
            "aria-pressed",
            "false"
        );

        button.setAttribute(
            "aria-label",
            isAll
                ? "全員を表示"
                : favoriteFilter
                    ? "推しメンだけ表示"
                    : generation !== null
                        ? `${generation}期生を表示`
                        : `${memberName}を選択`
        );

        const icon =
            document.createElement(
                "span"
            );
        icon.className =
            "member-icon-image-wrap";

        if (
            isAll ||
            favoriteFilter ||
            generation !== null
        ) {
            const textIcon =
                document.createElement(
                    "span"
                );
            textIcon.className =
                "member-icon-all-symbol";
            textIcon.textContent =
                isAll
                    ? "ALL"
                    : favoriteFilter
                        ? "推し"
                        : getGenerationOrdinal(
                            generation
                        );
            icon.appendChild(
                textIcon
            );
        } else if (
            fileId
        ) {
            const image =
                document.createElement(
                    "img"
                );
            image.className =
                "member-icon-image";
            image.src =
                getImageUrl(
                    fileId
                );
            image.alt = "";
            /*
             * 画面内に並ぶ先頭メンバーは遅延読み込みにせず、
             * アイコン一覧表示と同時に取得を開始する。
             * 横スクロール先のメンバーは従来どおりlazyにする。
             */
            image.loading =
                imagePriority
                    ? "eager"
                    : "lazy";

            if (
                imagePriority
            ) {
                image.fetchPriority =
                    "high";
            }

            image.decoding = "async";

            image.addEventListener(
                "error",
                () => {
                    image.remove();

                    const fallback =
                        document.createElement(
                            "span"
                        );
                    fallback.className =
                        "member-icon-fallback";
                    fallback.textContent =
                        memberName.substring(
                            0,
                            1
                        );
                    icon.appendChild(
                        fallback
                    );
                },
                {
                    once: true
                }
            );

            icon.appendChild(
                image
            );
        } else {
            const fallback =
                document.createElement(
                    "span"
                );
            fallback.className =
                "member-icon-fallback";
            fallback.textContent =
                memberName.substring(
                    0,
                    1
                );
            icon.appendChild(
                fallback
            );
        }

        if (
            !isAll &&
            !favoriteFilter &&
            generation === null &&
            memberKey
        ) {
            const favoriteButton =
                document.createElement(
                    "span"
                );

            favoriteButton.className =
                "member-favorite-button";
            favoriteButton.setAttribute(
                "role",
                "button"
            );
            favoriteButton.setAttribute(
                "tabindex",
                "0"
            );
            favoriteButton.setAttribute(
                "aria-pressed",
                favorite
                    ? "true"
                    : "false"
            );
            favoriteButton.setAttribute(
                "aria-label",
                favorite
                    ? `${memberName}を推しメンから解除`
                    : `${memberName}を推しメンに登録`
            );
            favoriteButton.textContent =
                favorite
                    ? "★"
                    : "☆";

            if (
                favorite
            ) {
                favoriteButton.classList.add(
                    "is-favorite"
                );
            }

            const toggleFavorite =
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    if (
                        favoriteButton.classList.contains(
                            "is-saving"
                        )
                    ) {
                        return;
                    }

                    onFavoriteToggle?.(
                        memberKey,
                        memberName,
                        !favorite
                    );
                };

            favoriteButton.addEventListener(
                "click",
                toggleFavorite
            );

            favoriteButton.addEventListener(
                "keydown",
                event => {
                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {
                        toggleFavorite(
                            event
                        );
                    }
                }
            );

            button.appendChild(
                favoriteButton
            );
        }

        const name =
            document.createElement(
                "span"
            );
        name.className =
            "member-icon-name";
        name.textContent =
            isAll
                ? "全員"
                : favoriteFilter
                    ? "推しメン"
                    : generation !== null
                        ? `${generation}期生`
                        : memberName;

        button.append(
            icon,
            name
        );

        button.addEventListener(
            "click",
            () => {
                const wasFavoriteOnlyMode =
                    favoriteOnlyMode;

                if (
                    isAll
                ) {
                    favoriteOnlyMode =
                        false;

                    if (
                        wasFavoriteOnlyMode
                    ) {
                        setSelectedGeneration(
                            null
                        );
                        memberSelect.value =
                            "";
                        memberSelect.dispatchEvent(
                            new Event(
                                "change",
                                {
                                    bubbles: true
                                }
                            )
                        );
                        return;
                    }
                }

                const selectedGeneration =
                    getSelectedGeneration();

                if (
                    favoriteFilter
                ) {
                    if (
                        favoriteOnlyMode
                    ) {
                        updateSelection();
                        return;
                    }

                    favoriteOnlyMode =
                        true;
                    setSelectedGeneration(
                        null
                    );
                    memberSelect.value =
                        "";
                    updateSelection();

                    if (
                        typeof onFavoriteFilterChange ===
                            "function"
                    ) {
                        onFavoriteFilterChange(
                            new Set(
                                favoriteMemberMaps.get(
                                    getCurrentGroup()
                                ) || []
                            )
                        );
                    }
                    return;
                }

                if (
                    generation !== null
                ) {
                    favoriteOnlyMode =
                        false;
                    if (
                        selectedGeneration === generation &&
                        !memberSelect.value
                    ) {
                        updateSelection();
                        return;
                    }

                    setSelectedGeneration(
                        generation
                    );
                    memberSelect.value =
                        "";
                    onGenerationChange(
                        generation
                    );
                    return;
                }

                if (
                    memberSelect.value === memberKey &&
                    selectedGeneration === null
                ) {
                    updateSelection();
                    return;
                }

                favoriteOnlyMode =
                    false;
                setSelectedGeneration(
                    null
                );
                memberSelect.value =
                    memberKey;
                memberSelect.dispatchEvent(
                    new Event(
                        "change",
                        {
                            bubbles: true
                        }
                    )
                );
            }
        );

        return button;
    }

    function resetScrollPosition() {
        if (
            !memberIconTrack
        ) {
            return;
        }

        memberIconTrack.scrollLeft =
            0;

        requestAnimationFrame(
            updateFadeState
        );
    }

    function updateFadeState() {
        if (
            !memberIconSelector ||
            !memberIconTrack
        ) {
            return;
        }

        const overflow =
            memberIconTrack.scrollWidth >
                memberIconTrack.clientWidth +
                2;

        const atEnd =
            memberIconTrack.scrollLeft +
                memberIconTrack.clientWidth >=
            memberIconTrack.scrollWidth -
                2;

        memberIconSelector.classList.toggle(
            "has-member-overflow",
            overflow
        );
        memberIconSelector.classList.toggle(
            "member-scroll-end",
            !overflow || atEnd
        );
    }

    async function render(
        requestVersion = getDataRequestVersion(),
        requestGroup = getCurrentGroup()
    ) {
        if (
            !memberIconSelector ||
            !memberIconTrack
        ) {
            return;
        }

        if (
            renderedGroup !==
                requestGroup
        ) {
            favoriteOnlyMode =
                false;
            renderedGroup =
                requestGroup;
        }

        memberIconTrack.innerHTML =
            "";
        memberIconSelector.hidden =
            false;
        memberSelect.hidden =
            true;

        memberIconTrack.appendChild(
            createMemberIconButton({
                memberKey: "",
                memberName: "全員",
                isAll: true
            })
        );

        const iconMap =
            await loadMemberIconMap(
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

        const favoriteMemberKeys =
            await loadFavoriteMemberKeys(
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

        memberIconTrack.appendChild(
            createMemberIconButton({
                memberName: "推しメン",
                favoriteFilter: true
            })
        );

        const allMembers =
            getMembers();

        const favoriteMembers =
            allMembers.filter(
                member =>
                    favoriteMemberKeys.has(
                        member.key
                    )
            );

        const otherMembers =
            allMembers.filter(
                member =>
                    !favoriteMemberKeys.has(
                        member.key
                    )
            );

        let memberImageIndex =
            0;

        const handleFavoriteToggle =
            async (
                memberKey,
                memberName,
                favorite
            ) => {
                const currentFavoriteKeys =
                    favoriteMemberMaps.get(
                        requestGroup
                    ) ||
                    new Set();

                try {
                    const data =
                        await updateFavoriteMember({
                            group:
                                requestGroup,
                            memberKey,
                            favorite
                        });

                    if (
                        getCurrentGroup() !==
                            requestGroup
                    ) {
                        return;
                    }

                    const nextFavoriteKeys =
                        new Set(
                            Array.isArray(
                                data.favoriteMemberKeys
                            )
                                ? data.favoriteMemberKeys.map(
                                    value => String(value)
                                )
                                : favorite
                                    ? [
                                        ...currentFavoriteKeys,
                                        memberKey
                                    ]
                                    : [
                                        ...currentFavoriteKeys
                                    ].filter(
                                        value =>
                                            value !== memberKey
                                    )
                        );

                    favoriteMemberMaps.set(
                        requestGroup,
                        nextFavoriteKeys
                    );

                    await render(
                        getDataRequestVersion(),
                        requestGroup
                    );

                } catch (
                    error
                ) {
                    console.error(
                        `推しメン更新失敗: ${memberName}`,
                        error
                    );
                }
            };

        const appendMember =
            member => {
                const iconData =
                    iconMap.get(
                        normalizeMemberName(
                            member.name
                        )
                    );

                memberIconTrack.appendChild(
                    createMemberIconButton({
                        memberKey:
                            member.key,
                        memberName:
                            member.name,
                        fileId:
                            iconData?.fileId ||
                            null,
                        imagePriority:
                            memberImageIndex < 10,
                        favorite:
                            favoriteMemberKeys.has(
                                member.key
                            ),
                        onFavoriteToggle:
                            handleFavoriteToggle
                    })
                );

                memberImageIndex += 1;
            };

        favoriteMembers.forEach(
            appendMember
        );

        {
            let previousGeneration =
                null;

            otherMembers.forEach(
                member => {
                    const generation =
                        Number.isInteger(
                            member.generation
                        )
                            ? member.generation
                            : null;

                    if (
                        generation !== null &&
                        generation !== previousGeneration
                    ) {
                        memberIconTrack.appendChild(
                            createMemberIconButton({
                                memberName:
                                    `${generation}期生`,
                                generation
                            })
                        );
                        previousGeneration =
                            generation;
                    }

                    appendMember(
                        member
                    );
                }
            );
        }

        updateSelection();
        resetScrollPosition();

        scheduleMemberIconMapWarmup(
            requestGroup
        );
    }

    return {
        render,
        updateSelection,
        isFavoriteOnlyMode: () => favoriteOnlyMode,
        getFavoriteMemberKeys: () =>
            new Set(
                favoriteMemberMaps.get(
                    getCurrentGroup()
                ) || []
            ),
        updateFadeState,
        resetScrollPosition
    };
}
