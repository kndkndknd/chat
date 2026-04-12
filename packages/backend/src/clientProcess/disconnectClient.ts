import { WebSocket } from "ws"
import { clientState, webSocketState} from "../state"

export const disconnectClient = (ws: WebSocket) => {
  const disconnectedClient = webSocketState.clientId.find((element)=> element.ws === ws)
  if(Object.keys(clientState.client).includes(disconnectedClient.id)) {
    delete clientState.client[disconnectedClient.id]
    if(clientState.cmdClient.includes(disconnectedClient.id)) {
      clientState.cmdClient = clientState.cmdClient.filter((client) => client !== disconnectedClient.id)
    }
    if(clientState.streamClient.includes(disconnectedClient.id)) {
      clientState.streamClient = clientState.streamClient.filter((client) => client !== disconnectedClient.id)
    }
    if(clientState.sinewaveClient.includes(disconnectedClient.id)) {
      clientState.sinewaveClient = clientState.sinewaveClient.filter((client) => client !== disconnectedClient.id)
    }
    if(clientState.paCmdClient.includes(disconnectedClient.id)) {
      clientState.paCmdClient = clientState.paCmdClient.filter((client) => client !== disconnectedClient.id)
    }
    if(clientState.paStreamClient.includes(disconnectedClient.id)) {
      clientState.paStreamClient = clientState.paStreamClient.filter((client) => client !== disconnectedClient.id)
    }   
  }
  webSocketState.clientId = webSocketState.clientId.filter(
    (client) => client.ws !== ws,
  );

}
