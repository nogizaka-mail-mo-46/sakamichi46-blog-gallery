import {
    fetchBlogSearch
} from "./api.js";

import {
    createUiIcon
} from "./ui-icons.js";


/**
 * ブログ検索UI・検索条件・検索用カレンダーを管理する。
 * app.js 側の通常一覧状態は依存オブジェクト経由で参照・更新する。
 */
export function createBlogSearch({
    memberSelect,
    memberIconTrack,
    sortSelect,
    selectedDateTitle,
    galleryElement,
    calendar,
    lightbox,
    getCurrentGroup,
    getSelectedGeneration,
    getSelectedDate,
    setSelectedDate,
    getBlogs,
    setBlogs,
    getPostDates,
    getReadArticleIds,
    createDataRequestVersion,
    loadBlogsByDate,
    loadCurrentMonthBlogs,
    updateBlogs
}) {

    /*
     * ========================================
     * スマホ / タブレット縦 検索条件UI
     *
     * UIと条件保持のみ。
     * 実際のブログ検索処理は次工程で実装する。
     * ========================================
     */

    const openSearchFiltersButton =
        document.getElementById(
            "openSearchFiltersButton"
        );

    const searchFilterBackdrop =
        document.getElementById(
            "searchFilterBackdrop"
        );

    const searchFilterSheet =
        document.getElementById(
            "searchFilterSheet"
        );

    const closeSearchFiltersButton =
        document.getElementById(
            "closeSearchFiltersButton"
        );

    const searchStartDateButton =
        document.getElementById(
            "searchStartDateButton"
        );

    const desktopSearchStartDateButton = document.getElementById("desktopSearchStartDateButton");
    const desktopSearchEndDateButton = document.getElementById("desktopSearchEndDateButton");
    const desktopSearchStartDateValue = document.getElementById("desktopSearchStartDateValue");
    const desktopSearchEndDateValue = document.getElementById("desktopSearchEndDateValue");
    const desktopSearchMemberValue = document.getElementById("desktopSearchMemberValue");
    const desktopSearchKeywordInput = document.getElementById("desktopSearchKeywordInput");
    const desktopExecuteSearchButton = document.getElementById("desktopExecuteSearchButton");
    const desktopClearSearchButton = document.getElementById("desktopClearSearchButton");
    const searchReadStatusTabs = Array.from(
        document.querySelectorAll("[data-search-read-status-tabs] .search-read-status-tab")
    );

    const searchEndDateButton =
        document.getElementById(
            "searchEndDateButton"
        );

    const searchStartDateValue =
        document.getElementById(
            "searchStartDateValue"
        );

    const searchEndDateValue =
        document.getElementById(
            "searchEndDateValue"
        );

    const searchMemberValue =
        document.getElementById(
            "searchMemberValue"
        );

    const searchKeywordToggleButton =
        document.getElementById(
            "searchKeywordToggleButton"
        );

    const searchKeywordArea =
        document.getElementById(
            "searchKeywordArea"
        );

    const searchKeywordInput =
        document.getElementById(
            "searchKeywordInput"
        );

    const searchKeywordValue =
        document.getElementById(
            "searchKeywordValue"
        );

    const clearSearchFiltersButton =
        document.getElementById(
            "clearSearchFiltersButton"
        );

    const executeSearchButton =
        document.getElementById(
            "executeSearchButton"
        );

    const searchDatePickerBackdrop =
        document.getElementById(
            "searchDatePickerBackdrop"
        );

    const searchDatePicker =
        document.getElementById(
            "searchDatePicker"
        );

    const searchDatePickerTitle =
        document.getElementById(
            "searchDatePickerTitle"
        );

    const closeSearchDatePickerButton =
        document.getElementById(
            "closeSearchDatePickerButton"
        );

    const searchDateFirstMonth =
        document.getElementById(
            "searchDateFirstMonth"
        );

    const searchDatePrevMonth =
        document.getElementById(
            "searchDatePrevMonth"
        );

    const searchDateNextMonth =
        document.getElementById(
            "searchDateNextMonth"
        );

    const searchDateLastMonth =
        document.getElementById(
            "searchDateLastMonth"
        );

    const searchDateMonthTitle =
        document.getElementById(
            "searchDateMonthTitle"
        );

    const searchDateMonthPicker =
        document.getElementById(
            "searchDateMonthPicker"
        );

    const searchDateMonthPickerPrevYear =
        document.getElementById(
            "searchDateMonthPickerPrevYear"
        );

    const searchDateMonthPickerNextYear =
        document.getElementById(
            "searchDateMonthPickerNextYear"
        );

    const searchDateMonthPickerYear =
        document.getElementById(
            "searchDateMonthPickerYear"
        );

    const searchDateMonthPickerGrid =
        document.getElementById(
            "searchDateMonthPickerGrid"
        );

    const searchDateGrid =
        document.getElementById(
            "searchDateGrid"
        );

    const unsetSearchDateButton =
        document.getElementById(
            "unsetSearchDateButton"
        );

    const confirmSearchDateButton =
        document.getElementById(
            "confirmSearchDateButton"
        );


    let searchStartDate = null;
    let searchEndDate = null;
    let searchReadStatus = "all";
    let searchDateTarget = null;
    let searchDateDraft = null;
    let searchPickerYear = null;
    let searchPickerMonth = null;
    let searchMonthPickerYear = null;
    let isSearchMonthPickerOpen = false;

    /*
     * 検索実行前の通常一覧状態。
     * 「条件をクリア」で検索前の一覧へ戻すために保持する。
     */
    let isBlogSearchActive = false;
    let searchRestoreSelectedDate = null;


    function resetBlogSearchForGroupChange() {

        searchStartDate = null;
        searchEndDate = null;
        searchReadStatus = "all";
        searchDateTarget = null;
        searchDateDraft = null;
        searchPickerYear = null;
        searchPickerMonth = null;
        searchMonthPickerYear = null;
        isSearchMonthPickerOpen = false;

        isBlogSearchActive = false;
        searchRestoreSelectedDate = null;

        if (desktopSearchKeywordInput) {
            desktopSearchKeywordInput.value = "";
        }

        if (searchKeywordInput) {
            searchKeywordInput.value = "";
        }

        if (searchKeywordArea) {
            searchKeywordArea.hidden = true;
        }

        searchKeywordToggleButton?.setAttribute(
            "aria-expanded",
            "false"
        );

        setSearchFilterSheetOpen(false);
        setSearchDatePickerOpen(false);
        updateSearchFilterUi();
    }


    function formatSearchDate(
        date
    ) {
        if (!date) {
            return "未選択";
        }

        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        return `${year}/${month}/${day}`;
    }


    function getCurrentSearchMemberLabel() {
        if (
            getSelectedGeneration() !== null
        ) {
            return `${getSelectedGeneration()}期生`;
        }

        if (
            memberSelect.value
        ) {
            const option =
                memberSelect.options[
                    memberSelect.selectedIndex
                ];

            return option?.textContent?.trim() ||
                memberSelect.value;
        }

        return "ALL";
    }


    function updateSearchFilterUi() {
        if (
            searchStartDateValue
        ) {
            searchStartDateValue.textContent =
                formatSearchDate(
                    searchStartDate
                );

            searchStartDateValue.classList.toggle(
                "is-set",
                Boolean(searchStartDate)
            );
        }

        if (
            searchEndDateValue
        ) {
            searchEndDateValue.textContent =
                formatSearchDate(
                    searchEndDate
                );

            searchEndDateValue.classList.toggle(
                "is-set",
                Boolean(searchEndDate)
            );
        }

        if (
            searchMemberValue
        ) {
            searchMemberValue.textContent =
                getCurrentSearchMemberLabel();
        }

        const memberLabel = getCurrentSearchMemberLabel();
        if (desktopSearchMemberValue) desktopSearchMemberValue.textContent = memberLabel;
        if (desktopSearchStartDateValue) {
            desktopSearchStartDateValue.textContent = formatSearchDate(searchStartDate);
            desktopSearchStartDateValue.classList.toggle("is-set", Boolean(searchStartDate));
        }
        if (desktopSearchEndDateValue) {
            desktopSearchEndDateValue.textContent = formatSearchDate(searchEndDate);
            desktopSearchEndDateValue.classList.toggle("is-set", Boolean(searchEndDate));
        }

        if (
            searchKeywordValue &&
            searchKeywordInput
        ) {
            const keyword =
                searchKeywordInput.value.trim();

            searchKeywordValue.textContent =
                keyword || "未設定";

            searchKeywordValue.classList.toggle(
                "is-set",
                Boolean(keyword)
            );
        }

        searchReadStatusTabs.forEach(button => {
            const isActive = button.dataset.readStatus === searchReadStatus;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }


    function setSearchFilterSheetOpen(
        open
    ) {
        if (
            !searchFilterSheet ||
            !searchFilterBackdrop
        ) {
            return;
        }

        if (
            open
        ) {
            updateSearchFilterUi();

            searchFilterSheet.hidden = false;
            searchFilterBackdrop.hidden = false;
            document.body.classList.add(
                "search-filter-lock"
            );

            requestAnimationFrame(
                () => {
                    searchFilterSheet.classList.add(
                        "is-open"
                    );
                    searchFilterBackdrop.classList.add(
                        "is-open"
                    );
                }
            );

            return;
        }

        searchFilterSheet.classList.remove(
            "is-open"
        );
        searchFilterBackdrop.classList.remove(
            "is-open"
        );

        window.setTimeout(
            () => {
                searchFilterSheet.hidden = true;
                searchFilterBackdrop.hidden = true;
                document.body.classList.remove(
                    "search-filter-lock"
                );
            },
            240
        );
    }


    function positionSearchDatePickerForViewport() {
        if (!searchDatePicker) {
            return;
        }

        const isDesktopLayout =
            window.matchMedia("(min-width: 1024px)").matches;

        searchDatePicker.classList.toggle(
            "is-desktop-calendar-overlay",
            isDesktopLayout
        );

        if (!isDesktopLayout) {
            searchDatePicker.style.removeProperty(
                "--search-date-picker-left"
            );
            searchDatePicker.style.removeProperty(
                "--search-date-picker-top"
            );
            searchDatePicker.style.removeProperty(
                "--search-date-picker-width"
            );
            return;
        }

        const mainCalendar =
            document.getElementById("calendar");

        if (!mainCalendar) {
            return;
        }

        const rect =
            mainCalendar.getBoundingClientRect();

        // PC / タブレット横では、検索用カレンダーを
        // 左列の本体カレンダーの上に重ねて表示する。
        // 幅は日付操作に必要な広さを確保しつつ、
        // 本体カレンダーの中央を基準に配置する。
        const overlayWidth = Math.min(
            380,
            Math.max(320, window.innerWidth - 32)
        );
        const calendarCenter =
            rect.left + rect.width / 2;
        const halfWidth = overlayWidth / 2;
        const overlayCenter = Math.min(
            window.innerWidth - halfWidth - 16,
            Math.max(halfWidth + 16, calendarCenter)
        );

        searchDatePicker.style.setProperty(
            "--search-date-picker-left",
            `${Math.round(overlayCenter)}px`
        );
        searchDatePicker.style.setProperty(
            "--search-date-picker-top",
            `${Math.round(rect.top)}px`
        );
        searchDatePicker.style.setProperty(
            "--search-date-picker-width",
            `${Math.round(overlayWidth)}px`
        );
    }


    function updateSearchMonthPickerArrow() {
        if (
            !searchDatePicker ||
            !searchDateMonthPicker ||
            !searchDateMonthTitle ||
            searchDateMonthPicker.hidden
        ) {
            return;
        }

        requestAnimationFrame(
            () => {
                if (searchDateMonthPicker.hidden) {
                    return;
                }

                const pickerRect =
                    searchDateMonthPicker.getBoundingClientRect();
                const titleRect =
                    searchDateMonthTitle.getBoundingClientRect();
                const datePickerRect =
                    searchDatePicker.getBoundingClientRect();
                const titleCenter =
                    titleRect.left + titleRect.width / 2;
                const arrowLeft =
                    titleCenter - pickerRect.left;

                // 本体カレンダーと同じく、吹き出しの先端が
                // 年月ボタンの直下を指す高さにする。
                // 固定 top 値ではなく実際の年月ボタン位置から算出するため、
                // スマホ / タブレット / PC で同じ位置関係になる。
                const monthNav =
                    searchDateMonthTitle.closest(
                        ".search-date-picker-month-nav"
                    );
                const monthNavRect = monthNav
                    ? monthNav.getBoundingClientRect()
                    : titleRect;

                // 年月ジャンプの吹き出しは、年月ナビ行の直下に置く。
                // 三角の先端が「YYYY年M月」ボタンの高さを指すよう、
                // タイトル単体ではなくナビ行全体の下端を基準にする。
                // 本体カレンダーと同じく、年月ナビのすぐ下に
                // パネル上端を置く。::before の先端が年月ボタン下端を指す。
                const pickerTop =
                    monthNavRect.bottom - datePickerRect.top + 8;

                searchDateMonthPicker.style.setProperty(
                    "--search-month-arrow-left",
                    `${arrowLeft}px`
                );
                searchDateMonthPicker.style.setProperty(
                    "--search-month-picker-top",
                    `${Math.round(pickerTop)}px`
                );
            }
        );
    }


    function setSearchDatePickerOpen(
        open,
        target = null
    ) {
        if (
            !searchDatePicker ||
            !searchDatePickerBackdrop
        ) {
            return;
        }

        if (
            open
        ) {
            searchDateTarget = target;

            const currentValue =
                target === "end"
                    ? searchEndDate
                    : searchStartDate;

            // 日付未選択時は現在月を表示する。
            // 投稿がない月でも検索期間として指定できる。
            const baseDate =
                currentValue ||
                new Date();

            searchDateDraft =
                currentValue
                    ? new Date(
                        currentValue.getFullYear(),
                        currentValue.getMonth(),
                        currentValue.getDate()
                    )
                    : null;

            searchPickerYear =
                baseDate.getFullYear();
            searchPickerMonth =
                baseDate.getMonth();
            searchMonthPickerYear =
                searchPickerYear;
            isSearchMonthPickerOpen = false;

            searchDatePickerTitle.textContent =
                target === "end"
                    ? "終了日を選択"
                    : "開始日を選択";

            renderSearchDatePicker();
            positionSearchDatePickerForViewport();

            searchDatePicker.hidden = false;
            searchDatePickerBackdrop.hidden = false;

            requestAnimationFrame(
                () => {
                    searchDatePicker.classList.add(
                        "is-open"
                    );
                    searchDatePickerBackdrop.classList.add(
                        "is-open"
                    );
                }
            );

            return;
        }

        isSearchMonthPickerOpen = false;
        searchDateMonthPicker?.setAttribute(
            "hidden",
            ""
        );
        searchDateMonthTitle?.setAttribute(
            "aria-expanded",
            "false"
        );

        searchDatePicker.classList.remove(
            "is-open"
        );
        searchDatePickerBackdrop.classList.remove(
            "is-open"
        );

        window.setTimeout(
            () => {
                searchDatePicker.hidden = true;
                searchDatePickerBackdrop.hidden = true;
            },
            180
        );
    }


    function getSearchPostMonths() {
        const postMonths = Array.from(
            new Set(
                Array.from(getPostDates())
                    .filter((dateKey) => /^\d{8}$/.test(dateKey))
                    .map((dateKey) => dateKey.substring(0, 6))
            )
        ).sort();

        if (postMonths.length === 0) {
            return [];
        }

        /*
         * 検索カレンダーは「投稿日がある日を選ぶUI」ではなく、
         * 検索期間を指定するUI。
         * そのため投稿がない月も、最古投稿日から現在月までの
         * 連続した年月として選択・移動できるようにする。
         */
        const firstMonth = postMonths[0];
        const now = new Date();
        const currentMonth =
            String(now.getFullYear()) +
            String(now.getMonth() + 1).padStart(2, "0");
        const lastMonth =
            postMonths[postMonths.length - 1] > currentMonth
                ? postMonths[postMonths.length - 1]
                : currentMonth;

        let year = Number(firstMonth.substring(0, 4));
        let month = Number(firstMonth.substring(4, 6)) - 1;
        const lastYear = Number(lastMonth.substring(0, 4));
        const lastMonthIndex = Number(lastMonth.substring(4, 6)) - 1;
        const months = [];

        while (
            year < lastYear ||
            (year === lastYear && month <= lastMonthIndex)
        ) {
            months.push(
                String(year) +
                String(month + 1).padStart(2, "0")
            );

            month += 1;
            if (month > 11) {
                month = 0;
                year += 1;
            }
        }

        return months;
    }


    function getSearchPostYears() {
        return [
            ...new Set(
                getSearchPostMonths().map(
                    (monthKey) =>
                        Number(
                            monthKey.substring(0, 4)
                        )
                )
            )
        ].sort((a, b) => a - b);
    }


    function getSearchCurrentMonthKey() {
        return (
            String(searchPickerYear) +
            String(searchPickerMonth + 1).padStart(2, "0")
        );
    }


    function moveSearchPickerToMonthKey(monthKey) {
        if (!monthKey) {
            return;
        }

        searchPickerYear =
            Number(monthKey.substring(0, 4));
        searchPickerMonth =
            Number(monthKey.substring(4, 6)) - 1;
        searchMonthPickerYear =
            searchPickerYear;
        isSearchMonthPickerOpen = false;

        renderSearchDatePicker();
    }


    function jumpSearchPickerToEdge(position) {
        const months = getSearchPostMonths();

        if (months.length === 0) {
            return;
        }

        moveSearchPickerToMonthKey(
            position === "first"
                ? months[0]
                : months[months.length - 1]
        );
    }


    function changeSearchPickerPostMonth(amount) {
        const months = getSearchPostMonths();
        const index = months.indexOf(
            getSearchCurrentMonthKey()
        );

        if (index === -1) {
            return;
        }

        const nextIndex = index + amount;

        if (
            nextIndex < 0 ||
            nextIndex >= months.length
        ) {
            return;
        }

        moveSearchPickerToMonthKey(
            months[nextIndex]
        );
    }


    function toggleSearchMonthPicker() {
        isSearchMonthPickerOpen =
            !isSearchMonthPickerOpen;

        if (isSearchMonthPickerOpen) {
            searchMonthPickerYear =
                searchPickerYear;
        }

        renderSearchDatePicker();
    }


    function changeSearchMonthPickerYear(direction) {
        const years = getSearchPostYears();
        const index = years.indexOf(
            searchMonthPickerYear
        );

        if (index === -1) {
            return;
        }

        const nextIndex = index + direction;

        if (
            nextIndex < 0 ||
            nextIndex >= years.length
        ) {
            return;
        }

        searchMonthPickerYear =
            years[nextIndex];
        renderSearchMonthPicker();
        updateSearchMonthPickerArrow();
    }


    function renderSearchMonthPicker() {
        if (
            !searchDateMonthPicker ||
            !searchDateMonthPickerGrid ||
            !searchDateMonthPickerYear
        ) {
            return;
        }

        searchDateMonthPicker.hidden =
            !isSearchMonthPickerOpen;
        searchDateMonthTitle?.setAttribute(
            "aria-expanded",
            String(isSearchMonthPickerOpen)
        );

        if (!isSearchMonthPickerOpen) {
            return;
        }

        const months = getSearchPostMonths();
        const years = getSearchPostYears();

        searchDateMonthPickerYear.textContent =
            `${searchMonthPickerYear}年`;
        searchDateMonthPickerGrid.innerHTML = "";

        const yearIndex = years.indexOf(
            searchMonthPickerYear
        );

        if (searchDateMonthPickerPrevYear) {
            searchDateMonthPickerPrevYear.disabled =
                yearIndex <= 0;
        }

        if (searchDateMonthPickerNextYear) {
            searchDateMonthPickerNextYear.disabled =
                yearIndex === -1 ||
                yearIndex >= years.length - 1;
        }

        for (let month = 1; month <= 12; month += 1) {
            const monthKey =
                String(searchMonthPickerYear) +
                String(month).padStart(2, "0");
            const button =
                document.createElement("button");

            button.type = "button";
            button.className =
                "ui-text-button calendar-month-picker-month search-date-month-picker-month";
            button.textContent =
                `${month}月`;

            if (!months.includes(monthKey)) {
                button.disabled = true;
                button.classList.add("unavailable");
            }

            if (monthKey === getSearchCurrentMonthKey()) {
                button.classList.add("current");
            }

            button.addEventListener(
                "click",
                () => {
                    moveSearchPickerToMonthKey(
                        monthKey
                    );
                }
            );

            searchDateMonthPickerGrid.appendChild(
                button
            );
        }
    }


    function renderSearchDatePicker() {
        if (
            !searchDateGrid ||
            searchPickerYear === null ||
            searchPickerMonth === null
        ) {
            return;
        }

        searchDateMonthTitle.textContent =
            `${searchPickerYear}年${searchPickerMonth + 1}月`;

        const searchPostMonths =
            getSearchPostMonths();
        const currentMonthIndex =
            searchPostMonths.indexOf(
                getSearchCurrentMonthKey()
            );

        if (searchDateFirstMonth) {
            searchDateFirstMonth.disabled =
                currentMonthIndex <= 0;
        }
        if (searchDatePrevMonth) {
            searchDatePrevMonth.disabled =
                currentMonthIndex <= 0;
        }
        if (searchDateNextMonth) {
            searchDateNextMonth.disabled =
                currentMonthIndex === -1 ||
                currentMonthIndex >= searchPostMonths.length - 1;
        }
        if (searchDateLastMonth) {
            searchDateLastMonth.disabled =
                currentMonthIndex === -1 ||
                currentMonthIndex >= searchPostMonths.length - 1;
        }

        renderSearchMonthPicker();

        // 年月ジャンプを開いた直後にも、実際の年月ナビ行を基準に
        // ポップアップ位置を再計算する。
        // hidden解除後のレイアウト確定を待つため requestAnimationFrame 内で実行。
        if (isSearchMonthPickerOpen) {
            updateSearchMonthPickerArrow();
        }

        searchDateGrid.innerHTML = "";

        const firstDay =
            new Date(
                searchPickerYear,
                searchPickerMonth,
                1
            ).getDay();

        const daysInMonth =
            new Date(
                searchPickerYear,
                searchPickerMonth + 1,
                0
            ).getDate();

        for (
            let i = 0;
            i < firstDay;
            i += 1
        ) {
            const spacer =
                document.createElement("span");
            spacer.className =
                "search-date-day is-disabled";
            searchDateGrid.appendChild(
                spacer
            );
        }

        for (
            let day = 1;
            day <= daysInMonth;
            day += 1
        ) {
            const button =
                document.createElement("button");

            button.type = "button";
            button.className =
                "search-date-day";
            button.textContent =
                String(day);

            const date =
                new Date(
                    searchPickerYear,
                    searchPickerMonth,
                    day
                );

            if (
                searchDateDraft &&
                date.getFullYear() === searchDateDraft.getFullYear() &&
                date.getMonth() === searchDateDraft.getMonth() &&
                date.getDate() === searchDateDraft.getDate()
            ) {
                button.classList.add(
                    "is-selected"
                );
            }

            button.addEventListener(
                "click",
                () => {
                    searchDateDraft = date;
                    renderSearchDatePicker();
                }
            );

            searchDateGrid.appendChild(
                button
            );
        }

        /*
         * どの月も6週（42マス）固定にする。
         * 5週で収まる月にも空マスを補い、検索カレンダーの高さと
         * 月移動ナビの表示位置が月ごとに動かないようにする。
         */
        const renderedCellCount =
            firstDay + daysInMonth;

        for (
            let i = renderedCellCount;
            i < 42;
            i += 1
        ) {
            const spacer =
                document.createElement("span");
            spacer.className =
                "search-date-day is-disabled";
            searchDateGrid.appendChild(
                spacer
            );
        }
    }


    function changeSearchPickerMonth(
        amount
    ) {
        changeSearchPickerPostMonth(amount);
    }


    function installSearchDatePickerNavIcons() {
        const iconTargets = [
            [searchDateFirstMonth, "chevronsLeft", 18],
            [searchDatePrevMonth, "chevronLeft", 20],
            [searchDateNextMonth, "chevronRight", 20],
            [searchDateLastMonth, "chevronsRight", 18],
            [searchDateMonthPickerPrevYear, "chevronLeft", 20],
            [searchDateMonthPickerNextYear, "chevronRight", 20]
        ];

        iconTargets.forEach(
            ([button, iconName, size]) => {
                if (!button) {
                    return;
                }

                button.replaceChildren(
                    createUiIcon(
                        iconName,
                        { size }
                    )
                );
            }
        );
    }


    function installSearchFilterIcons() {
        document.querySelectorAll(
            '[data-search-icon="calendar"]'
        ).forEach(
            (element) => {
                element.replaceChildren(
                    createUiIcon(
                        "calendar",
                        { size: 20 }
                    )
                );
            }
        );

        document.querySelectorAll(
            '[data-search-icon="users"]'
        ).forEach(
            (element) => {
                element.replaceChildren(
                    createUiIcon(
                        "users",
                        { size: 20 }
                    )
                );
            }
        );
    }


    installSearchFilterIcons();
    installSearchDatePickerNavIcons();
    updateSearchFilterUi();


    openSearchFiltersButton?.addEventListener(
        "click",
        () => {
            setSearchFilterSheetOpen(true);
        }
    );

    closeSearchFiltersButton?.addEventListener(
        "click",
        () => {
            setSearchFilterSheetOpen(false);
        }
    );

    searchFilterBackdrop?.addEventListener(
        "click",
        () => {
            setSearchFilterSheetOpen(false);
        }
    );

    searchStartDateButton?.addEventListener(
        "click",
        () => {
            setSearchDatePickerOpen(
                true,
                "start"
            );
        }
    );

    desktopSearchStartDateButton?.addEventListener("click", () => setSearchDatePickerOpen(true, "start"));
    desktopSearchEndDateButton?.addEventListener("click", () => setSearchDatePickerOpen(true, "end"));

    searchEndDateButton?.addEventListener(
        "click",
        () => {
            setSearchDatePickerOpen(
                true,
                "end"
            );
        }
    );

    closeSearchDatePickerButton?.addEventListener(
        "click",
        () => {
            setSearchDatePickerOpen(false);
        }
    );

    searchDatePickerBackdrop?.addEventListener(
        "click",
        () => {
            setSearchDatePickerOpen(false);
        }
    );

    searchDateFirstMonth?.addEventListener(
        "click",
        () => {
            jumpSearchPickerToEdge("first");
        }
    );

    searchDatePrevMonth?.addEventListener(
        "click",
        () => {
            changeSearchPickerMonth(-1);
        }
    );

    searchDateMonthTitle?.addEventListener(
        "click",
        toggleSearchMonthPicker
    );

    window.addEventListener(
        "resize",
        () => {
            if (
                searchDatePicker &&
                !searchDatePicker.hidden
            ) {
                positionSearchDatePickerForViewport();
                updateSearchMonthPickerArrow();
            }
        }
    );

    searchDateNextMonth?.addEventListener(
        "click",
        () => {
            changeSearchPickerMonth(1);
        }
    );

    searchDateLastMonth?.addEventListener(
        "click",
        () => {
            jumpSearchPickerToEdge("last");
        }
    );

    searchDateMonthPickerPrevYear?.addEventListener(
        "click",
        () => {
            changeSearchMonthPickerYear(-1);
        }
    );

    searchDateMonthPickerNextYear?.addEventListener(
        "click",
        () => {
            changeSearchMonthPickerYear(1);
        }
    );

    unsetSearchDateButton?.addEventListener(
        "click",
        () => {
            searchDateDraft = null;

            if (
                searchDateTarget === "end"
            ) {
                searchEndDate = null;
            } else {
                searchStartDate = null;
            }

            updateSearchFilterUi();
            setSearchDatePickerOpen(false);
        }
    );

    confirmSearchDateButton?.addEventListener(
        "click",
        () => {
            if (
                searchDateTarget === "end"
            ) {
                searchEndDate =
                    searchDateDraft;
            } else {
                searchStartDate =
                    searchDateDraft;
            }

            updateSearchFilterUi();
            setSearchDatePickerOpen(false);
        }
    );

    searchKeywordToggleButton?.addEventListener(
        "click",
        () => {
            const willOpen =
                searchKeywordArea.hidden;

            searchKeywordArea.hidden =
                !willOpen;

            searchKeywordToggleButton.setAttribute(
                "aria-expanded",
                String(willOpen)
            );

            if (
                willOpen
            ) {
                window.setTimeout(
                    () => {
                        searchKeywordInput?.focus();
                    },
                    0
                );
            }
        }
    );

    searchKeywordInput?.addEventListener(
        "input",
        updateSearchFilterUi
    );

    /*
     * ========================================
     * キーワード入力欄 Enter / 決定で検索実行
     *
     * 日本語IMEの変換確定Enterでは検索しない。
     * ========================================
     */
    searchKeywordInput?.addEventListener(
        "keydown",
        async event => {
            if (
                event.key !== "Enter" ||
                event.isComposing ||
                event.keyCode === 229
            ) {
                return;
            }

            event.preventDefault();

            await executeBlogSearch({
                keywordSource: "mobile"
            });
        }
    );

    clearSearchFiltersButton?.addEventListener(
        "click",
        async () => {
            await clearBlogSearch({
                closeMobileSheet: true
            });
        }
    );

    desktopSearchKeywordInput?.addEventListener("input", () => {
        if (searchKeywordInput) searchKeywordInput.value = desktopSearchKeywordInput.value;
        updateSearchFilterUi();
    });

    desktopSearchKeywordInput?.addEventListener(
        "keydown",
        async event => {
            if (
                event.key !== "Enter" ||
                event.isComposing ||
                event.keyCode === 229
            ) {
                return;
            }

            event.preventDefault();

            await executeBlogSearch({
                keywordSource: "desktop"
            });
        }
    );

    searchReadStatusTabs.forEach(button => {
        button.addEventListener("click", () => {
            const nextStatus = button.dataset.readStatus;
            if (!["all", "unread", "read"].includes(nextStatus)) {
                return;
            }
            searchReadStatus = nextStatus;
            updateSearchFilterUi();
        });
    });

    desktopClearSearchButton?.addEventListener("click", async () => {
        await clearBlogSearch();
    });

    /*
     * ========================================
     * 検索条件クリア / 通常一覧へ復帰
     * ========================================
     */

    async function clearBlogSearch({
        closeMobileSheet = false
    } = {}) {
        searchStartDate = null;
        searchEndDate = null;
        searchReadStatus = "all";

        if (desktopSearchKeywordInput) {
            desktopSearchKeywordInput.value = "";
        }

        if (searchKeywordInput) {
            searchKeywordInput.value = "";
        }

        if (searchKeywordArea) {
            searchKeywordArea.hidden = true;
        }

        searchKeywordToggleButton?.setAttribute(
            "aria-expanded",
            "false"
        );

        updateSearchFilterUi();

        if (closeMobileSheet) {
            setSearchFilterSheetOpen(false);
        }

        if (!isBlogSearchActive) {
            return;
        }

        const requestVersion =
            createDataRequestVersion();

        setSelectedDate(
            searchRestoreSelectedDate
        );

        isBlogSearchActive = false;
        searchRestoreSelectedDate = null;

        calendar.updateSelectedDateTitle();
        calendar.render();

        if (getSelectedDate()) {
            await loadBlogsByDate(
                getSelectedDate(),
                requestVersion
            );
        } else {
            await loadCurrentMonthBlogs(
                requestVersion
            );
        }
    }


    function createSearchApiDate(date) {
        if (!date) {
            return null;
        }

        return (
            String(date.getFullYear()) +
            String(date.getMonth() + 1).padStart(2, "0") +
            String(date.getDate()).padStart(2, "0")
        );
    }


    async function executeBlogSearch({
        keywordSource = "mobile"
    } = {}) {
        const requestGroup = getCurrentGroup();
        const requestMember = memberSelect.value || null;

        if (!isBlogSearchActive) {
            searchRestoreSelectedDate = getSelectedDate();
        }

        if (
            searchStartDate &&
            searchEndDate &&
            searchStartDate.getTime() > searchEndDate.getTime()
        ) {
            galleryElement.textContent =
                "開始日は終了日以前の日付を指定してください。";
            return;
        }

        let keyword = "";

        if (keywordSource === "desktop") {
            keyword = desktopSearchKeywordInput?.value.trim() || "";
            if (searchKeywordInput) {
                searchKeywordInput.value = keyword;
            }
        } else {
            keyword = searchKeywordInput?.value.trim() || "";
            if (desktopSearchKeywordInput) {
                desktopSearchKeywordInput.value = keyword;
            }
        }

        updateSearchFilterUi();

        /*
         * スマホ／タブレット縦向きでは、検索実行と同時に
         * 検索条件シートを閉じて検索結果の一覧へ戻す。
         * PCの検索条件欄には影響させない。
         */
        if (keywordSource === "mobile") {
            setSearchFilterSheetOpen(false);
        }

        galleryElement.textContent = "検索中...";

        try {
            const data = await fetchBlogSearch({
                group: requestGroup,
                member: requestMember,
                generation: getSelectedGeneration(),
                startDate: createSearchApiDate(searchStartDate),
                endDate: createSearchApiDate(searchEndDate),
                keyword: keyword || null,
                sort: sortSelect.value
            });

            if (
                getCurrentGroup() !== requestGroup ||
                (memberSelect.value || null) !== requestMember
            ) {
                return;
            }

            isBlogSearchActive = true;

            let searchBlogs = Array.isArray(data.blogs) ? data.blogs : [];

            if (searchReadStatus !== "all") {
                const readArticleIdSet = new Set(
                    (getReadArticleIds?.() || []).map(value => String(value))
                );

                searchBlogs = searchBlogs.filter(blog => {
                    const articleId = String(blog.articleId ?? blog.id ?? "");
                    const isRead = readArticleIdSet.has(articleId);
                    return searchReadStatus === "read" ? isRead : !isRead;
                });
            }

            setBlogs(searchBlogs);
            setSelectedDate(null);

            /*
             * 検索結果表示中は、通常一覧の「YYYY年M月のブログ」ではなく
             * 検索中であることが分かる見出しへ切り替える。
             * 通常一覧へ戻った場合は calendar.updateSelectedDateTitle() により
             * 元の年月 / 日付見出しへ戻る。
             */
            selectedDateTitle.textContent =
                `検索結果 ${getBlogs().length}件`;

            selectedDateTitle.classList.add(
                "visible"
            );

            updateBlogs();

            if (getBlogs().length === 0) {
                galleryElement.textContent = "検索条件に一致するブログはありません。";
                lightbox.setImages([]);
            }

        } catch (error) {
            console.error(error);
            setBlogs([]);
            lightbox.setImages([]);
            galleryElement.textContent =
                error?.message || "ブログ検索に失敗しました。";
        }
    }


    desktopExecuteSearchButton?.addEventListener("click", async () => {
        await executeBlogSearch({
            keywordSource: "desktop"
        });
    });

    executeSearchButton?.addEventListener(
        "click",
        async () => {
            await executeBlogSearch({
                keywordSource: "mobile"
            });
        }
    );

    /*
     * メンバー選択が変わった後に検索条件表示も追従させる。
     */
    memberSelect.addEventListener(
        "change",
        updateSearchFilterUi
    );

    memberIconTrack?.addEventListener(
        "click",
        () => {
            requestAnimationFrame(
                updateSearchFilterUi
            );
        }
    );

    return {
        resetForGroupChange: resetBlogSearchForGroupChange
    };
}
