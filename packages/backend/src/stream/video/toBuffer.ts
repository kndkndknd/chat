export function toBuffer(x: unknown): Buffer {
  if (Buffer.isBuffer(x)) return x;
  if (x instanceof Uint8Array) return Buffer.from(x);
  // JSON化された Buffer { type:'Buffer', data:number[] } を復元
  if (
    x &&
    typeof x === "object" &&
    (x as any).type === "Buffer" &&
    Array.isArray((x as any).data)
  ) {
    return Buffer.from((x as any).data);
  }
  throw new TypeError("Body is not binary");
}
