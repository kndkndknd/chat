import { loadScenario } from "./loadScenario";
import { execScenario } from "./execScenario";

const INTERVAL = 50;
const INTERVAL_MS = INTERVAL * 60 * 1000;

let itsukiTimer: NodeJS.Timeout | null = null;

const runOnce = async () => {
  const scenario = await loadScenario();
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

export const stopScenarioItsuki = () => {
  if (itsukiTimer !== null) {
    clearInterval(itsukiTimer);
    itsukiTimer = null;
    console.log("[scenarioItsuki] stopped");
  }
};
