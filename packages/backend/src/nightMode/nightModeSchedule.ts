// ナイトモードの自動スケジューラ。
// 毎日 19:30 に enableNightMode()（/api/nightmode {value:true} 相当）、
// 翌 10:30 に disableNightMode()（{value:false} 相当）を実行する。
// nightSchedule.ts と同じく 1 分ごとに現在時刻を判定し、ウィンドウ境界で
// 1 回だけ enable/disable を発火させる（tick 取りこぼしや再起動に強い）。
import { enableNightMode, disableNightMode } from "./nightMode";

// 夜のウィンドウ: 19:30 以降、または 10:30 より前（深夜をまたぐ）。
export const isNightWindow = (now: Date): boolean => {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = 19 * 60 + 30; // 19:30
  const end = 10 * 60 + 30; // 10:30
  return minutes >= start || minutes < end;
};

let scheduleTimer: NodeJS.Timeout | null = null;
// 直近にスケジューラが意図しているナイトモードの状態。境界の検出に使う。
let scheduledNightOn = false;

// 1 tick 分の判定。夜のウィンドウへ入った/出た境界でだけ enable/disable を発火する。
export const tickNightModeSchedule = (now: Date): void => {
  const shouldBeOn = isNightWindow(now);
  if (shouldBeOn && !scheduledNightOn) {
    enableNightMode();
    scheduledNightOn = true;
  } else if (!shouldBeOn && scheduledNightOn) {
    disableNightMode();
    scheduledNightOn = false;
  }
};

export const startNightModeSchedule = (): void => {
  if (scheduleTimer !== null) return;

  // 起動時にすでに夜のウィンドウ内なら、その場でナイトモードに入れる。
  // 日中なら何もしない（通常運用を妨げない）。
  scheduledNightOn = isNightWindow(new Date());
  console.log(
    "[nightModeSchedule] start, initial nightOn =",
    scheduledNightOn
  );
  if (scheduledNightOn) {
    enableNightMode();
  }

  scheduleTimer = setInterval(() => tickNightModeSchedule(new Date()), 60 * 1000);
};

export const stopNightModeSchedule = (): void => {
  if (scheduleTimer !== null) {
    clearInterval(scheduleTimer);
    scheduleTimer = null;
  }
};
