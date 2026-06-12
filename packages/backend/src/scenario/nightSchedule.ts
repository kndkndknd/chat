import { ioState } from "../state/states/ioState";
import { clientState } from "../state";
import { stopEmit } from "../cmd/stopEmit";
import { scenarioItsuki, stopScenarioItsuki } from "./scenarioItsuki";
// import { flushPlaybackAndTimelapse } from "../mongo/flushStreams";

export const nightScheduleState = {
  quiet: false,
};

const isQuietTime = (now: Date): boolean => {
  const day = now.getDay();
  const h = now.getHours();
  if (h < 11) return true;
  const startHour = day === 0 ? 18 : 19;
  return h >= startHour;
};

const enterQuiet = () => {
  console.log("[nightSchedule] enter quiet");
  nightScheduleState.quiet = true;

  stopScenarioItsuki();

  const firstClient = Object.keys(clientState.client)[0];
  if (firstClient !== undefined) {
    stopEmit(firstClient);
  }

  ioState?.io.emit("timelapseFromServer", { cmd: "FALSE" });

  // flushPlaybackAndTimelapse().catch((e) =>
  //   console.error("[nightSchedule] flushPlaybackAndTimelapse error", e)
  // );
};

const exitQuiet = () => {
  console.log("[nightSchedule] exit quiet");
  nightScheduleState.quiet = false;

  ioState?.io.emit("timelapseFromServer", { cmd: "TRUE" });

  scenarioItsuki().catch((e) =>
    console.log("[nightSchedule] scenarioItsuki error", e)
  );
};

let scheduleTimer: NodeJS.Timeout | null = null;

export const startNightSchedule = () => {
  if (scheduleTimer !== null) return;

  nightScheduleState.quiet = isQuietTime(new Date());
  console.log(
    "[nightSchedule] start, initial quiet =",
    nightScheduleState.quiet
  );

  scheduleTimer = setInterval(() => {
    const shouldBeQuiet = isQuietTime(new Date());
    if (shouldBeQuiet && !nightScheduleState.quiet) {
      enterQuiet();
    } else if (!shouldBeQuiet && nightScheduleState.quiet) {
      exitQuiet();
    }
  }, 60 * 1000);
};
