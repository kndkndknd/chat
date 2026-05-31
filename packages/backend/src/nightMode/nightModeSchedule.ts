// ナイトモードの自動スケジューラ。
// 月曜以外の毎日 19:00 に enableNightMode()（/api/nightmode {value:true} 相当）、
// 翌 11:00 に disableNightMode()（{value:false} 相当）を実行する。
// 月曜は enable/disable とも発火しない。
// nightSchedule.ts と同じく 1 分ごとに現在時刻を判定し、ウィンドウ境界で
// 1 回だけ enable/disable を発火させる（tick 取りこぼしや再起動に強い）。
import { enableNightMode, disableNightMode } from "./nightMode";

// ナイトモードの ON ウィンドウ: 19:00 以降、または 11:00 より前（深夜をまたぐ）。
export const isNightWindow = (now: Date): boolean => {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = 19 * 60; // 19:00
  const end = 11 * 60; // 11:00
  return minutes >= start || minutes < end;
};

// スケジュールを実行する曜日か。月曜(getDay()===1)は実行しない。
export const isScheduleActiveDay = (now: Date): boolean => now.getDay() !== 1;

let scheduleTimer: NodeJS.Timeout | null = null;
// 直近にスケジューラが意図しているナイトモードの状態。境界の検出に使う。
let scheduledNightOn = false;

// 1 tick 分の判定。ウィンドウへ入った/出た境界でだけ enable/disable を発火する。
// 月曜は境界を発火させず状態を据え置く。これにより日曜 19:00 の ON は月曜中ずっと
// 維持され、火曜 11:00（火曜は稼働日）で初めて OFF になる（= 日曜19時〜火曜11時が ON）。
export const tickNightModeSchedule = (now: Date): void => {
  if (!isScheduleActiveDay(now)) return;
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

  // 起動時、月曜は終日 ON（日曜夜〜火曜朝の継続中）、それ以外はウィンドウ(19:00-翌11:00)内なら
  // ナイトモードに入れる。ウィンドウ外（かつ月曜以外）なら何もしない（通常運用を妨げない）。
  const startNow = new Date();
  scheduledNightOn = !isScheduleActiveDay(startNow) || isNightWindow(startNow);
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
