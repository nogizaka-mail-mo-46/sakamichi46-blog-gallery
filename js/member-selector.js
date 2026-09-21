import {
    getImageUrl
} from "./image-url.js";

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
    onGenerationChange
}) {

    const memberIconMaps =
        new Map();

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
            const response =
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
                !response.ok
            ) {
                throw new Error(
                    `メンバーアイコン一覧の取得に失敗しました: ` +
                    `${response.status}`
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

            memberIconMaps.set(
                group,
                iconMap
            );
        }

        return iconMap;
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

                let selected =
                    false;

                if (
                    buttonGeneration !==
                        null
                ) {
                    selected =
                        !selectedMemberKey &&
                        selectedGeneration ===
                            buttonGeneration;
                } else {
                    selected =
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
        imagePriority = false
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

        const name =
            document.createElement(
                "span"
            );
        name.className =
            "member-icon-name";
        name.textContent =
            isAll
                ? "全員"
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
                const selectedGeneration =
                    getSelectedGeneration();

                if (
                    generation !== null
                ) {
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

        let previousGeneration =
            null;

        let memberImageIndex =
            0;

        getMembers().forEach(
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
                            memberImageIndex < 10
                    })
                );

                memberImageIndex += 1;
            }
        );

        updateSelection();
        requestAnimationFrame(
            updateFadeState
        );
    }

    return {
        render,
        updateSelection,
        updateFadeState
    };
}
