export const formatMoney = (value: number, currency = "RUB"): string =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
