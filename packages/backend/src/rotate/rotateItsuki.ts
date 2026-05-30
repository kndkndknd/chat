import { m5Switch, m5Test } from "./m5Access";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * rotation リレーを ON/OFF しつつ、間に外部からの ON 入力を
 * `m5Test` でポーリング待機するシーケンスを `sets` 回繰り返す。
 *
 * 1 セットの流れ:
 *   1. m5Switch(rotation, ON)
 *   2. offDelayMs 待機
 *   3. m5Switch(rotation, OFF)
 *   4. testIntervalMs 間隔で m5Test(rotation) をポーリング、ON が返るまで待つ
 *      (pollTimeoutMs を超えた場合は m5Switch(rotation, ON) を実行してフォールバック)
 *   5. offDelayMs 待機
 *   6. m5Switch(rotation, OFF)
 *
 * @param offDelayMs ON 後/検出後に OFF するまでの待ち時間 (ms)
 * @param testIntervalMs m5Test ポーリング間隔 (ms)
 * @param sets 繰り返しセット数
 * @param pollTimeoutMs ポーリングのタイムアウト (ms)。経過すると強制的に ON する
 */
export async function rotateItsuki(
  offDelayMs: number = 40_000,
  testIntervalMs: number = 1_000,
  sets: number = 1,
  pollTimeoutMs: number = 60_000,
): Promise<void> {
  for (let i = 0; i < sets; i++) {
    console.log(`[rotateItsuki] set ${i + 1}/${sets} start`);

    await m5Switch("rotation", true);
    await sleep(offDelayMs);
    await m5Switch("rotation", false);

    // console.log(`[rotateItsuki] set ${i + 1}/${sets} polling for ON`);
    // const pollStart = Date.now();
    // let detected = false;
    // while (Date.now() - pollStart < pollTimeoutMs) {
    //   const isOn = await m5Test("rotation");
    //   if (isOn) {
    //     detected = true;
    //     break;
    //   }
    //   await sleep(testIntervalMs);
    // }
    // if (!detected) {
    //   console.log(
    //     `[rotateItsuki] set ${i + 1}/${sets} poll timeout (${pollTimeoutMs}ms), forcing ON`,
    //   );
    //   await m5Switch("rotation", true);
    // }

    // console.log(`[rotateItsuki] set ${i + 1}/${sets} off after ${offDelayMs}ms`);
    // await sleep(offDelayMs);
    // await m5Switch("rotation", false);
  }

  console.log(`[rotateItsuki] done (${sets} sets)`);
}
