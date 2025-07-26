// 加速度センサーの型定義
interface AccelerationData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

/**
 * 加速度センサーの値を取得する関数
 * @returns Promise<AccelerationData> x、y、z軸の加速度とタイムスタンプを含むオブジェクト
 */
export async function getAcceleration(): Promise<AccelerationData> {
  return new Promise((resolve, reject) => {
    // DeviceMotionEventの対応確認
    if (!window.DeviceMotionEvent) {
      reject(new Error("DeviceMotionEventがサポートされていません"));
      return;
    }

    // 権限が必要な場合のリクエスト（iOS 13以降）
    const requestPermission = async () => {
      if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
        try {
          const permission = await (
            DeviceMotionEvent as any
          ).requestPermission();
          if (permission !== "granted") {
            reject(new Error("デバイスモーション権限が拒否されました"));
            return false;
          }
        } catch (error) {
          reject(new Error("デバイスモーション権限の取得に失敗しました"));
          return false;
        }
      }
      return true;
    };

    const setupListener = () => {
      let hasResponded = false;

      const handleMotion = (event: DeviceMotionEvent) => {
        if (hasResponded) return;

        const acceleration = event.accelerationIncludingGravity;

        if (
          acceleration &&
          acceleration.x !== null &&
          acceleration.y !== null &&
          acceleration.z !== null
        ) {
          hasResponded = true;
          window.removeEventListener("devicemotion", handleMotion);

          const result: AccelerationData = {
            x: acceleration.x,
            y: acceleration.y,
            z: acceleration.z,
            timestamp: Date.now(),
          };
          resolve(result);
        }
      };

      window.addEventListener("devicemotion", handleMotion);

      // 5秒でタイムアウト
      setTimeout(() => {
        if (!hasResponded) {
          hasResponded = true;
          window.removeEventListener("devicemotion", handleMotion);
          reject(
            new Error(
              "加速度センサーの値を取得できませんでした（タイムアウト）"
            )
          );
        }
      }, 5000);
    };

    // 権限リクエスト後にリスナーを設定
    requestPermission().then((success) => {
      if (success) {
        setupListener();
      }
    });
  });
}
