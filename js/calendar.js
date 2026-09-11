import {
    createUiIcon
} from "./ui-icons.js";


/*
 * ========================================
 * カレンダー
 * ========================================
 */

export function createCalendar({
    element,
    selectedDateTitle,
    getPostDates,
    getCalendarYear,
    getCalendarMonth,
    getSelectedDate,
    isMemberSelected,
    onDateSelect,
    onMonthChange,
    onClearDate
}) {


    /*
     * ========================================
     * 年月選択パネル状態
     * ========================================
     */

    let monthPickerYear =
        null;

    let isMonthPickerOpen =
        false;


    /*
     * ========================================
     * スマホ用カレンダー開閉状態
     *
     * 初期状態:
     * - スマホでは折りたたみ
     * - PC / タブレットではCSS上常時表示
     * ========================================
     */

    let isMobileCalendarExpanded =
        false;


    /*
     * ========================================
     * 選択日タイトル
     * ========================================
     */

    function updateSelectedDateTitle() {
        const selectedDate =
            getSelectedDate();


        /*
         * 日付選択中
         */

        if (
            selectedDate
        ) {
            const year =
                Number(
                    selectedDate.substring(
                        0,
                        4
                    )
                );

            const month =
                Number(
                    selectedDate.substring(
                        4,
                        6
                    )
                );

            const day =
                Number(
                    selectedDate.substring(
                        6,
                        8
                    )
                );

            selectedDateTitle.textContent =
                `${year}年${month}月${day}日のブログ`;

            selectedDateTitle.classList.add(
                "visible"
            );

            return;
        }


        /*
         * 日付未選択
         * → 表示中の月
         */

        const calendarYear =
            getCalendarYear();

        const calendarMonth =
            getCalendarMonth();

        if (
            calendarYear ===
                null ||
            calendarMonth ===
                null
        ) {
            selectedDateTitle.textContent =
                "";

            selectedDateTitle.classList.remove(
                "visible"
            );

            return;
        }

        selectedDateTitle.textContent =
            `${calendarYear}年${calendarMonth}月のブログ`;

        selectedDateTitle.classList.add(
            "visible"
        );
    }


    /*
     * ========================================
     * 投稿日が存在する月
     * ========================================
     */

    function getPostMonths() {
        const postMonths =
            new Set();

        const postDates =
            getPostDates();

        postDates.forEach(
            (dateKey) => {
                if (
                    /^\d{8}$/.test(
                        dateKey
                    )
                ) {
                    postMonths.add(
                        dateKey.substring(
                            0,
                            6
                        )
                    );
                }
            }
        );

        return Array.from(
            postMonths
        ).sort();
    }


    /*
     * ========================================
     * 投稿日が存在する年
     * ========================================
     */

    function getPostYears() {
        const postMonths =
            getPostMonths();

        const years =
            [
                ...new Set(
                    postMonths.map(
                        (monthKey) =>
                            Number(
                                monthKey.substring(
                                    0,
                                    4
                                )
                            )
                    )
                )
            ];

        years.sort(
            (
                a,
                b
            ) =>
                a - b
        );

        return years;
    }


    /*
     * ========================================
     * 指定年月に投稿が存在するか
     * ========================================
     */

    function hasPostsInMonth(
        year,
        month
    ) {
        const monthKey =
            String(
                year
            ) +
            String(
                month
            ).padStart(
                2,
                "0"
            );

        return getPostMonths().includes(
            monthKey
        );
    }


    /*
     * ========================================
     * 日付キー生成
     * ========================================
     */

    function formatDateKey(
        year,
        month,
        day
    ) {
        return (
            String(year) +
            String(month).padStart(
                2,
                "0"
            ) +
            String(day).padStart(
                2,
                "0"
            )
        );
    }


    /*
     * ========================================
     * 投稿月へ移動
     * ========================================
     */

    function changeMonth(
        offset
    ) {
        const calendarYear =
            getCalendarYear();

        const calendarMonth =
            getCalendarMonth();

        const postMonths =
            getPostMonths();

        if (
            postMonths.length ===
                0
        ) {
            return;
        }

        const currentMonth =
            String(
                calendarYear
            ) +
            String(
                calendarMonth
            ).padStart(
                2,
                "0"
            );

        const currentIndex =
            postMonths.indexOf(
                currentMonth
            );

        if (
            currentIndex ===
                -1
        ) {
            return;
        }

        const nextIndex =
            currentIndex +
            offset;

        if (
            nextIndex <
                0 ||
            nextIndex >=
                postMonths.length
        ) {
            return;
        }

        const nextMonth =
            postMonths[
                nextIndex
            ];

        const nextYear =
            Number(
                nextMonth.substring(
                    0,
                    4
                )
            );

        const nextMonthNumber =
            Number(
                nextMonth.substring(
                    4,
                    6
                )
            );

        isMonthPickerOpen =
            false;

        onMonthChange(
            nextYear,
            nextMonthNumber
        );
    }


    /*
     * ========================================
     * 最古 / 最新の投稿月へ移動
     * ========================================
     */

    function jumpToEdgeMonth(
        position
    ) {
        const postMonths =
            getPostMonths();

        if (
            postMonths.length ===
                0
        ) {
            return;
        }

        let targetMonth;

        if (
            position ===
                "first"
        ) {
            targetMonth =
                postMonths[
                    0
                ];

        } else if (
            position ===
                "last"
        ) {
            targetMonth =
                postMonths[
                    postMonths.length - 1
                ];

        } else {
            return;
        }

        const targetYear =
            Number(
                targetMonth.substring(
                    0,
                    4
                )
            );

        const targetMonthNumber =
            Number(
                targetMonth.substring(
                    4,
                    6
                )
            );

        isMonthPickerOpen =
            false;

        onMonthChange(
            targetYear,
            targetMonthNumber
        );
    }


    /*
     * ========================================
     * 年月選択パネルを開閉
     * ========================================
     */

    function toggleMonthPicker() {
        isMonthPickerOpen =
            !isMonthPickerOpen;

        if (
            isMonthPickerOpen
        ) {
            monthPickerYear =
                getCalendarYear();
        }

        render();
    }


    /*
     * ========================================
     * 年月選択パネルの年を移動
     *
     * 投稿が存在する年だけを移動
     * ========================================
     */

    function changeMonthPickerYear(
        direction
    ) {
        const years =
            getPostYears();

        if (
            years.length ===
                0
        ) {
            return;
        }

        const currentIndex =
            years.indexOf(
                monthPickerYear
            );

        if (
            currentIndex ===
                -1
        ) {
            return;
        }

        const nextIndex =
            currentIndex +
            direction;

        if (
            nextIndex <
                0 ||
            nextIndex >=
                years.length
        ) {
            return;
        }

        monthPickerYear =
            years[
                nextIndex
            ];

        render();
    }


    /*
     * ========================================
     * 年月選択パネルから月を選択
     * ========================================
     */

    function selectMonthFromPicker(
        year,
        month
    ) {
        if (
            !hasPostsInMonth(
                year,
                month
            )
        ) {
            return;
        }

        isMonthPickerOpen =
            false;

        onMonthChange(
            year,
            month
        );
    }


    /*
     * ========================================
     * カレンダー描画
     * ========================================
     */

    function render() {
        element.innerHTML =
            "";

        element.classList.toggle(
            "mobile-collapsed",
            !isMobileCalendarExpanded
        );

        const calendarYear =
            getCalendarYear();

        const calendarMonth =
            getCalendarMonth();

        const selectedDate =
            getSelectedDate();

        if (
            calendarYear ===
                null ||
            calendarMonth ===
                null
        ) {
            return;
        }

        const postDates =
            getPostDates();

        const postMonths =
            getPostMonths();

        const currentMonthKey =
            String(
                calendarYear
            ) +
            String(
                calendarMonth
            ).padStart(
                2,
                "0"
            );

        const currentMonthIndex =
            postMonths.indexOf(
                currentMonthKey
            );


        /*
         * ========================================
         * ヘッダー
         * ========================================
         */

        const header =
            document.createElement(
                "div"
            );

        header.className =
            "calendar-header";


        /*
         * ========================================
         * 一番古い投稿月へ
         * ========================================
         */

        const firstButton =
            document.createElement(
                "button"
            );

        firstButton.type =
            "button";

        firstButton.className =
            "calendar-nav calendar-nav-edge";

        firstButton.textContent =
            "≪";

        firstButton.setAttribute(
            "aria-label",
            "一番古い投稿月へ"
        );

        firstButton.title =
            "一番古い投稿月へ";

        firstButton.addEventListener(
            "click",
            () => {
                jumpToEdgeMonth(
                    "first"
                );
            }
        );

        if (
            currentMonthIndex <=
                0
        ) {
            firstButton.disabled =
                true;
        }


        /*
         * ========================================
         * 前の投稿月
         * ========================================
         */

        const prevButton =
            document.createElement(
                "button"
            );

        prevButton.type =
            "button";

        prevButton.className =
            "calendar-nav";

        prevButton.textContent =
            "‹";

        prevButton.setAttribute(
            "aria-label",
            "前の投稿月へ"
        );

        prevButton.title =
            "前の投稿月へ";

        prevButton.addEventListener(
            "click",
            () => {
                changeMonth(
                    -1
                );
            }
        );

        if (
            currentMonthIndex <=
                0
        ) {
            prevButton.disabled =
                true;
        }


        /*
         * ========================================
         * 年月タイトル
         * ========================================
         */

        const title =
            document.createElement(
                "button"
            );

        title.type =
            "button";

        title.className =
            "calendar-title calendar-title-button";

        title.textContent =
            `${calendarYear}年${calendarMonth}月`;

        title.setAttribute(
            "aria-label",
            `${calendarYear}年${calendarMonth}月。年月を選択`
        );

        title.setAttribute(
            "aria-expanded",
            isMonthPickerOpen
                ? "true"
                : "false"
        );

        title.addEventListener(
            "click",
            () => {
                toggleMonthPicker();
            }
        );


        /*
         * ========================================
         * 次の投稿月
         * ========================================
         */

        const nextButton =
            document.createElement(
                "button"
            );

        nextButton.type =
            "button";

        nextButton.className =
            "calendar-nav";

        nextButton.textContent =
            "›";

        nextButton.setAttribute(
            "aria-label",
            "次の投稿月へ"
        );

        nextButton.title =
            "次の投稿月へ";

        nextButton.addEventListener(
            "click",
            () => {
                changeMonth(
                    1
                );
            }
        );

        if (
            currentMonthIndex ===
                -1 ||
            currentMonthIndex >=
                postMonths.length - 1
        ) {
            nextButton.disabled =
                true;
        }


        /*
         * ========================================
         * 一番新しい投稿月へ
         * ========================================
         */

        const lastButton =
            document.createElement(
                "button"
            );

        lastButton.type =
            "button";

        lastButton.className =
            "calendar-nav calendar-nav-edge";

        lastButton.textContent =
            "≫";

        lastButton.setAttribute(
            "aria-label",
            "一番新しい投稿月へ"
        );

        lastButton.title =
            "一番新しい投稿月へ";

        lastButton.addEventListener(
            "click",
            () => {
                jumpToEdgeMonth(
                    "last"
                );
            }
        );

        if (
            currentMonthIndex ===
                -1 ||
            currentMonthIndex >=
                postMonths.length - 1
        ) {
            lastButton.disabled =
                true;
        }


        /*
         * ========================================
         * ヘッダーへ追加
         * ========================================
         */

        header.appendChild(
            firstButton
        );

        header.appendChild(
            prevButton
        );

        header.appendChild(
            title
        );

        header.appendChild(
            nextButton
        );

        header.appendChild(
            lastButton
        );


        /*
         * ========================================
         * スマホ用カレンダー開閉
         * ========================================
         */

        const mobileToggleButton =
            document.createElement(
                "button"
            );

        mobileToggleButton.type =
            "button";

        mobileToggleButton.className =
            "calendar-mobile-toggle";

        mobileToggleButton.appendChild(
            createUiIcon(
                isMobileCalendarExpanded
                    ? "chevronUp"
                    : "chevronDown",
                {
                    size: 20
                }
            )
        );

        mobileToggleButton.setAttribute(
            "aria-label",
            isMobileCalendarExpanded
                ? "カレンダーを閉じる"
                : "カレンダーを開く"
        );

        mobileToggleButton.setAttribute(
            "aria-expanded",
            isMobileCalendarExpanded
                ? "true"
                : "false"
        );

        mobileToggleButton.addEventListener(
            "click",
            () => {
                isMobileCalendarExpanded =
                    !isMobileCalendarExpanded;

                render();
            }
        );

        header.appendChild(
            mobileToggleButton
        );

        element.appendChild(
            header
        );


        /*
         * ========================================
         * 年月選択パネル
         * ========================================
         */

        if (
            isMonthPickerOpen
        ) {
            const picker =
                document.createElement(
                    "div"
                );

            picker.className =
                "calendar-month-picker";


            /*
             * ====================================
             * 年ヘッダー
             * ====================================
             */

            const pickerHeader =
                document.createElement(
                    "div"
                );

            pickerHeader.className =
                "calendar-month-picker-header";


            /*
             * ====================================
             * 前の年
             * ====================================
             */

            const pickerPrevYear =
                document.createElement(
                    "button"
                );

            pickerPrevYear.type =
                "button";

            pickerPrevYear.className =
                "calendar-month-picker-nav";

            pickerPrevYear.textContent =
                "‹";

            pickerPrevYear.setAttribute(
                "aria-label",
                "前の投稿が存在する年へ"
            );


            /*
             * ====================================
             * 年タイトル
             * ====================================
             */

            const pickerYearTitle =
                document.createElement(
                    "div"
                );

            pickerYearTitle.className =
                "calendar-month-picker-year";

            pickerYearTitle.textContent =
                `${monthPickerYear}年`;


            /*
             * ====================================
             * 次の年
             * ====================================
             */

            const pickerNextYear =
                document.createElement(
                    "button"
                );

            pickerNextYear.type =
                "button";

            pickerNextYear.className =
                "calendar-month-picker-nav";

            pickerNextYear.textContent =
                "›";

            pickerNextYear.setAttribute(
                "aria-label",
                "次の投稿が存在する年へ"
            );


            /*
             * ====================================
             * 年移動可否
             * ====================================
             */

            const postYears =
                getPostYears();

            const pickerYearIndex =
                postYears.indexOf(
                    monthPickerYear
                );

            if (
                pickerYearIndex <=
                    0
            ) {
                pickerPrevYear.disabled =
                    true;
            }

            if (
                pickerYearIndex ===
                    -1 ||
                pickerYearIndex >=
                    postYears.length - 1
            ) {
                pickerNextYear.disabled =
                    true;
            }

            pickerPrevYear.addEventListener(
                "click",
                () => {
                    changeMonthPickerYear(
                        -1
                    );
                }
            );

            pickerNextYear.addEventListener(
                "click",
                () => {
                    changeMonthPickerYear(
                        1
                    );
                }
            );

            pickerHeader.appendChild(
                pickerPrevYear
            );

            pickerHeader.appendChild(
                pickerYearTitle
            );

            pickerHeader.appendChild(
                pickerNextYear
            );

            picker.appendChild(
                pickerHeader
            );


            /*
             * ====================================
             * 12か月
             * ====================================
             */

            const monthGrid =
                document.createElement(
                    "div"
                );

            monthGrid.className =
                "calendar-month-picker-grid";

            for (
                let month =
                    1;
                month <=
                    12;
                month++
            ) {
                const monthButton =
                    document.createElement(
                        "button"
                    );

                monthButton.type =
                    "button";

                monthButton.className =
                    "calendar-month-picker-month";

                monthButton.textContent =
                    `${month}月`;


                /*
                 * =================================
                 * 投稿有無
                 * =================================
                 */

                const available =
                    hasPostsInMonth(
                        monthPickerYear,
                        month
                    );

                if (
                    !available
                ) {
                    monthButton.disabled =
                        true;

                    monthButton.classList.add(
                        "unavailable"
                    );
                }


                /*
                 * =================================
                 * 現在表示中の月
                 * =================================
                 */

                if (
                    monthPickerYear ===
                        calendarYear &&
                    month ===
                        calendarMonth
                ) {
                    monthButton.classList.add(
                        "current"
                    );
                }


                /*
                 * =================================
                 * 月選択
                 * =================================
                 */

                monthButton.addEventListener(
                    "click",
                    () => {
                        selectMonthFromPicker(
                            monthPickerYear,
                            month
                        );
                    }
                );

                monthGrid.appendChild(
                    monthButton
                );
            }

            picker.appendChild(
                monthGrid
            );

            element.appendChild(
                picker
            );
        }


        /*
         * ========================================
         * 曜日
         * ========================================
         */

        const weekdayRow =
            document.createElement(
                "div"
            );

        weekdayRow.className =
            "calendar-weekdays";

        [
            "日",
            "月",
            "火",
            "水",
            "木",
            "金",
            "土"
        ].forEach(
            (weekday) => {
                const item =
                    document.createElement(
                        "div"
                    );

                item.textContent =
                    weekday;

                weekdayRow.appendChild(
                    item
                );
            }
        );

        element.appendChild(
            weekdayRow
        );


        /*
         * ========================================
         * 日付
         * ========================================
         */

        const days =
            document.createElement(
                "div"
            );

        days.className =
            "calendar-days";

        const firstDay =
            new Date(
                calendarYear,
                calendarMonth - 1,
                1
            ).getDay();

        const lastDate =
            new Date(
                calendarYear,
                calendarMonth,
                0
            ).getDate();


        /*
         * 月初までの空白
         */

        for (
            let i = 0;
            i < firstDay;
            i++
        ) {
            const empty =
                document.createElement(
                    "div"
                );

            empty.className =
                "calendar-day empty";

            days.appendChild(
                empty
            );
        }


        /*
         * 1日〜月末
         */

        for (
            let day = 1;
            day <= lastDate;
            day++
        ) {
            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "calendar-day";

            button.textContent =
                day;

            const dateKey =
                formatDateKey(
                    calendarYear,
                    calendarMonth,
                    day
                );


            /*
             * 投稿日
             */

            if (
                postDates.has(
                    dateKey
                )
            ) {
                button.classList.add(
                    "has-post"
                );


                /*
                 * メンバー未選択時も
                 * 投稿日はクリック可能
                 */

                button.addEventListener(
                    "click",
                    async () => {
                        await onDateSelect(
                            dateKey
                        );
                    }
                );


                /*
                 * 全メンバー投稿日
                 */

                if (
                    !isMemberSelected()
                ) {
                    button.classList.add(
                        "all-members-post"
                    );
                }

            } else {
                button.disabled =
                    true;
            }


            /*
             * 選択中の日
             */

            if (
                selectedDate ===
                    dateKey
            ) {
                button.classList.add(
                    "selected"
                );
            }

            days.appendChild(
                button
            );
        }

        element.appendChild(
            days
        );


        /*
         * ========================================
         * 日付絞り込み解除
         * ========================================
         */

        if (
            selectedDate
        ) {
            const clearButton =
                document.createElement(
                    "button"
                );

            clearButton.type =
                "button";

            clearButton.className =
                "calendar-clear";

            clearButton.textContent =
                "この月をすべて表示";

            clearButton.addEventListener(
                "click",
                () => {
                    onClearDate();
                }
            );

            element.appendChild(
                clearButton
            );
        }
    }


    /*
     * ========================================
     * 公開メソッド
     * ========================================
     */

    return {
        render:
            render,

        updateSelectedDateTitle:
            updateSelectedDateTitle
    };
}
