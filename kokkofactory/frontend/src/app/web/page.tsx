
"use client";

import { useState, useEffect, useCallback } from "react";
import LoadingScreen from "@components/LoadingScreen";
import LeftPullTab from "@components/LeftPullTab";
import styles from "./page.module.css";
import commonStyles from '@components/styles/common.module.css';

// --------------------------------------------------
// 1. 型定義
// --------------------------------------------------

//  /api/egg からの応答型
interface EggRecord {
    id: number;
    coop_number: number;
    count: number;
    date: string; 
}
interface EggDataList extends Array<EggRecord> {}

//  /api/deathchicken からの応答型
interface DeadChickenRecord {
    id: number;
    coop_number: number;
    count: number; // 斃死数
    cause_of_death: string;
    date: string; 
}
interface DeadChickenDataList extends Array<DeadChickenRecord> {}

//  /api/stock からの応答型
interface InventoryItem {
    supplierName: string;
    ItemName: string;
    address: string;
    phoneNumber: string;
    email: string;
    remainingCount: number;
    alertThreshold: number;
}
interface InventoryList extends Array<InventoryItem> {}

// 新規追加: /api/shipment からの応答型 (Prismaのincludeを想定)
interface ShipmentRecord {
    id: number;
    customerId: number;
    shipment_date: string;
    shipped_count: number;
    // 顧客名を結合して取得できることを想定（API側でPrismaのincludeを使用）
    customer: {
        name: string;
    };
}
interface ShipmentDataList extends Array<ShipmentRecord> {}


interface DashboardData {
    // 産卵数
    eggCountToday: number; 
    latestEggRecords: EggRecord[]; 
    
    // 斃死数
    chickenDeathCountToday: number;
    latestDeadChickenRecords: DeadChickenRecord[];
    
    // 出荷情報
    totalShipmentCountToday: number; // 今日の出荷総数（KPI用）
    latestShipments: { customerName: string; count: number }[]; // 今日の出荷リスト
    
    // 在庫アラート情報
    lowStockItemsCount: number;
    lowStockItems: { name: string; remaining: number; threshold: number }[];

    //気温、湿度
    airTemperature: number;
    humidity: number;
    waterTemperature: number;
}


// --------------------------------------------------
// 2. API通信関数
// --------------------------------------------------

/**
 * 卵の全リストを取得する関数
 */
const fetchEggData = async (): Promise<EggDataList> => {
    const eggRes = await fetch("/api/egg");
    if (!eggRes.ok) throw new Error("卵データの取得に失敗しました。");
    return eggRes.json();
};

/**
 * 在庫の全リストを取得する関数
 */
const fetchStockData = async (): Promise<InventoryList> => {
    const stockRes = await fetch("/api/stock");
    if (!stockRes.ok) throw new Error("在庫データの取得に失敗しました。");
    return stockRes.json();
};

/**
 * 死んだ鶏の全リストを取得する関数
 */
const fetchDeadChickenData = async (): Promise<DeadChickenDataList> => {
    const dcRes = await fetch("/api/deathchicken"); 
    if (!dcRes.ok) throw new Error("死亡記録の取得に失敗しました。");
    return dcRes.json();
};

/**
 * 新規追加: 出荷の全リストを取得する関数
 */
const fetchShipmentData = async (): Promise<ShipmentDataList> => {
    // APIルートを /api/shipment と仮定します
    const shipRes = await fetch("/api/shipment"); 
    if (!shipRes.ok) throw new Error("出荷データの取得に失敗しました。");
    // 顧客情報(name)がincludeされていることを想定
    return shipRes.json(); 
};

const fetchEnvironment = async () => {
  const res = await fetch("/api/environment");
  if (!res.ok) throw new Error("環境データ取得失敗");
  return res.json();
};

const fetchDashboardData = async (): Promise<DashboardData> => {
    // Promise.allで複数のAPIを並行して実行
    const [eggList, inventoryList, deadChickenList, shipmentList, env] = await Promise.all([
        fetchEggData(),
        fetchStockData(),
        fetchDeadChickenData(),
        fetchShipmentData(),
        fetchEnvironment()
    ]);

    // --- 【日付判定用: JSTで「今日」の00:00:00を計算】 ---
    const now = new Date();
    const startOfTodayJST = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); 
    
    // --- 【卵データの集計とリスト ✅ 修正】 ---
    let totalCountToday = 0;
    const todayEggRecords: EggRecord[] = [];
    eggList.forEach(record => {
        if (new Date(record.date).getTime() >= startOfTodayJST) {
            totalCountToday += record.count;
            todayEggRecords.push(record);
        }
    });
    // 最新の3件をリスト表示用に選出
    const latestEggRecords = todayEggRecords
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
    
    // --- 【死んだ鶏データの集計とリスト ✅ 修正】 ---
    let totalDeadChickenToday = 0;
    const todayDeadChickenRecords: DeadChickenRecord[] = [];
    deadChickenList.forEach(record => {
        if (new Date(record.date).getTime() >= startOfTodayJST) {
            totalDeadChickenToday += record.count;
            todayDeadChickenRecords.push(record);
        }
    });
    // 最新の3件をリスト表示用に選出
    const latestDeadChickenRecords = todayDeadChickenRecords
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
    
    // --- 【出荷データの集計】 ---
    let totalShipmentCountToday = 0;
    const todayShipments: { customerName: string; count: number }[] = [];
    
    shipmentList.forEach(record => {
        // 出荷日が、JSTの「今日」の開始時間以降であれば集計
        if (new Date(record.shipment_date).getTime() >= startOfTodayJST) {
            totalShipmentCountToday += record.shipped_count;
            todayShipments.push({
                customerName: record.customer.name, // 結合された顧客名を使用
                count: record.shipped_count,
            });
        }
    });

    // --- 【在庫アラートの集計】 ---
    const lowStockItems: { name: string; remaining: number; threshold: number }[] = [];
    
    inventoryList.forEach(item => {
        if (item.remainingCount <= item.alertThreshold) {
            lowStockItems.push({ 
                name: item.ItemName, 
                remaining: item.remainingCount,
                threshold: item.alertThreshold
            });
        }
    });

    // --- 【最終的な DashboardData の構築】 ---
    return {
        eggCountToday: totalCountToday,
        latestEggRecords: latestEggRecords,
        chickenDeathCountToday: totalDeadChickenToday,
        latestDeadChickenRecords: latestDeadChickenRecords,
        totalShipmentCountToday: totalShipmentCountToday, 
        latestShipments: todayShipments,                  
        lowStockItemsCount: lowStockItems.length,
        lowStockItems: lowStockItems,
        airTemperature: env.airTemperature,
        humidity: env.humidity,
        waterTemperature: env.waterTemperature,
    };
};



export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const dashboardData = await fetchDashboardData();
            setData(dashboardData);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("ダッシュボードデータの読み込み中に不明なエラーが発生しました。");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    if (loading) {
        return <LoadingScreen message="鶏舎データ集計中・・・" />;
    }

    if (error) {
        return <div className={styles.errorText}>エラー: {error}</div>;
    }

    return (
        <LeftPullTab>
            <div className={commonStyles.container}>
                <h1 className={commonStyles.title}>こっこふぁくとりー/ダッシュボード</h1>

                {/* 1. メインコンテンツ (4分割グリッド) */}
                <div className={styles.mainContentGrid}>
                    
                    {/* ========== パネル 1: 産卵記録 (生産 KPI) ========== */}
                    <div className={styles.infoPanel}>
                        <h2>🥚 今日の産卵総数</h2>
                        <div className={styles.kpiSummary}>
                            <div className={styles.kpiValue}>{data ? data.eggCountToday.toLocaleString() : "—"}</div>
                            <div className={styles.kpiLabel}>(個)</div>
                        </div>
                        <div className={styles.listTitle}>— 最新の記録 —</div>
                        <ul className={styles.dataList}>
                            {!data || data.latestEggRecords.length === 0 ? (
                                <li className={styles.dataItem} style={{ color: '#5D4037' }}>最新の産卵記録はありません。</li>
                            ) : (
                                data.latestEggRecords.map((record, index) => {
                                    // 記録時間 (ISO Date stringから抽出)
                                    const recordTime = new Date(record.date).toLocaleTimeString('ja-JP', { 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                    });
                                    return (
                                        <li key={record.id || index} className={styles.dataItem}>
                                            <span className={styles.alertName}>鶏舎 {record.coop_number} ({recordTime})</span>
                                            <span>{record.count.toLocaleString()} 個</span>
                                        </li>
                                    );
                                })
                            )}
                        </ul>
                    </div>


                    {/* ========== パネル 3: 出荷状況 (流通 KPI) ========== */}
                    <div className={styles.infoPanel}>
                        <h2>🚚 本日の出荷リスト</h2>
                        <div className={styles.kpiSummary}>
                            <div className={styles.kpiLabel}>総数　　</div>
                            <div className={styles.kpiValue}>{data ? data.totalShipmentCountToday.toLocaleString() : "—"}</div>
                            <div className={styles.kpiLabel}>　(個)</div>
                        </div>

                        <div className={styles.listTitle}>— 本日の出荷先 —</div>
                        <ul className={styles.dataList}>
                            {!data || data.latestShipments.length === 0 ? (
                                <li className={styles.dataItem}>今日、まだ出荷記録はありません。</li>
                            ) : (
                                data.latestShipments.map((shipment, index) => (
                                    <li key={index} className={styles.dataItem}>
                                        <span className={styles.shipmentName}>{shipment.customerName}</span>
                                        <span className={styles.shipmentCount}>{shipment.count.toLocaleString()} 個</span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>

                    <div className={styles.infoPanel}>
                        <h2>⚠️ 在庫アラート</h2> 
                        <div className={styles.kpiSummary}>
                          <div className={styles.kpiLabel}>低在庫品目数　　</div>
                            <div className={`${styles.kpiValue} ${data && data.lowStockItems.length > 0 ? styles.alertCount : ''}`}>
                                {data ? data.lowStockItems.length.toLocaleString() : "—"}
                            </div>
                            <div className={styles.kpiLabel}>　(品目)</div>
                        </div>
                        
                        <div className={styles.listTitle}>— 低在庫品目 (各品目設定値未満) —</div>
                        <ul className={styles.dataList}>
                            {!data || data.lowStockItems.length === 0 ? (
                                <li className={styles.dataItem} style={{ color: '#5D4037' }}>在庫は十分です。</li>
                            ) : (
                                data.lowStockItems.map((item, index) => (
                                    <li key={index} className={styles.dataItem}>
                                        <span className={styles.alertName}>{item.name}</span>
                                        <span className={styles.alertCount}>
                                            残り: {item.remaining.toLocaleString()} (基準値: {item.threshold.toLocaleString()})
                                        </span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>

                     <div className={styles.infoPanel}>
                        <h2>💀 本日の死んだ羽数</h2>
                        <div className={styles.kpiSummary}>
                            <div className={`${styles.kpiValue} ${data && data.chickenDeathCountToday > 0 ? styles.alertCount : ''}`}>
                                {data ? data.chickenDeathCountToday.toLocaleString() : "—"}
                            </div>
                            <div className={styles.kpiLabel}> (羽)</div> 
                        </div>

                        <div className={styles.listTitle}>— 最新の記録 -</div>
                        <ul className={styles.dataList}>
                             {!data || data.latestDeadChickenRecords.length === 0 ? (
                                <li className={styles.dataItem} style={{ color: '#5D4037' }}>最新の死亡記録はありません。</li>
                             ) : (
                                data.latestDeadChickenRecords.map((record, index) => (
                                    <li key={record.id || index} className={styles.dataItem}>
                                        <span className={styles.alertName}>鶏舎 {record.coop_number} | {record.cause_of_death}</span>
                                        <span className={styles.alertCount}>{record.count.toLocaleString()} 羽</span>
                                    </li>
                                ))
                             )}
                        </ul>
                    </div>

                </div>

                {/* 2. 環境モニタリングセクション (下部フル幅) - レイアウト修正 */}
                <div className={styles.environmentSection}>
                    
                    {/* 2-A. 左端: 制御パネル (鶏舎・カメラ選択) - 維持 */}
                    <div className={styles.envControlPanel}>
                        <div className={styles.selectGroup}>
                            <span className={styles.selectLabel}>鶏舎番号</span>
                            <select className={styles.selectControl}>
                                {/* 画像のドロップダウンメニューを再現 */}
                                <option>5号舎</option>
                                <option>6号舎</option>
                                <option>7号舎</option>
                                <option>8号舎</option>
                                <option>15号舎</option>
                                {/* ... 15号舎まで続く ... */}
                            </select>
                        </div>
                    </div>
                    
                    {/* 2-B. 右側全体: データ表示パネル (KPI & 映像) */}
                    <div className={styles.envDataPanel}>
                        
                        {/* 🚨 1. 左側: 3つのKPIを縦に並べる */}
                        <div className={styles.kpiColumn}>
                            
                            {/* 🌡️ 気温 (赤色: 警告) */}
                            <div className={`${styles.envKpiCard} ${styles.kpiAlertRed}`}>
                                <span className={styles.kpiLabelEnv}>気温</span>
                                <span className={styles.kpiValueEnv}>{data?.airTemperature}<span style={{ fontSize: '0.6em' }}>°C</span></span>
                            </div>

                            {/* 🌿 2. 湿度 (緑色: 正常) */}
                            <div className={`${styles.envKpiCard} ${styles.kpiNormalGreen}`}>
                                <span className={styles.kpiLabelEnv}>湿度</span>
                                <span className={styles.kpiValueEnv}>{data?.humidity}<span style={{ fontSize: '0.6em' }}>%</span></span>
                            </div>

                            {/* 💧 3. 飲水温 (黄色: 注意) */}
                            <div className={`${styles.envKpiCard} ${styles.kpiWarningYellow}`}>
                                <span className={styles.kpiLabelEnv}>飲水温</span>
                                <span className={styles.kpiValueEnv}>{data?.waterTemperature}<span style={{ fontSize: '0.6em' }}>°C</span></span>
                            </div>
                        </div>

                        {/* 🐔 2. 右側: 映像表示エリア */}
                        <div className={styles.envVideoPanel}>
                            <div className={styles.cameraMessage}>異常なし</div>
                            {/* 画像通りの鶏のイラストを再現 */}
                            <img src="/images/chicken.jpg" alt="鶏の映像" style={{ width: '150px', height: 'auto' }} />
                        </div>
                    </div>
                </div>

            </div>
        </LeftPullTab>
    );
}