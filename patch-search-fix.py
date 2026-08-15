"""Исправляет белый экран при открытии записи.

Причина: в фильтре услуг использовалась переменная selectedServiceIds,
которой в файле нет — она называется selectedServices и хранит объекты услуг,
а не идентификаторы.

Запуск из корня проекта:  python3 patch-search-fix.py
"""

import io
import os
import sys

PATH = os.path.join("src", "screens", "AppointmentForm.jsx")

OLD = (
    "const visibleServices=useMemo(()=>{const q=serviceQuery.trim().toLowerCase();"
    "if(!q)return services;"
    'return services.filter(s=>String(s.name||"").toLowerCase().includes(q)||selectedServiceIds.includes(s.id));'
    "},[services,serviceQuery,selectedServiceIds]);"
)

NEW = (
    "const visibleServices=useMemo(()=>{const q=serviceQuery.trim().toLowerCase();"
    "if(!q)return services;"
    'return services.filter(s=>String(s.name||"").toLowerCase().includes(q)'
    "||selectedServices.some(x=>x.id===s.id));"
    "},[services,serviceQuery,selectedServices]);"
)


def main():
    if not os.path.exists(PATH):
        sys.exit(f"Не нашёл {PATH}. Запусти скрипт из папки zenflow.")

    with io.open(PATH, encoding="utf-8") as f:
        src = f.read()

    if "selectedServiceIds" not in src:
        print("Уже исправлено — ничего не меняю.")
        return

    if OLD not in src:
        sys.exit("Не нашёл строку фильтра услуг. Сообщи мне — разберусь отдельно.")

    src = src.replace(OLD, NEW, 1)

    if "selectedServiceIds" in src:
        sys.exit("Остались упоминания selectedServiceIds — сообщи мне, ничего не сохранено.")

    with io.open(PATH, "w", encoding="utf-8") as f:
        f.write(src)

    print("Готово: белый экран исправлен.")


if __name__ == "__main__":
    main()
