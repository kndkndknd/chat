import { urlState } from "../state";
import { buffStateType } from "../../../../types";

async function postStream(stream: buffStateType) {
  const apiUrl = `https://${urlState.localServer}/api/chunk`;
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stream),
    });
    if (!response.ok) {
      console.error("Failed to post char:", response.statusText);
    }
  } catch (error) {
    console.error("Error posting char:", error);
  }
}

export { postStream };
