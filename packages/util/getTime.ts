export const getTime = (dateString: string): number => {
  const [date, time] = dateString.split(" ");
  const [hh, mm, ss] = time.split(":");
  const [yyyy, month, dd] = date.split("-");
  const millisecond =
    Number(yyyy) * 365 * 24 * 60 * 60 * 1000 +
    Number(month) * 31 * 24 * 60 * 60 * 1000 +
    Number(dd) * 24 * 60 * 60 * 1000 +
    Number(hh) * 60 * 60 * 1000 +
    Number(mm) * 60 * 1000 +
    Number(ss) * 1000;
  return millisecond;
};
