"use client";

import { useState, useEffect, useCallback } from "react";
import LoadingScreen from "@components/LoadingScreen";
import LeftPullTab from "@components/LeftPullTab";
import styles from "./page.module.css";
import commonStyles from '@components/styles/common.module.css';
import { useRouter } from "next/navigation";

// 在庫情報の型定義
interface InventoryItem {
  supplierName: string;
  ItemName: string; // 🌸 大文字のIで統一
  address: string;
  phoneNumber: string;
  email: string;
  remainingCount: number;
  alertThreshold: number;
}

// フォームの入力値の型定義
interface NewStockForm {
  supplierName: string;
  count: string;
}

// --- API呼び出し関数 ---

const fetchInventory = async (): Promise<InventoryItem[]> => {
  const res = await fetch("/api/stock");
  if (!res.ok) {
    const errorBody = await res.json();
    throw new Error(`在庫の取得に失敗しました: ${errorBody.error || res.statusText}`);
  }
  return res.json();
};

const updateStock = async (supplierName: string, itemName: string, newCount: number) => {
  const payload = {
    supplierName: supplierName,
    ItemName: itemName, // 🌸 品目名もしっかり送るよ
    newCount: newCount,
  };

  const res = await fetch("/api/stock", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json();
    throw new Error(`更新に失敗しました: ${errorBody.error || res.statusText}`);
  }
  return res.json();
};

const updateAlertThreshold = async (supplierName: string, itemName: string, newThreshold: number) => {
  const payload = {
    supplierName: supplierName,
    ItemName: itemName, // 🌸 品目名もしっかり送るよ
    newThreshold: newThreshold,
  };

  const res = await fetch("/api/stock/threshold", {
    method: "PATCH", 
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json();
    throw new Error(`アラート基準値の更新に失敗しました: ${errorBody.error || res.statusText}`);
  }
  return res.json();
};

// --- メインコンポーネント ---

export default function StockPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [searchTerms, setSearchTerms] = useState({
    supplierName: "",
    itemName: "",
    address: "",
    phoneNumber: "",
    email: "",
    inventoryCount: "",
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 600);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  // 在庫読み込み
  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInventory();
      setInventory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const handleNew = () => {
    router.push('/web/stock/new');
  };

  // 在庫更新ハンドラ
  const handleUpdate = async (item: InventoryItem) => {
    const newCountStr = prompt(
      `${item.supplierName} の ${item.ItemName}（現在: ${item.remainingCount}）の新しい在庫数を入力してね🌸`
    );
    if (newCountStr === null) return;

    const newCount = parseInt(newCountStr, 10);
    if (isNaN(newCount) || newCount < 0) {
      alert("無効な入力だよ！0以上の数字を入れてね。");
      return;
    }

    setLoading(true);
    try {
      await updateStock(item.supplierName, item.ItemName, newCount);
      alert(`${item.ItemName} の在庫を更新したよ！✨`);
      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // 基準値更新ハンドラ
  const handleAlertUpdate = async (item: InventoryItem) => {
    const newThresholdStr = prompt(
      `${item.ItemName}（現在基準: ${item.alertThreshold}）の新しい基準値を入力してね🔔`
    );
    if (newThresholdStr === null) return;

    const newThreshold = parseInt(newThresholdStr, 10);
    if (isNaN(newThreshold) || newThreshold < 0) {
      alert("無効な入力だよ！");
      return;
    }

    setLoading(true);
    try {
      await updateAlertThreshold(item.supplierName, item.ItemName, newThreshold);
      alert(`${item.ItemName} の基準値を更新したよ！✨`);
      await loadInventory();
    } catch (err) {
      setError("基準値の更新に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // 検索・クリア処理
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchTerms((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setSearchTerms({ supplierName: "", itemName: "", address: "", phoneNumber: "", inventoryCount: "" , email: "" });
  };

  const filteredInventory = inventory.filter((item) => {
    return (
      item.supplierName.includes(searchTerms.supplierName) &&
      item.ItemName.includes(searchTerms.itemName) &&
      item.address.includes(searchTerms.address) &&
      item.phoneNumber.includes(searchTerms.phoneNumber) &&
      item.email.includes(searchTerms.email) &&
      (searchTerms.inventoryCount === "" || item.remainingCount.toString().includes(searchTerms.inventoryCount))
    );
  });

  //削除
  const deleteStock = async (supplierName: string, itemName: string) => {
  const res = await fetch("/api/stock", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ supplierName, ItemName: itemName }),
  });

  if (!res.ok) {
    const errorBody = await res.json();
    throw new Error(`削除に失敗しました: ${errorBody.error || res.statusText}`);
  }
  return res.json();
};
const handleDelete = async (item: InventoryItem) => {
  const confirmDelete = confirm(
    `【確認】\n${item.supplierName} の ${item.ItemName} を削除してもいいですか？\nこの操作は取り消せません。`
  );

  if (!confirmDelete) return;

  setLoading(true);
  try {
    await deleteStock(item.supplierName, item.ItemName);
    alert("削除が完了したよ！");
    await loadInventory(); // リストを再読み込み
  } catch (err) {
    setError(err instanceof Error ? err.message : "削除に失敗しました。");
  } finally {
    setLoading(false);
  }
};

  return (
    <LeftPullTab>
      <div className={commonStyles.container}>
        <h1 className={commonStyles.title}>こっこふぁくとりー/在庫</h1>
        <p className={commonStyles.infoBox}>登録された在庫情報を表示します。在庫の新規作成は「新規作成」ボタンを押してください。黄色の背景は在庫数が基準値を下回っていることを示します。</p>
        <div className={styles.buttonContainer}>
          <div className={styles.buttonarea}>
            <button className={styles.button} onClick={handleNew}>
              新規作成
            </button>
          </div>
        </div>

        {/* 検索フォーム */}
        <form className={styles.searchForm} onSubmit={(e) => e.preventDefault()}>
          {isMobile ? (
            // スマホはキーワード1つだけ
            <input
              type="text"
              name="supplierName"
              placeholder="キーワード検索"
              value={searchTerms.supplierName}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
          ) : (
            // PCはフル検索フォーム
            <>
              <input type="text" name="supplierName" placeholder="仕入れ先名" value={searchTerms.supplierName} onChange={handleSearchChange} className={styles.searchInput} />
              <input type="text" name="itemName" placeholder="品目名" value={searchTerms.itemName} onChange={handleSearchChange} className={styles.searchInput} />
              <input type="text" name="inventoryCount" placeholder="在庫数" value={searchTerms.inventoryCount} onChange={handleSearchChange} className={styles.searchInput} />
              <input type="text" name="address" placeholder="住所" value={searchTerms.address} onChange={handleSearchChange} className={styles.searchInput} />
              <input type="text" name="phoneNumber" placeholder="連絡先" value={searchTerms.phoneNumber} onChange={handleSearchChange} className={styles.searchInput} />
              <input type="text" name="email" placeholder="メール" value={searchTerms.email} onChange={handleSearchChange} className={styles.searchInput} />
            </>
          )}
          <button type="submit" className={styles.searchButton}>
            検索
          </button>
          <button type="button" onClick={handleClear} className={styles.clearButton}>クリア</button>
        </form>

        {loading ? (
          <LoadingScreen message="データ読み込み中・・・" />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.stockTable}>
              <thead className={styles.tableHeader}>
                <tr>
                  <th>仕入れ先</th>
                  <th>品目</th>
                  <th>在庫数</th>
                  <th>アラート基準値</th>
                  <th>住所</th>
                  <th>連絡先</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr><td colSpan={7}>在庫データがないよ</td></tr>
                ) : (
                  filteredInventory.map((item, index) => (
                    <tr key={index} className={styles.tableRow} style={item.remainingCount <= item.alertThreshold ? { backgroundColor: "#FFF9C4" } : {}}>
                      <td>{item.supplierName}</td>
                      <td>{item.ItemName}</td>
                      <td>{item.remainingCount.toLocaleString()}</td>
                      <td>{item.alertThreshold.toLocaleString()}</td>
                      <td>{item.address}</td>
                      <td>{item.phoneNumber} / {item.email}</td>
                      <td>
                        <button className={styles.updateButton} onClick={() => handleAlertUpdate(item)} style={{ marginRight: '8px' }}>🔔 基準値</button>
                        <button className={styles.updateButton} onClick={() => handleUpdate(item)}>🖊️ 更新</button>
                        <button className={styles.updateButton} onClick={() => handleDelete(item)} style={{ marginLeft: '8px' }}>🗑️ 削除</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {error && <div className={styles.errorText}>エラー: {error}</div>}
      </div>
    </LeftPullTab>
  );
}