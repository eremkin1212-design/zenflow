"""Две правки:

1. Главная. Кнопки «Новая запись» и «+» открывают форму на том дне,
   который сейчас выбран, а не на сегодняшнем.

2. Календарь. Если в выходной день есть запись, она видна — сетка
   строится по времени самой записи, а не разворачивается на весь день.

Запуск из корня проекта:  python3 patch-day-fixes.py
Повторный запуск безопасен.
"""

import io
import os
import sys

DASH = os.path.join("src", "screens", "Dashboard.jsx")
CAL = os.path.join("src", "screens", "Calendar.jsx")

# ── Главная: передаём выбранную дату ────────────────────────────────────

DASH_STEPS = [
    (
        "ссылка «Новая запись»",
        'to="/appointment/new"',
        "to={`/appointment/new?date=${fmtDate(date)}`}",
    ),
    (
        "кнопка «плюс»",
        'to="/appointment/new"',
        "to={`/appointment/new?date=${fmtDate(date)}`}",
    ),
]

# ── Календарь: запись в выходной ────────────────────────────────────────

CAL_EARLIEST_OLD = (
    "const earliest = dayAppts.length ? Math.min(dayStart, "
    "...dayAppts.map((a) => minutes(a.start_time))) : dayStart;"
)
CAL_EARLIEST_NEW = (
    "// В выходной день границы сетки задают сами записи, иначе день\n"
    "// развернулся бы на весь график по умолчанию.\n"
    "const apptStarts = dayAppts.map((a) => minutes(a.start_time));\n"
    "const apptEnds = dayAppts.map((a) => minutes(a.start_time) + Number(a.duration || 0));\n"
    "const earliest = dayHours.on\n"
    "? (dayAppts.length ? Math.min(dayStart, ...apptStarts) : dayStart)\n"
    ": (dayAppts.length ? Math.min(...apptStarts) - 30 : dayStart);"
)

CAL_LATEST_OLD = (
    "const latest = dayAppts.length ? Math.max(dayEnd, "
    "...dayAppts.map((a) => minutes(a.start_time) + Number(a.duration || 0))) : dayEnd;"
)
CAL_LATEST_NEW = (
    "const latest = dayHours.on\n"
    "? (dayAppts.length ? Math.max(dayEnd, ...apptEnds) : dayEnd)\n"
    ": (dayAppts.length ? Math.max(...apptEnds) + 30 : dayEnd);"
)

CAL_RENDER_OLD = (
    '{!dayHours.on ? <div className="h-full flex items-center justify-center '
    'text-sm text-[var(--ink-soft)]">Выходной</div> : <>'
)
CAL_RENDER_NEW = (
    '{!dayHours.on && dayAppts.length === 0 '
    '? <div className="h-full flex items-center justify-center '
    'text-sm text-[var(--ink-soft)]">Выходной</div> : <>'
)

CAL_GUARD_OLD = "if (!dayHours.on) return;"
CAL_GUARD_NEW = "if (!dayHours.on && dayAppts.length === 0) return;"

CAL_STEPS = [
    ("нижняя граница", CAL_EARLIEST_OLD, CAL_EARLIEST_NEW),
    ("верхняя граница", CAL_LATEST_OLD, CAL_LATEST_NEW),
    ("показ сетки", CAL_RENDER_OLD, CAL_RENDER_NEW),
    ("создание по тапу", CAL_GUARD_OLD, CAL_GUARD_NEW),
]


def patch_dashboard():
    if not os.path.exists(DASH):
        sys.exit(f"Не нашёл {DASH}. Запусти скрипт из папки zenflow.")

    with io.open(DASH, encoding="utf-8") as f:
        src = f.read()

    if "/appointment/new?date=" in src:
        return "Главная: уже было"

    count = src.count('to="/appointment/new"')
    if count == 0:
        sys.exit("[Главная] не нашёл ссылок на новую запись. Ничего не изменено.")

    src = src.replace('to="/appointment/new"', "to={`/appointment/new?date=${fmtDate(date)}`}")

    if "fmtDate" not in src:
        sys.exit("[Главная] в файле нет fmtDate — сообщи мне, ничего не сохранено.")

    with io.open(DASH, "w", encoding="utf-8") as f:
        f.write(src)

    return f"Главная: готово ({count} ссылки)"


def patch_calendar():
    if not os.path.exists(CAL):
        sys.exit(f"Не нашёл {CAL}. Запусти скрипт из папки zenflow.")

    with io.open(CAL, encoding="utf-8") as f:
        src = f.read()

    if "apptStarts" in src:
        return "Календарь: уже было"

    for name, old, _ in CAL_STEPS:
        if old not in src:
            sys.exit(f"[Календарь] не нашёл место правки: {name}. Ничего не изменено.")

    for _, old, new in CAL_STEPS:
        src = src.replace(old, new, 1)

    with io.open(CAL, "w", encoding="utf-8") as f:
        f.write(src)

    return "Календарь: готово"


def main():
    print(" · ".join([patch_dashboard(), patch_calendar()]))


if __name__ == "__main__":
    main()
