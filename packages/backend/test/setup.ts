import { vi } from "vitest";

vi.mock("ioredis", () => {
  class MockRedis {
    on = vi.fn();
    off = vi.fn();
    once = vi.fn();
    get = vi.fn(async () => null);
    set = vi.fn(async () => "OK");
    del = vi.fn(async () => 1);
    incr = vi.fn(async () => 1);
    rpush = vi.fn(async () => 1);
    lpop = vi.fn(async () => null);
    lindex = vi.fn(async () => null);
    llen = vi.fn(async () => 0);
    lrange = vi.fn(async () => []);
    sadd = vi.fn(async () => 1);
    sismember = vi.fn(async () => 0);
    smembers = vi.fn(async () => []);
    exists = vi.fn(async () => 0);
    quit = vi.fn(async () => "OK");
    disconnect = vi.fn();
  }
  return { default: MockRedis };
});
