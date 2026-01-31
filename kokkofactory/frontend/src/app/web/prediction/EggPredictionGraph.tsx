//EggPredictionGraph.tsx
//メイン処理

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LeftPullTab from "@components/LeftPullTab"; 
import styles from './page.module.css'; 
import EggChart from "./EggChart";
import {
  GroupBy,
  makeKey,
  keyToDate,
  formatKeyLabel,
} from "./predictionUtils";
import { DUMMY_PREDICTION_DATA } from "./dummyData";
import commonStyles from '@components/styles/common.module.css';



export default function EggPredictionGraph() {
    const [rangeStart, setRangeStart] = useState<string>('');
    const [rangeEnd, setRangeEnd] = useState<string>('');
    const [groupBy, setGroupBy] = useState<GroupBy>("day"); 
    const [rangeEnabled, setRangeEnabled] = useState(false);
    const router = useRouter(); 

    // ★ 描画マウント状態の管理を追加
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // コンポーネントがマウントされたらtrueにし、Chart.jsの初期化を許可する
        setIsMounted(true);
    }, []);
    
    useEffect(() => {
        if (!rangeEnabled) {
            setRangeStart("");
            setRangeEnd("");
        }
    }, [rangeEnabled]);
    
    // 1. 期間指定で絞り込む
    const filteredDataByRange = useMemo(() => {
        if (!rangeEnabled || !rangeStart || !rangeEnd) return DUMMY_PREDICTION_DATA;
        const start = new Date(rangeStart);
        const end = new Date(rangeEnd);
        return DUMMY_PREDICTION_DATA.filter(d => {
            const dDate = new Date(d.date);
            return dDate >= start && dDate <= end;
        });
    }, [rangeEnabled, rangeStart, rangeEnd]);
    
    // 2. 選択された期間単位でデータを集計
    const { labels, datasets, sortedKeys } = useMemo(() => {
        const aggregatedMap = new Map<string, { pred: number, act: number, pot: number, count: number }>();
        filteredDataByRange.forEach(d => {
            const date = new Date(d.date);
            const key = makeKey(date, groupBy);
            const current = aggregatedMap.get(key) || { pred: 0, act: 0, pot: 0, count: 0 };
            aggregatedMap.set(key, {
                pred: current.pred + d.predictedCount,
                act: current.act + d.actualCount,
                pot: current.pot + d.cumulativePotential,
                count: current.count + 1
            });
        });
        const sortedKeys = Array.from(aggregatedMap.keys()).sort(
            (a, b) => keyToDate(a, groupBy).getTime() - keyToDate(b, groupBy).getTime()
        );
        const displayLabels = sortedKeys.map(k => formatKeyLabel(k, groupBy));
        const getAverage = (key: string, dataKey: 'pred' | 'act' | 'pot'): number => {
            const item = aggregatedMap.get(key);
            if (!item) return 0;
            return Math.round(item[dataKey] / item.count);
        };
        const datasets = [
            {
                label: '予測産卵数',
                data: sortedKeys.map(k => getAverage(k, 'pred')),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                yAxisID: 'y1',
                tension: 0.2,
                pointRadius: 4,
            },
            {
                label: '実績産卵数',
                data: sortedKeys.map(k => getAverage(k, 'act')),
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                yAxisID: 'y1',
                tension: 0.2,
                borderDash: [5, 5],
                pointRadius: 4,
            },
            {
                label: '累積快適ポテンシャル',
                data: sortedKeys.map(k => getAverage(k, 'pot')),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                yAxisID: 'y2',
                tension: 0.5,
                borderWidth: 1,
                pointRadius: 2,
            },
        ];
        return { labels: displayLabels, datasets, sortedKeys };
    }, [filteredDataByRange, groupBy]);
    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const },
            title: { 
                display: false, 
            },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) { label += ': '; }
                        if (context.parsed.y !== null) {
                            const unit = context.dataset.yAxisID === 'y1' ? ' 個' : ' pt';
                            label += context.parsed.y.toLocaleString() + unit;
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                title: { display: true, text: '日付' },
            },
            y1: {
                type: 'linear' as const,
                position: 'left' as const,
                title: { 
                    display: true, 
                    text: `産卵数 (平均)`, 
                    color: 'rgb(255, 99, 132)',
                    font: { size: 12 } 
                },
                min: 400,
                suggestedMax: 650,
                ticks: {
                    font: { size: 10 } 
                },
                grid: { drawOnChartArea: true },
            },
            y2: {
                type: 'linear' as const,
                position: 'right' as const,
                title: { 
                    display: true, 
                    text: '快適ポテンシャル (pt)', 
                    color: 'rgb(75, 192, 192)',
                    font: { size: 12 } 
                },
                min: 800,
                suggestedMax: 1500,
                ticks: {
                    font: { size: 10 } 
                },
                grid: { drawOnChartArea: false },
            },
        },
    }), [groupBy]);
    
    // 期間選択ボタンの切り替え処理
    const handleGroupByChange = (mode: GroupBy) => {
        setGroupBy(mode);
        setRangeEnabled(false);
    };
    // 指定期間チェックボックスのトグル
    const handleRangeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setRangeEnabled(checked);
        if (checked) {
            setGroupBy('day');
        }
    };
    
    return (
        <LeftPullTab> {/* ★ LeftPullTabでラップ */}
            <div className={commonStyles.container}>
                <h1 className={commonStyles.title}>産卵数予測</h1>
                <p className={commonStyles.infoBox}>このグラフは、過去7日間の気温データから計算された累積快適ポテンシャルに基づき、次期（日）の産卵数を予測するモデルを可視化</p>
                <div className={styles.mainContent}> 
                    <div className={styles.graphSection}>
                        {/* ▼ 期間選択UI */}
                        <div className={styles.controlPanel}>
                            <h3 className={styles.controlTitle}>💻 表示設定</h3>
                            {/* 日/週/月 の切り替えボタン */}
                            <div className={styles.tabGroup}>
                                {["day", "week", "month"].map((mode) => (
                                    <button
                                        key={mode}
                                        className={`${styles.tab} ${groupBy === mode && !rangeEnabled ? styles.active : ''}`}
                                        onClick={() => handleGroupByChange(mode as GroupBy)}
                                        disabled={rangeEnabled}
                                    >
                                        {mode === "day" ? "日別" : mode === "week" ? "週別" : "月別"}
                                    </button>
                                ))}
                            </div>
                            {/* 指定期間のチェックボックスと入力欄 */}
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>
                                    <input
                                        type="checkbox"
                                        checked={rangeEnabled}
                                        onChange={handleRangeToggle}
                                    />
                                    指定期間
                                </label>
                                {rangeEnabled && (
                                    <div className={styles.dateRange}>
                                        <input 
                                            type="date" 
                                            value={rangeStart} 
                                            onChange={(e) => setRangeStart(e.target.value)} 
                                            className={styles.dateInput} 
                                            placeholder="開始日"
                                        />
                                        <span>〜</span>
                                        <input 
                                            type="date" 
                                            value={rangeEnd} 
                                            onChange={(e) => setRangeEnd(e.target.value)} 
                                            className={styles.dateInput}
                                            placeholder="終了日"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* メイングラフエリア (左側、広め) */}
                        <div className={styles.chartWrapper}>
                            <h3 className={styles.controlTitle}>📊 期間別 産卵数予測とポテンシャルの推移</h3>
                            <div className={styles.chartContainer}>
                                <EggChart
                                    labels={labels}
                                    datasets={datasets}
                                    options={options}
                                    isMounted={isMounted}
                                />
                            </div>
                        </div>
                    </div>  
                    {/* モデル情報テーブルエリア (右側、狭め) */}
                    <div className={styles.modelInfoContainer}>
                        <h3 className={styles.controlTitle}>📝 モデルの基礎情報</h3>
                        <table className={styles.modelInfoTable}>
                            <tbody>
                                <tr><td>基準温度 (T_base)</td><td>15 °C</td></tr>
                                <tr><td>上限温度 (T_upper)</td><td>30 °C</td></tr>
                                <tr><td>感度係数 (A)</td><td>0.5</td></tr>
                                <tr><td>ベース産卵数 (B)</td><td>500 個</td></tr>
                            </tbody>
                        </table>
                        <p>
                            予測産卵数 = B + A × (累積快適ポテンシャル - 1100)
                            <br/>
                            ※ 累積快適ポテンシャル1100ptを基準に増減を予測しています。
                        </p>
                    </div>
                </div>
            </div>
        </LeftPullTab>
    );
}