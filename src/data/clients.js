// Единый источник данных о клиентах.
// На следующем шаге эти функции можно заменить на реальные запросы к backend —
// сигнатуры (что возвращают) останутся те же, экраны не придётся переписывать.

export const CLIENTS = [
  { id: 1, name: "Марина Соколова", phone: "+7 916 111-11-11", initials: "МС", visits: 22, cancellations: 0, avgCheck: 4200, lastVisit: "сегодня, 09:00", favoriteService: "Классический массаж", color: "#7C9A86" },
  { id: 2, name: "Игорь Плетнёв", phone: "+7 916 222-22-22", initials: "ИП", visits: 9, cancellations: 1, avgCheck: 5200, lastVisit: "сегодня, 10:30", favoriteService: "Спортивный массаж", color: "#B98572" },
  { id: 3, name: "Анна Ким", phone: "+7 916 000-00-00", initials: "АК", visits: 14, cancellations: 0, avgCheck: 3800, lastVisit: "сегодня, 13:00", favoriteService: "Лимфодренаж", color: "#9C8FB0" },
  { id: 4, name: "Дарья Ефимова", phone: "+7 916 333-33-33", initials: "ДЕ", visits: 3, cancellations: 0, avgCheck: 2800, lastVisit: "сегодня, 14:00", favoriteService: "Массаж лица", color: "#C6A15B" },
  { id: 5, name: "Олег Крылов", phone: "+7 916 444-44-44", initials: "ОК", visits: 6, cancellations: 2, avgCheck: 4200, lastVisit: "сегодня, 16:30", favoriteService: "Классический массаж", color: "#7C9A86" },
  { id: 6, name: "Света Волкова", phone: "+7 916 555-55-55", initials: "СВ", visits: 4, cancellations: 2, avgCheck: 3800, lastVisit: "9 месяцев назад", favoriteService: "Лимфодренаж", color: "#9C8FB0" },
  { id: 7, name: "Павел Гриб", phone: "+7 916 666-66-66", initials: "ПГ", visits: 11, cancellations: 0, avgCheck: 5200, lastVisit: "3 недели назад", favoriteService: "Спортивный массаж", color: "#B98572" },
];

// Рейтинг — не оценка "хороший/плохой", а полезная информация для построения отношений с клиентом.
export function ratingTag(c) {
  if (c.lastVisit.includes("месяц") || c.lastVisit.includes("год")) {
    return { label: "Редкий клиент", tone: "clay" };
  }
  if (c.visits >= 10 && c.cancellations === 0) {
    return { label: "Постоянный клиент", tone: "moss" };
  }
  if (c.visits <= 2) {
    return { label: "Новый клиент", tone: "clay" };
  }
  return { label: "Обычный клиент", tone: "soft" };
}

export function getClientById(id) {
  return CLIENTS.find((c) => c.id === Number(id));
}

const DATE_POOL = ["31 июл", "14 июл", "29 июн", "12 июн", "30 мая", "18 мая"];

export function genHistory(client) {
  const rows = Math.min(client.visits, DATE_POOL.length);
  return Array.from({ length: rows }, (_, i) => ({
    id: i,
    date: DATE_POOL[i],
    service: client.favoriteService,
    color: client.color,
    price: client.avgCheck,
  }));
}

export function genPayments(client) {
  return genHistory(client).map((h, i) => ({
    id: h.id,
    date: h.date,
    amount: h.price,
    method: i % 2 === 0 ? "Карта" : "Наличные",
  }));
}

const NOTES_BY_CLIENT = {
  3: [
    { id: 1, date: "31 июл", text: "Просит поменьше давления в области поясницы." },
    { id: 2, date: "14 июл", text: "Хорошо реагирует на тёплое масло, любит тишину во время сессии." },
  ],
};

export function getNotes(clientId) {
  return NOTES_BY_CLIENT[clientId] || [];
}

const RECS_BY_CLIENT = {
  3: "Рекомендовать курс из 4 сеансов лимфодренажа с интервалом 2 недели. Обратить внимание на поясничную область — просила снизить давление на последнем сеансе.",
};

export function getRecommendation(clientId) {
  return RECS_BY_CLIENT[clientId] || "Рекомендаций пока нет — появятся после первых сессий.";
}
