// Local calendar date as YYYY-MM-DD (toISOString() would give the UTC date, i.e. tomorrow in the evening)
export const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
