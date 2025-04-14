import { clientState } from "../state";

export const floatingPosition = (
  socketId
): { top: number; left: number; width: number; height: number } => {
  if (clientState.client[socketId] === undefined) {
    const projectionPosition =
      Object.keys(clientState.client).filter(
        (id) => clientState.client[id].projection
      ).length > 0
        ? clientState.client[
            Object.keys(clientState.client).filter(
              (id) => clientState.client[id].projection
            )[0]
          ].position
        : { top: 0, left: 0, width: 1920, height: 1080 };
    const sizeRandomize = Math.random();
    const aspect = projectionPosition.height / projectionPosition.width;
    switch (
      Object.keys(clientState.client).filter(
        (id) => !clientState.client[id].projection
      ).length
    ) {
      case 1:
        const top1 = Math.floor(
          (Math.random() * projectionPosition.height) / 2
        );
        const left1 = Math.floor(
          (Math.random() * projectionPosition.width) / 2
        );
        const width1 = Math.floor(
          sizeRandomize * (projectionPosition.width / 4) +
            projectionPosition.width / 4
        );
        const height1 = Math.floor(width1 * aspect);
        return { top: top1, left: left1, width: width1, height: height1 };
      case 2:
        const top2 = Math.floor(
          (Math.random() * projectionPosition.height) / 2
        );
        const left2 = Math.floor(
          (Math.random() * projectionPosition.width) / 2 +
            projectionPosition.width / 2
        );
        const width2 = Math.floor(
          sizeRandomize * (projectionPosition.width / 4) +
            projectionPosition.width / 4
        );
        const height2 = Math.floor(width2 * aspect);
        return { top: top2, left: left2, width: width2, height: height2 };
      case 3:
        const top3 = Math.floor(
          (Math.random() * projectionPosition.height) / 2 +
            projectionPosition.height / 2
        );
        const left3 = Math.floor(Math.random() * projectionPosition.width);
        const width3 = Math.floor(
          sizeRandomize * (projectionPosition.width / 3) +
            (projectionPosition.width * 2) / 3
        );
        const height3 = Math.floor(width3 * aspect);
        return { top: top3, left: left3, width: width3, height: height3 };
      default:
        const top = Math.floor(Math.random() * projectionPosition.height);
        const left = Math.floor(Math.random() * projectionPosition.width);
        const width = Math.floor(
          (sizeRandomize * (projectionPosition.width - left) * 2) / 3 +
            (projectionPosition.width - left) / 3
        );
        const height = Math.floor(width * aspect);
        return { top, left, width, height };
    }
  } else {
    return clientState.client[socketId].position;
  }
};
