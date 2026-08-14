"""Добавляет блок «Пуши на это устройство» в экран Настроек.

Запуск из корня проекта:  python3 patch-settings.py
Скрипт ничего не переписывает целиком — только вставляет две строки.
Повторный запуск безопасен: если уже применён, просто скажет об этом.
"""

import io
import os
import sys

PATH = os.path.join("src", "screens", "Settings.jsx")

IMPORT_ANCHOR = 'import { getProfile, updateProfile, uploadAvatar } from "../data/profile";'
IMPORT_LINE = 'import PushToggle from "../components/PushToggle";'

BLOCK_ANCHOR = (
    '<div className="rounded-2xl px-4 bg-[var(--surface)] '
    'border border-[var(--line)]"><Row left="Напоминание клиенту"'
)
BLOCK_INSERT = '<div className="mb-2.5"><PushToggle /></div>'


def main():
    if not os.path.exists(PATH):
        sys.exit(f"Не нашёл {PATH}. Запусти скрипт из папки zenflow.")

    with io.open(PATH, encoding="utf-8") as f:
        src = f.read()

    if "PushToggle" in src:
        print("Уже применено — ничего не меняю.")
        return

    if IMPORT_ANCHOR not in src:
        sys.exit("Не нашёл строку импорта профиля — файл отличается от ожидаемого.")
    if BLOCK_ANCHOR not in src:
        sys.exit("Не нашёл секцию «Уведомления» — файл отличается от ожидаемого.")

    src = src.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + "\n" + IMPORT_LINE, 1)
    src = src.replace(BLOCK_ANCHOR, BLOCK_INSERT + BLOCK_ANCHOR, 1)

    with io.open(PATH, "w", encoding="utf-8") as f:
        f.write(src)

    print("Готово: блок пушей добавлен в Настройки.")


if __name__ == "__main__":
    main()
