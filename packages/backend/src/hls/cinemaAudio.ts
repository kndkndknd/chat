// CINEMA 上映時の音声担当を決める。
// urlPathName に "project" を含む端末が1台でも接続されていれば、
// その端末のみ音声を再生し、他の端末はミュート（映像のみ）にする。
// どの端末も /project でなければ、従来どおり全端末で音声を再生する。
export const cinemaAudio = (
  clients: { [id: string]: { urlPathName?: string } },
  target: string[],
): { [id: string]: boolean } => {
  const isProjection = (id: string): boolean =>
    (clients[id]?.urlPathName ?? "").includes("project");

  const hasProjection = Object.keys(clients).some((id) => isProjection(id));

  const audio: { [id: string]: boolean } = {};
  target.forEach((id) => {
    audio[id] = hasProjection ? isProjection(id) : true;
  });
  return audio;
};
