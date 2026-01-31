// WebPage.tsx または environment.tsx

"use client";
import { useState, useEffect } from 'react';
import LeftPullTab from "@components/LeftPullTab";
import CameraStream from "@components/CameraStream"; 
import styles from "./page.module.css";
import commonStyles from '@components/styles/common.module.css';

// 取得するセンサーデータの型を明確に定義
interface SensorData {
    airTemperature: number;
    humidity: number;
    waterTemperature: number;
}

// センサーデータの初期値
const initialSensorData: SensorData = {
    airTemperature: 0.0,
    humidity: 0,
    waterTemperature: 0.0,
};

export default function WebPage() {
    // Stateに型を適用
    const [sensorData, setSensorData] = useState<SensorData>(initialSensorData);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // モックAPIからのデータ取得とポーリング処理
    useEffect(() => {
        const fetchData = async () => {
            try {
                //API Route
                const response = await fetch('/api/environment'); 
                
                if (!response.ok) {
                    // HTTPエラーの場合、throwしてcatchブロックで処理
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                // レスポンスデータをSensorData型として受け取る
                const data: SensorData = await response.json();
                
                // 取得したデータでStateを更新
                setSensorData(data);
                setIsLoading(false);
            } catch (error) {
                console.error("センサーデータ取得エラー:", error);
                setIsLoading(false);
            }
        };

        // 初回実行
        fetchData(); 

        // 5秒ごとにデータを再取得する (ポーリング)
        const intervalId = setInterval(fetchData, 10000); 

        // クリーンアップ
        return () => clearInterval(intervalId);
    }, []); 

    // 表示用の値を計算（データがない場合は'...'、ある場合は小数点以下を調整）
    const tempValue = isLoading ? '...' : sensorData.airTemperature.toFixed(1);
    const humidityValue = isLoading ? '...' : sensorData.humidity;
    const waterValue = isLoading ? '...' : sensorData.waterTemperature.toFixed(1);

    return (
        <LeftPullTab>
            <div className={commonStyles.container}>
                <h1 className={commonStyles.title}>こっこふぁくとりー/環境モニタリング</h1>
                <p className={commonStyles.infoBox}>鶏舎の環境情報をリアルタイムに表示します。</p>
                {/* 鶏舎番号セレクター (変更なし) */}
                <div className={styles.selector}>
                    <label className={styles.label}>鶏舎番号</label>
                    <select className={styles.select}>
                        <option>5号舎</option>
                        <option>6号舎</option>
                        <option>7号舎</option>
                        <option>8号舎</option>
                        <option>9号舎</option>
                    </select>
                </div>

                {/* センサー情報カード ★ Stateの値を使用 ★ */}
                <div className={styles.cards}>
                    <div className={`${styles.card} ${styles.temp}`}>
                        <h2 className={styles.cardTitle}>気温</h2>
                        <p className={styles.cardValue}>{tempValue}</p>
                        <p className={styles.cardUnit}>℃</p>
                    </div>

                    <div className={`${styles.card} ${styles.humidity}`}>
                        <h2 className={styles.cardTitle}>湿度</h2>
                        <p className={styles.cardValue}>{humidityValue}</p>
                        <p className={styles.cardUnit}>%</p>
                    </div>

                    <div className={`${styles.card} ${styles.water}`}>
                        <h2 className={styles.cardTitle}>飲水温</h2>
                        <p className={styles.cardValue}>{waterValue}</p>
                        <p className={styles.cardUnit}>℃</p>
                    </div>
                </div>

                {/* カメラ映像とステータス (変更なし) */}
                <div className={styles.cameraBox}>
                    <h2 className={styles.cardTitle}>カメラ</h2>
                    <p className={styles.cameraStatus}>異常なし</p>
                    
                    <CameraStream
                        alt="鶏舎カメラ映像"
                        className={styles.cameraImage}
                    />
                </div>
            </div>
        </LeftPullTab>
    );
}