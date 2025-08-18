/**
 * GPS位置情報を取得する関数
 * @param options 位置情報取得のオプション
 * @returns Promise<GPSPosition> 緯度・経度・精度・タイムスタンプを含むオブジェクト
 */
export async function getGPSPosition(options) {
    return new Promise((resolve, reject) => {
        // Geolocation APIの対応確認
        if (!navigator.geolocation) {
            // reject(new Error("Geolocation APIがサポートされていません"));
            console.log("Geolocation APIがサポートされていません");
            return;
        }
        const defaultOptions = {
            enableHighAccuracy: true, // 高精度モードを有効
            timeout: 10000, // 10秒でタイムアウト
            maximumAge: 60000, // キャッシュの有効期限（60秒）
        };
        const finalOptions = { ...defaultOptions, ...options };
        navigator.geolocation.getCurrentPosition((position) => {
            const result = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp,
            };
            resolve(result);
        }, (error) => {
            const gpsError = {
                code: error.code,
                message: error.message,
            };
            reject(gpsError);
        }, finalOptions);
    });
}
/**
 * GPS位置情報を継続的に監視する関数
 * @param callback 位置情報が更新された際に呼び出されるコールバック関数
 * @param options 位置情報取得のオプション
 * @returns 監視を停止するための関数
 */
export function watchGPSPosition(callback, errorCallback, options) {
    if (!navigator.geolocation) {
        throw new Error("Geolocation APIがサポートされていません");
    }
    const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
    };
    const finalOptions = { ...defaultOptions, ...options };
    const watchId = navigator.geolocation.watchPosition((position) => {
        const result = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
        };
        callback(result);
    }, (error) => {
        if (errorCallback) {
            const gpsError = {
                code: error.code,
                message: error.message,
            };
            errorCallback(gpsError);
        }
    }, finalOptions);
    // 監視を停止する関数を返す
    return () => {
        navigator.geolocation.clearWatch(watchId);
    };
}
/**
 * 使用例
 */
// async function example() {
//   try {
//     // GPS位置情報を取得
//     const position = await getGPSPosition();
//     console.log(`緯度: ${position.latitude}, 経度: ${position.longitude}`);
//     console.log(`精度: ${position.accuracy}m`);
//     // 加速度センサーの値を取得
//     const acceleration = await getAcceleration();
//     console.log(
//       `加速度 - X: ${acceleration.x}, Y: ${acceleration.y}, Z: ${acceleration.z}`
//     );
//   } catch (error) {
//     console.error("センサー取得エラー:", error);
//   }
// }
