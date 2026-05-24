export const getDateTimeString = () => {
  const date = new Date();
  const yyyy = String(date.getFullYear());
  // Stringの`padStart`メソッド（ES2017）で2桁になるように0埋めする
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds());
  return { yyyy, mm, dd, hh, mi, ss, ms };
};
