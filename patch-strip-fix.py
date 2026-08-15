"""Исправляет ленту дат в экране «Новая запись»:
  1) лента сама встаёт на выбранный день (сейчас остаётся в прошлом);
  2) запас назад уменьшен с 12 недель до 4, вперёд — больше.

Запуск из корня проекта:  python3 patch-strip-fix.py
"""

import io
import os
import sys

PATH = os.path.join("src", "screens", "AppointmentForm.jsx")

STEPS = [
    (
        "запас назад при старте",
        "const [stripBase,setStripBase]=useState(()=>addDays(startOfWeek(new Date()),-84));",
        "const [stripBase,setStripBase]=useState(()=>addDays(startOfWeek(new Date()),-28));",
    ),
    (
        "длина ленты",
        "const stripDates=useMemo(()=>Array.from({length:175},(_,i)=>addDays(stripBase,i)),[stripBase]);",
        "const stripDates=useMemo(()=>Array.from({length:240},(_,i)=>addDays(stripBase,i)),[stripBase]);",
    ),
    (
        "запас назад при пересборке",
        "{setStripBase(addDays(startOfWeek(date),-84));return}",
        "{setStripBase(addDays(startOfWeek(date),-28));return}",
    ),
    (
        "подкрутка после загрузки",
        "if(el)stripReady.current=true},[date,stripDates]);",
        "if(el)stripReady.current=true},[date,stripDates,loading]);",
    ),
]


def main():
    if not os.path.exists(PATH):
        sys.exit(f"Не нашёл {PATH}. Запусти скрипт из папки zenflow.")

    with io.open(PATH, encoding="utf-8") as f:
        src = f.read()

    if "[date,stripDates,loading]" in src and "-28" in src:
        print("Уже применено — ничего не меняю.")
        return

    for name, old, _ in STEPS:
        if old not in src:
            sys.exit(f"Не нашёл место правки: {name}. Ничего не изменено.")

    for _, old, new in STEPS:
        src = src.replace(old, new, 1)

    with io.open(PATH, "w", encoding="utf-8") as f:
        f.write(src)

    print("Готово: лента дат теперь открывается на выбранном дне.")


if __name__ == "__main__":
    main()
