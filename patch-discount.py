"""Добавляет сумму и скидку в приём оплаты, не затрагивая остальную
логику функции completeAppointment (пересчёт визитов клиента и т.п.).

Запуск из корня проекта:  python3 patch-discount.py
Повторный запуск безопасен.
"""

import io
import os
import sys

PATH = os.path.join("src", "data", "appointments.js")

STEPS = [
    (
        "подпись функции",
        "export async function completeAppointment(appointment,method){",
        "export async function completeAppointment(appointment,method,amount,discount){"
        "\n// amount — сколько реально заплатили, discount — скидка в процентах."
        "\nconst __full=Number(appointment.price)||0;"
        "\nconst __paid=Number.isFinite(Number(amount))&&Number(amount)>=0?Math.round(Number(amount)):__full;",
    ),
    (
        "цена записи",
        'updateAppointment(appointment.id,{status:"done"})',
        'updateAppointment(appointment.id,{status:"done",price:__paid})',
    ),
    (
        "сумма оплаты",
        "amount:appointment.price",
        "amount:__paid,discount_percent:Number(discount)||0",
    ),
]


def main():
    if not os.path.exists(PATH):
        sys.exit(f"Не нашёл {PATH}. Запусти скрипт из папки zenflow.")

    with io.open(PATH, encoding="utf-8") as f:
        src = f.read()

    if "__paid" in src:
        print("Уже применено — ничего не меняю.")
        return

    if "<<<<<<<" in src or ">>>>>>>" in src:
        sys.exit("В файле остались метки конфликта. Сначала выполни: git checkout --theirs src/data/appointments.js")

    for name, old, _ in STEPS:
        if old not in src:
            sys.exit(f"Не нашёл место правки: {name}. Ничего не изменено.")

    for _, old, new in STEPS:
        src = src.replace(old, new, 1)

    with io.open(PATH, "w", encoding="utf-8") as f:
        f.write(src)

    print("Готово: оплата принимает сумму и скидку.")


if __name__ == "__main__":
    main()
