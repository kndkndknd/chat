import * as fs from "fs";
import * as path from "path";

const dirPath = path.join(__dirname, "../../../../..", "chat_scenario");

export const loadScenario = async (
  scenarioName?: string
) /*: { [key: string]: string }*/ => {
  // const scenario: { [key: string]: string } = {};

  const filePath =
    scenarioName !== undefined
      ? path.join(dirPath, `${scenarioName}.json`)
      : path.join(dirPath, "scenario.json");

  try {
    const scenario = await JSON.parse(fs.readFileSync(filePath).toString());
    return scenario;
  } catch (e) {
    console.log(e);
    return { error: String(e) };
  }
};
