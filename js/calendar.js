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
     * 選択日タイトル
     * ========================================
     */

    function updateSelectedDateTitle() {
        const selectedDate =
            getSelectedDate();

        if (!selectedDate) {
            selectedDateTitle.textContent =
                "";

            selectedDateTitle.classList.remove(
                "visible"
            );

            return;
        }

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
            nextIndex < 0 ||
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

        onMonthChange(
            nextYear,
            nextMonthNumber
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
         * 前の投稿月
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
         * 年月タイトル
         */

        const title =
            document.createElement(
                "div"
            );

        title.className =
            "calendar-title";

        title.textContent =
            `${calendarYear}年${calendarMonth}月`;


        /*
         * 次の投稿月
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


        header.appendChild(
            prevButton
        );

        header.appendChild(
            title
        );

        header.appendChild(
            nextButton
        );

        element.appendChild(
            header
        );


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
                 * メンバー選択中のみ
                 * 日付クリック可能
                 */

                if (
                    isMemberSelected()
                ) {
                    button.addEventListener(
                        "click",
                        () => {
                            onDateSelect(
                                dateKey
                            );
                        }
                    );
                } else {
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
            selectedDate &&
            isMemberSelected()
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
                "すべて表示";

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
