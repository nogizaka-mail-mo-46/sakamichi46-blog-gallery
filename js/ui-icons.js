/*
 * ========================================
 * 共通UIアイコン
 * ========================================
 */

const ICON_PATHS = {

    chevronDown:
        '<path d="m6 9 6 6 6-6"></path>',

    chevronUp:
        '<path d="m18 15-6-6-6 6"></path>',

    chevronLeft:
        '<path d="m15 18-6-6 6-6"></path>',

    chevronRight:
        '<path d="m9 18 6-6-6-6"></path>',

    chevronsLeft:
        '<path d="m11 17-5-5 5-5"></path>' +
        '<path d="m18 17-5-5 5-5"></path>',

    chevronsRight:
        '<path d="m13 17 5-5-5-5"></path>' +
        '<path d="m6 17 5-5-5-5"></path>',

    x:
        '<path d="M18 6 6 18"></path>' +
        '<path d="m6 6 12 12"></path>',

    arrowLeft:
        '<path d="m12 19-7-7 7-7"></path>' +
        '<path d="M19 12H5"></path>',

    arrowUp:
        '<path d="m18 15-6-6-6 6"></path>' +
        '<path d="M12 9v10"></path>',

    users:
        '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>' +
        '<circle cx="9" cy="7" r="4"></circle>' +
        '<path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>' +
        '<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',

    calendar:
        '<path d="M8 2v4"></path>' +
        '<path d="M16 2v4"></path>' +
        '<rect width="18" height="18" x="3" y="4" rx="2"></rect>' +
        '<path d="M3 10h18"></path>'
};


/*
 * ========================================
 * SVG生成
 * ========================================
 */

export function createUiIcon(
    name,
    {
        size = 20,
        strokeWidth = 2
    } = {}
) {

    const path =
        ICON_PATHS[
            name
        ];

    if (
        !path
    ) {
        throw new Error(
            `Unknown UI icon: ${name}`
        );
    }

    const wrapper =
        document.createElement(
            "span"
        );

    wrapper.className =
        "ui-icon";

    wrapper.setAttribute(
        "aria-hidden",
        "true"
    );

    wrapper.innerHTML =
        `
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="${size}"
                height="${size}"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="${strokeWidth}"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                ${path}
            </svg>
        `;

    return wrapper;
}
