export const getTypeArr = (stringArr: string[]): string[] => {
  return stringArr.map((string) => {
    if (/^([1-9]\d*|0)(\.\d+)?$/.test(string)) {
      return "number";
    } else if (/^[A-Za-z]*$/.test(string)) {
      return "string";
    } else {
      return "other";
    }
  });
};
