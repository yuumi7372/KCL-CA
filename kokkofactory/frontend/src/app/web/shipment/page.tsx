"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LeftPullTab from "@components/LeftPullTab";
import commonStyles from '@components/styles/common.module.css';
import styles from './page.module.css'; 
import { useShipment } from '@components/ShipmentContext';
import LoadingScreen from "@components/LoadingScreen";

// APIから取得するデータの型を定義（配列を想定）
interface ShipmentDetails {
  vendor: string;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  shipmentDate: string;
  shippedCount: number;
}

export default function WebPage() {
  const { shipments, setShipments } = useShipment();
  //const [shipments, setShipments] = useState<ShipmentDetails[]>([]);
  const [loading, setLoading] = useState(shipments.length === 0); // Context にデータあるかで判定
  //const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); 

  const handleShowGraph = () => {
    router.push('/web/shipment/graph');
  };

  const handleNew = () => {
    router.push('/web/shipment/new');
  }

  useEffect(() => {
    const fetchShipments = async () => {
      if (shipments.length === 0) setLoading(true); 
      
      try {
        const response = await fetch('/api/shipment');
        if (!response.ok) {
          throw new Error('APIからデータの取得に失敗しました。');
        }
        const data: ShipmentDetails[] = await response.json();
        
        setShipments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'データの取得中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
    
  }, [setShipments]);

  if (loading) return <LoadingScreen message="データ読み込み中・・・" />;
  if (error) return <div>エラー: {error}</div>;

  return (
    <LeftPullTab>
      <div className ={commonStyles.container}>
        <h1 className={commonStyles.title}>こっこふぁくとりー/出荷履歴</h1>
        <p className={commonStyles.infoBox}>登録された出荷履歴を表示します。新規登録の場合は「新規追加」を、出荷履歴推移を閲覧する場合は「グラフ」を押してください。</p>
        <div className={styles.buttonContainer}>
          <div className={styles.buttonarea}>
            <button className={styles.button} onClick={handleShowGraph}>
              グラフ
            </button>
          </div>
          <div className={styles.buttonarea}>
            <button className={styles.button} onClick={handleNew}>
              新規追加
            </button>
          </div>
        </div>
        
        {shipments.length === 0 ? (
          <p>出荷情報がありません。</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.shipmentTable}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th>取引先</th>
                  <th>出荷日</th>
                  <th>出荷個数</th>
                  <th>住所</th>
                  <th>電話番号</th>
                  <th>メール</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment, index) => (
                  <tr key={index} className={styles.tableRow}>
                    <td>{shipment.vendor}</td>
                    <td>{new Date(shipment.shipmentDate).toLocaleDateString()}</td>
                    <td>{shipment.shippedCount}</td>
                    <td>{shipment.address || '情報なし'}</td>
                    <td>{shipment.phoneNumber || '情報なし'}</td>
                    <td>{shipment.email || '情報なし'}</td>
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