"use client";

import { useEffect, useState } from "react";
import LeftPullTab from "@components/LeftPullTab";
import styles from "./page.module.css";
import LoadingScreen from "@components/LoadingScreen";
import commonStyles from '@components/styles/common.module.css';
import { useRouter } from "next/navigation";

interface Customer {
  id: number;
  name: string;
  address?: string | null;
  phone_number?: string | null;
  email?: string | null;
}

export default function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState({
    name: "",
    address: "",
    phone_number: "",
    email: "",
  });
  const router = useRouter(); 
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 600);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // スマホなら name を全部の検索項目にコピー
      const queryObj = isMobile
        ? {
            name: searchTerm.name,
            address: searchTerm.name,
            phone_number: searchTerm.name,
            email: searchTerm.name,
          }
        : searchTerm;

      const query = new URLSearchParams(queryObj).toString();
      const response = await fetch(`/api/customers?${query}`);
      if (!response.ok) throw new Error("Network response was not ok");

      const data: Customer[] = await response.json();
      setCustomers(data);
    } catch (err) {
      setError("Failed to fetch customers.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchTerm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };
  const handleNew = () => {
    router.push('/web/customers/new');
  };

  const handleClear = () => {
    // 検索条件を空の状態にリセット
    const emptySearchTerm = {
      name: "",
      address: "",
      phone_number: "",
      email: "",
    };
    setSearchTerm(emptySearchTerm);

    // 空の検索条件でfetchCustomersを呼び出す
    const query = new URLSearchParams(emptySearchTerm).toString();
    fetch(`/api/customers?${query}`)
      .then((res) => res.json())
      .then((data) => setCustomers(data))
      .catch((err) => console.error(err));
  };
  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`「${name}」を本当に削除しますか？`)) {
      try {
        const response = await fetch("/api/customers", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete customer.");
        }

        // 削除成功後、一覧を再取得して表示を更新
        fetchCustomers();
      } catch (err: any) {
        console.error(err);
        alert(`削除に失敗しました: ${err.message}`);
      }
    }
  };

  if (loading) {
    return <LoadingScreen message="ロード中・・・" />;
  }

  if (error) {
    return <p style={{ color: "red" }}>エラーが発生しました: {error}</p>;
  }

  return (
    <LeftPullTab>
      <div className={commonStyles.container}>
        <h1 className={commonStyles.title}>こっこふぁくとりー/取引先名簿</h1>
        <p className={commonStyles.infoBox}>登録された取引先を表示します。新規登録の場合は「新規作成」を押してください。</p>
        <div className={styles.buttonContainer}>
          <div className={styles.buttonarea}>
            <button className={styles.button} onClick={handleNew}>
              新規作成
            </button>
          </div>
        </div>

        {/* スマホかPCでフォーム切り替え */}
        <form onSubmit={handleSearch} className={styles.searchForm}>
          {isMobile ? (
            // スマホはキーワード1つだけ
            <input
              type="text"
              name="name"
              placeholder="検索キーワード"
              className={styles.searchInput}
              value={searchTerm.name}
              onChange={handleSearchChange}
            />
          ) : (
            // PCはフルフォーム
            <>
              <input
                type="text"
                name="name"
                placeholder="取引先"
                className={styles.searchInput}
                value={searchTerm.name}
                onChange={handleSearchChange}
              />
              <input
                type="text"
                name="address"
                placeholder="住所"
                className={styles.searchInput}
                value={searchTerm.address}
                onChange={handleSearchChange}
              />
              <input
                type="text"
                name="phone_number"
                placeholder="電話"
                className={styles.searchInput}
                value={searchTerm.phone_number}
                onChange={handleSearchChange}
              />
              <input
                type="text"
                name="email"
                placeholder="メール"
                className={styles.searchInput}
                value={searchTerm.email}
                onChange={handleSearchChange}
              />
            </>
          )}

          <button type="submit" className={styles.searchButton}>
            検索
          </button>
          <button
            type="button"
            onClick={handleClear}
            className={styles.clearButton}
          >
            クリア
          </button>
        </form>

        {customers.length === 0 ? (
          <p>取引先が見つかりませんでした。</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.customerTable}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th>取引先</th>
                  <th>住所</th>
                  <th>電話</th>
                  <th>メール</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className={styles.tableRow}>
                    <td>{customer.name}</td>
                    <td>{customer.address || "未登録"}</td>
                    <td>{customer.phone_number || "未登録"}</td>
                    <td>{customer.email || "未登録"}</td>
                    <td>
                      <span
                        className={styles.deleteIcon}
                        onClick={() => handleDelete(customer.id, customer.name)}
                      >
                        &#128465;
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </LeftPullTab>
  );
}
