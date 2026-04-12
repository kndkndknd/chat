import { urlState } from "../state";

async function postChar(char: string) {
  const apiUrl = `https://${urlState.localServer}/api/char`;
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ char }),
    });
    if (!response.ok) {
      console.error("Failed to post char:", response.statusText);
    }
  } catch (error) {
    console.error("Error posting char:", error);
  }
}

export { postChar };
