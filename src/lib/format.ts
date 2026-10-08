const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const formatCurrency = (value: number) => currencyFormatter.format(value);

// Datas de trade são salvas como @db.Date (meia-noite UTC), então formatamos em UTC.
// Aceita também a chave de dia "YYYY-MM-DD", que o construtor de Date interpreta como UTC.
export const formatDate = (value: Date | string) =>
  dateFormatter.format(new Date(value));

export const formatPercent = (value: number) => percentFormatter.format(value);
