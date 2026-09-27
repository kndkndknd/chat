export type Container = 'webm' | 'ogg'

export type Recording = {
  container: Container
  mimeType: string
  blob: Blob
}

/**
 * 映像は VP9 固定。コンテナごとに候補を並べ、ブラウザが実際に
 * サポートしている最初の MIME タイプを採用する。
 */
const MIME_CANDIDATES: Record<Container, string[]> = {
  webm: [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs="vp9,opus"',
    'video/webm;codecs=vp9',
  ],
  ogg: [
    'video/ogg;codecs=vp9,opus',
    'video/ogg;codecs="vp9,opus"',
    'video/ogg;codecs=vp9',
  ],
}

export function pickMimeType(container: Container): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  return (
    MIME_CANDIDATES[container].find((type) =>
      MediaRecorder.isTypeSupported(type),
    ) ?? null
  )
}

export function supportedContainers(): { container: Container; mimeType: string }[] {
  const containers: Container[] = ['webm', 'ogg']
  return containers.flatMap((container) => {
    const mimeType = pickMimeType(container)
    return mimeType ? [{ container, mimeType }] : []
  })
}

// export function requestMedia(): Promise<MediaStream> {
//   return navigator.mediaDevices.getUserMedia({
//     video: { width: { ideal: 1280 }, height: { ideal: 720 } },
//     audio: true,
//   })
// }

/**
 * 1 本の MediaStream に対して MediaRecorder を 1 つ動かし、
 * durationMs 経過後に停止して Blob を返す。
 */
function recordOne(
  stream: MediaStream,
  container: Container,
  mimeType: string,
  durationMs: number,
): Promise<Recording> {
  return new Promise((resolve, reject) => {
    const recorder = new MediaRecorder(stream, { mimeType })
    const chunks: Blob[] = []
    let timer: ReturnType<typeof setTimeout> | null = null

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    })

    recorder.addEventListener('error', (event) => {
      clearTimeout(timer)
      reject((event as ErrorEvent).error ?? new Error(`${mimeType} の録画に失敗しました`))
    })

    recorder.addEventListener('stop', () => {
      clearTimeout(timer)
      resolve({
        container,
        mimeType,
        // recorder.mimeType にはブラウザが確定させた完全な値が入る
        blob: new Blob(chunks, { type: recorder.mimeType || mimeType }),
      })
    })

    recorder.start()
    timer = setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop()
    }, durationMs)
  })
}

/**
 * サポートされているコンテナすべてを同一ストリームから同時に録画する。
 */
export function recordAll(
  stream: MediaStream,
  durationMs: number,
): Promise<Recording[]> {
  const targets = supportedContainers()
  if (targets.length === 0) {
    return Promise.reject(
      new Error('VP9 で録画できるコンテナ (WebM / Ogg) がこのブラウザにありません'),
    )
  }
  return Promise.all(
    targets.map(({ container, mimeType }) =>
      recordOne(stream, container, mimeType, durationMs),
    ),
  )
}

export function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop()
}
