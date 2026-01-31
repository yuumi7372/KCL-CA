"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import LeftPullTab from "@components/LeftPullTab";
import { useRouter } from "next/navigation";
import styles from "./page.module.css"; // CSSファイルをインポート
import commonStyles from '@components/styles/common.module.css';
import { MOCK_DATA } from "./marketingMockData"; // 💡 外部データファイルからインポート

// Chart.js 関連インポート
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import dynamic from "next/dynamic"; // 💡 ハイドレーションエラー対策

// Chart.jsのコンポーネントをクライアント側でのみレンダリング
const DynamicLine = dynamic(
  () => import("react-chartjs-2").then((mod) => mod.Line),
  { ssr: false }
);
const DynamicPie = dynamic(
  () => import("react-chartjs-2").then((mod) => mod.Pie),
  { ssr: false }
);

// Chart.js を登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const mockData = MOCK_DATA;

// グラフページのロジックを統合
export default function MarketingDashboard() {
  const router = useRouter();
  const shipments = mockData.dummyShipments;
  const totalSales = mockData.totalSales;

  // グラフ用のState
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const chartRef = useRef<ChartJS<"line", number[], string>>(null);
  const [groupBy, setGroupBy] = useState<"day" | "month" | "year">("month");
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");
  const [rangeEnabled, setRangeEnabled] = useState(false);

  useEffect(() => {
    if (!rangeEnabled) {
      setRangeStart("");
      setRangeEnd("");
    }
  }, [rangeEnabled]);

  const handleBack = () => {
    router.push("/web/marketing");
  };

  // 💡 ロジック開始: vendors (販売チャネルとして使用)
  const vendors = useMemo(
    () => Array.from(new Set(shipments.map((s) => s.vendor))),
    [shipments]
  );
  const allOptions = useMemo(() => ["総出荷数", ...vendors], [vendors]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>(allOptions);

  useEffect(() => {
    if (allOptions.length > 1 && selectedVendors.length === 0) {
      setSelectedVendors(allOptions);
    }
  }, [allOptions, selectedVendors.length]);

  // --- グラフ計算ヘルパーはそのまま ---
  const makeKey = (date: Date, mode: "day" | "month" | "year") => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    if (mode === "day") return `${y}-${m}-${d}`;
    if (mode === "month") return `${y}-${m}`;
    return `${y}`;
  };

  const keyToDate = (key: string, mode: "day" | "month" | "year") => {
    if (mode === "day") return new Date(`${key}T00:00:00`);
    if (mode === "month") {
      const [y, m] = key.split("-");
      return new Date(Number(y), Number(m) - 1, 1);
    }
    return new Date(Number(key), 0, 1);
  };

  const formatKeyLabel = (key: string, mode: "day" | "month" | "year") => {
    if (mode === "day") return keyToDate(key, "day").toLocaleDateString();
    if (mode === "month") {
      const [y, m] = key.split("-");
      return `${y}年${m}月`;
    }
    return `${key}年`;
  };

  const getColor = (i: number, alpha = 1) => {
    const hue = (i * 47) % 360;
    return `hsl(${hue} 70% 50% / ${alpha})`;
  };

  const filteredShipments = useMemo(() => {
    if (!rangeStart || !rangeEnd) return shipments;
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    return shipments.filter((s) => {
      const d = new Date(s.shipmentDate);
      return d >= start && d <= end;
    });
  }, [shipments, rangeStart, rangeEnd]);

  // --- 折れ線グラフ用集計処理 ---
  const { labels, datasets, sortedKeys } = useMemo(() => {
    const vendorMaps: Record<string, Map<string, number>> = {};
    vendors.forEach((v) => (vendorMaps[v] = new Map<string, number>()));
    const totalMap = new Map<string, number>();

    filteredShipments.forEach((s) => {
      const date = new Date(s.shipmentDate);
      const key = makeKey(date, groupBy);
      vendorMaps[s.vendor].set(
        key,
        (vendorMaps[s.vendor].get(key) ?? 0) + s.shippedCount
      );
      totalMap.set(key, (totalMap.get(key) ?? 0) + s.shippedCount);
    });

    const allKeys = new Set<string>();
    Object.values(vendorMaps).forEach((map) =>
      map.forEach((_, k) => allKeys.add(k))
    );
    totalMap.forEach((_, k) => allKeys.add(k));

    const sortedKeys = Array.from(allKeys).sort(
      (a, b) =>
        keyToDate(a, groupBy).getTime() - keyToDate(b, groupBy).getTime()
    );

    const displayLabels = sortedKeys.map((k) => formatKeyLabel(k, groupBy));

    const datasets = allOptions
      .filter((v) => selectedVendors.includes(v))
      .map((vendor, i) => {
        if (vendor === "総出荷数") {
          return {
            label: vendor,
            data: sortedKeys.map((k) => totalMap.get(k) ?? 0),
            borderColor: "rgba(0, 0, 0, 1)", // 黒で目立たせる
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            tension: 0,
          };
        }
        const idx = vendors.indexOf(vendor);
        return {
          label: vendor,
          data: sortedKeys.map((k) => vendorMaps[vendor].get(k) ?? 0),
          borderColor: getColor(idx, 1),
          backgroundColor: getColor(idx, 0.3),
          tension: 0,
        };
      });

    return { labels: displayLabels, datasets, sortedKeys };
  }, [filteredShipments, groupBy, vendors, selectedVendors, allOptions]);

  // --- 円グラフ（全期間）集計処理 ---
  const pieData = useMemo(() => {
    const vendorTotals = vendors.map((v) =>
      filteredShipments
        .filter((s) => s.vendor === v)
        .reduce((sum, s) => sum + s.shippedCount, 0)
    );

    return {
      labels: vendors,
      datasets: [
        {
          data: vendorTotals,
          backgroundColor: vendors.map((_, i) => getColor(i, 0.6)),
          borderColor: vendors.map((_, i) => getColor(i, 1)),
          borderWidth: 1,
        },
      ],
    };
  }, [filteredShipments, vendors]);

  // --- Chart.js Options ---
  const options = {
    responsive: true,
    maintainAspectRatio: false, // ← これ大事！！
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "販売チャネル別 出荷数/件数推移" },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "出荷数/件数" } },
      x: {
        title: {
          display: true,
          text:
            groupBy === "day" ? "日別" : groupBy === "month" ? "月別" : "年別",
        },
        grid: { display: true },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const dataset = context.dataset;
            const total = dataset.data.reduce(
              (sum: number, val: number) => sum + val,
              0
            );
            const value = context.raw;
            const percentage = ((value / total) * 100).toFixed(1) + "%";
            return `${context.label}: ${value} (${percentage})`;
          },
        },
      },
      legend: { position: "top" as const },
      title: { display: true, text: "期間全体" },
    },
  };

  const toggleVendor = (vendor: string) => {
    setSelectedVendors((prev) =>
      prev.includes(vendor)
        ? prev.filter((v) => v !== vendor)
        : [...prev, vendor]
    );
  };

  // --- レンダリング ---
  return (
    <LeftPullTab>
      <div className={commonStyles.container}>
        <h1 className={commonStyles.title}>こっこふぁくとりー/経営サポート</h1>
        <p className={commonStyles.infoBox}>販売チャネル別の出荷数・売上推移を分析できます。グラフの表示方法やフィルターを調整して、詳細なデータを確認してください。</p>
        {/* 1. 🔴 テーブルエリア (表 - 上部/幅いっぱい) */}
        <div className={styles.list}>
          {/* KPIサマリー */}
          <div
            className={styles.kpiSummarySection}
            style={{
              borderBottom: "1px solid #eee",
              paddingBottom: "20px",
              marginBottom: "20px",
            }}
          >
            <div className={styles.kpiCard}>
              <h2>売上総計</h2>
              <p className={styles.kpiValue}>¥{totalSales.toLocaleString()}</p>
            </div>
            <div className={styles.kpiCard}>
              <h2>注文件数総計</h2>
              <p className={styles.kpiValue}>
                {mockData.totalOrders.toLocaleString()} 件
              </p>
            </div>
          </div>

          <h3 className={styles.subHeading} style={{ marginTop: "20px" }}>
            販売チャネル別 集計 ({mockData.month})
          </h3>
          {/* 🔴 販売チャネル別テーブル */}
          <table className={styles.analysisTable}>
            <thead>
              {/* 💡 エラー解消済み: タグ間を詰めて記述 */}
              <tr className={styles.tableHeader}>
                <th>販売チャネル</th>
                <th>売上（円）</th>
                <th>件数（件）</th>
                <th>構成比</th>
              </tr>
            </thead>
            <tbody>
              {mockData.channelSummary.map((item, index) => (
                <tr key={index} className={styles.tableRow}>
                  <td>{item.channel}</td>
                  <td className={styles.dataNumeric}>
                    ¥{item.sales.toLocaleString()}
                  </td>
                  <td className={styles.dataNumeric}>
                    {item.orders.toLocaleString()}
                  </td>
                  <td className={styles.dataNumeric}>
                    {((item.sales / totalSales) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className={styles.tableTotal}>
                <td>合計</td>
                <td className={styles.dataNumeric}>
                  ¥{totalSales.toLocaleString()}
                </td>
                <td className={styles.dataNumeric}>
                  {mockData.totalOrders.toLocaleString()}
                </td>
                <td className={styles.dataNumeric}>100.0%</td>
              </tr>
            </tbody>
          </table>

          <h3 className={styles.subHeading} style={{ marginTop: "20px" }}>
            自社サイト内訳 ({mockData.month})
          </h3>
          {/* 🔴 自社サイト内訳テーブル */}
          <table className={`${styles.analysisTable} ${styles.breakdownTable}`}>
            <thead>
              {/* 💡 エラー解消済み: タグ間を詰めて記述 */}
              <tr className={styles.tableHeader}>
                <th>購入タイプ</th>
                <th>売上（円）</th>
                <th>件数（件）</th>
              </tr>
            </thead>
            <tbody>
              {mockData.ownSiteBreakdown.map((item, index) => (
                <tr key={index} className={styles.tableRow}>
                  <td>{item.type}</td>
                  <td className={styles.dataNumeric}>
                    ¥{item.sales.toLocaleString()}
                  </td>
                  <td className={styles.dataNumeric}>
                    {item.orders.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2. 🔴 グラフエリア (下部/折れ線と円グラフを横並び) */}
        <div className={styles.graphWrapper}>
          {/* 2-1. 折れ線グラフ (左側) */}
          <div className={styles.chartContainer}>
            {/* 💡 修正点: h1を削除し、タイトルテキストをh2に変更してサイズを調整 */}
            <h2 style={{ margin: "1rem", fontSize: "22px" }}>
              📈 年次推移グラフ（チャネル別 売上/件数）
            </h2>

            {/* ▼ 日/月/年の切り替えUI */}
            <div className={styles.tabGroup}>
              {["day", "month", "year"].map((mode) => (
                <button
                  key={mode}
                  className={`${styles.tab} ${
                    groupBy === mode ? styles.active : ""
                  }`}
                  onClick={() => setGroupBy(mode as any)}
                >
                  {mode === "day" ? "日別" : mode === "month" ? "月別" : "年別"}
                </button>
              ))}
            </div>

            {/* 期間指定UI */}
            <div style={{ margin: "1rem 0" }}>
              <label>
                <input
                  type="checkbox"
                  checked={rangeEnabled}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setRangeEnabled(isChecked);
                    if (isChecked) {
                      setGroupBy("day");
                    }
                  }}
                />
                期間指定
              </label>
              {rangeEnabled && (
                <span style={{ marginLeft: "1rem" }}>
                  開始日:
                  <input
                    type="date"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                  />
                  終了日:
                  <input
                    type="date"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                  />
                </span>
              )}
            </div>

            {/* フィルターUI */}
            <div style={{ marginBottom: "20px" }}>
              {allOptions.map((v) => (
                <label key={v} style={{ marginRight: "10px" }}>
                  <input
                    type="checkbox"
                    checked={selectedVendors.includes(v)}
                    onChange={() => toggleVendor(v)}
                  />
                  {v}
                </label>
              ))}
            </div>

            {/* 折れ線グラフ本体 */}
            
            {shipments.length === 0 ? (
              <p>まだ分析データがありません！</p>
            ) : (
              <div className={styles.lineChartWrapper}>
                <DynamicLine
                  ref={chartRef}
                  data={{ labels, datasets }}
                  options={{
                    ...options,
                    plugins: {
                      ...options.plugins,
                      title: {
                        display: true,
                        text: `販売チャネル別 出荷数/件数推移 (${
                          groupBy === "day"
                            ? "日別"
                            : groupBy === "month"
                            ? "月別"
                            : "年別"
                        })`,
                      },
                    },
                  }}
                  onClick={(e) => {
                    if (!chartRef.current) return;
                    const points = chartRef.current.getElementsAtEventForMode(
                      e.nativeEvent,
                      "nearest",
                      { intersect: true },
                      true
                    );
                    if (points.length > 0) {
                      const idx = points[0].index;
                      const key = sortedKeys[idx]; // 内部キーを保存
                      setSelectedKey(key);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* 2-2. 円グラフ (右側) */}
          <div
            className={styles.chartContainer}
            style={{ textAlign: "center" }}
          >
            {/* 💡 修正点: h1をh2に変更 */}
            <h2 style={{ margin: "1rem", fontSize: "22px" }}>
              📊 販売チャネル構成割合
            </h2>
            <h3 style={{ margin: "1rem", fontSize: "18px" }}>期間全体構成比</h3>
            {shipments.length > 0 ? (
              <div style={{ maxWidth: "400px", margin: "0 auto" }}>
                <DynamicPie data={pieData} options={pieOptions} />
              </div>
            ) : (
              <p style={{ color: "#999" }}>データがありません</p>
            )}
          </div>
        </div>
      </div>
    </LeftPullTab>
  );
}
