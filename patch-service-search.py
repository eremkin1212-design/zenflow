"""Добавляет поиск по услугам в экран записи.

Запуск из корня проекта:  python3 patch-service-search.py
Повторный запуск безопасен.
"""

import io
import os
import sys

PATH = os.path.join("src", "screens", "AppointmentForm.jsx")

GRID_ANCHOR = '</span></div><div className="grid grid-cols-2 gap-2.5">'

SEARCH_UI = (
    "</span></div>"
    '{services.length > 6 && <div className="flex items-center gap-2 rounded-2xl px-3 py-2 mb-2.5 bg-[var(--surface)] border border-[var(--line)]">'
    '<Search size={15} className="text-[var(--ink-soft)]" />'
    "<input value={serviceQuery} onChange={(e) => setServiceQuery(e.target.value)} "
    'placeholder="Поиск услуги" className="flex-1 bg-transparent outline-none text-sm" />'
    "{serviceQuery && <button onClick={() => setServiceQuery(\"\")} aria-label=\"Очистить\" "
    'className="p-1"><X size={14} className="text-[var(--ink-soft)]" /></button>}</div>}'
    '<div className="grid grid-cols-2 gap-2.5">'
)

STEPS = [
    (
        "состояние поиска",
        '[repeatUnit,setRepeatUnit]=useState("none")',
        '[serviceQuery,setServiceQuery]=useState(""),[repeatUnit,setRepeatUnit]=useState("none")',
    ),
    (
        "отфильтрованный список",
        "function toggleService(s){",
        "const visibleServices=useMemo(()=>{const q=serviceQuery.trim().toLowerCase();"
        "if(!q)return services;"
        "return services.filter(s=>String(s.name||\"\").toLowerCase().includes(q)||selectedServiceIds.includes(s.id));"
        "},[services,serviceQuery,selectedServiceIds]);"
        "\nfunction toggleService(s){",
    ),
    ("поле поиска", GRID_ANCHOR, SEARCH_UI),
    ("вывод списка", "{services.map(", "{visibleServices.map("),
]

NOT_FOUND_ANCHOR = "{visibleServices.map("


def main():
    if not os.path.exists(PATH):
        sys.exit(f"Не нашёл {PATH}. Запусти скрипт из папки zenflow.")

    with io.open(PATH, encoding="utf-8") as f:
        src = f.read()

    if "serviceQuery" in src:
        print("Уже применено — ничего не меняю.")
        return

    for name, old, _ in STEPS:
        if old not in src:
            sys.exit(f"Не нашёл место правки: {name}. Ничего не изменено.")

    if "Search" not in src.split("from \"lucide-react\"")[0]:
        sys.exit("В импортах нет иконки Search — сообщи мне, добавлю отдельно.")

    for _, old, new in STEPS:
        src = src.replace(old, new, 1)

    with io.open(PATH, "w", encoding="utf-8") as f:
        f.write(src)

    print("Готово: поиск по услугам добавлен.")


if __name__ == "__main__":
    main()
