import { urlState } from "../state";

async function postStreamReq(source: string) {
  const apiUrl = `https://${urlState.localServer}/api/streamReq`;
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source }),
    });
    if (!response.ok) {
      console.error("Failed to post char:", response.statusText);
    }
  } catch (error) {
    console.error("Error posting char:", error);
  }
}

export { postStreamReq };
