export const glitchParam = (
  arg: string | undefined,
  glitchKeys: Array<string>,
): { value: number } | { property: string } => {
  if (arg === "ON" || arg === "TRUE") {
    return { value: 1 };
  }
  if (arg !== undefined && glitchKeys.includes(arg)) {
    return { property: arg };
  }
  return { value: 0 };
};
