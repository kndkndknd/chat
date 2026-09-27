import { loadScenario } from "./loadScenario";
import { execScenario } from "./execScenario";
// import { loadYesterdayPlayback } from "../mongo/loadYesterdayPlayback";
import { itsukiState } from "../state/states/itsukiState";

const INTERVAL = 25;
const INTERVAL_MS = INTERVAL * 60 * 1000;

let itsukiTimer: NodeJS.Timeout | null = null;
// 前回ループで読み込んだシナリオの JSON 文字列。変更検知に使う。
let lastScenarioJson: string | null = null;

const runOnce = async () => {
  // try {
  //   await loadYesterdayPlayback();
  //   itsukiState.faceDetect.yesterdayLoaded = true;
  // } catch (e) {
  //   itsukiState.faceDetect.yesterdayLoaded = false;
  //   console.error("[scenarioItsuki] loadYesterdayPlayback error", e);
  // }
  // 毎ループ JSON ファイルを読み直すので、scenario.json を書き換えれば次のループから反映される。
  const scenario = await loadScenario("scenario");
  const scenarioJson = JSON.stringify(scenario);
  if (lastScenarioJson !== null && lastScenarioJson !== scenarioJson) {
    console.log("[scenarioItsuki] scenario changed since last loop, applying new scenario");
  }
  lastScenarioJson = scenarioJson;
  console.log("[scenarioItsuki] loaded scenario", scenario);
  await execScenario(scenario);
};

export const scenarioItsuki = async () => {
  if (itsukiTimer !== null) {
    console.log("[scenarioItsuki] already running");
    return;
  }
  console.log(`[scenarioItsuki] start (every ${INTERVAL} min)`);
  await runOnce();
  itsukiTimer = setInterval(() => {
    runOnce().catch((e) => console.log("[scenarioItsuki] error", e));
  }, INTERVAL_MS);
};

// itsukiTimer が動作中（NULL でない）かどうかを返す。
export const isScenarioItsukiActive = () => itsukiTimer !== null;

export const stopScenarioItsuki = () => {
  if (itsukiTimer !== null) {
    clearInterval(itsukiTimer);
    itsukiTimer = null;
    lastScenarioJson = null;
    console.log("[scenarioItsuki] stopped");
  }
};
