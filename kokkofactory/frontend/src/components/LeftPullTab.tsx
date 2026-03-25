// src/components/LeftPullTab.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import styles from './LeftPullTab.module.css';
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

const LeftPullTab = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // ⌨ ショートカットキー設定
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // input / textarea / contenteditable 中は無効
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      // Ctrl + B / Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault(); // ブラウザの太字ショートカット防止
        setOpen(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  // ボタンコンポーネントを共通化し、アクティブクラスを適用するヘルパー関数
  const NavButton = ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => {
    // 現在のパスとリンク先のパスが一致するかチェックします
    const isActive = pathname === href;

    return (
      <Link href={href}>
        {/* 一致する場合のみ 'activeButton' クラスを追加します */}
        <button className={`${styles.button} ${isActive ? styles.activeButton : ""}`}>
          {children}
        </button>
      </Link>
    );
  };

  return (
    <>
      {/* 左のプルタブ */}
      <div 
        className={styles.leftPullTab} 
        onClick={() => setOpen(!open)}
      >
        {open ? "閉じる" : "開く"}
      </div>

      {open && (
        <div
          className={styles.overlay}
          onClick={() => setOpen(false)}
        />
      )}
      {/* スライドメニュー */}
      <div className={`${styles.slideMenu} ${open ? styles.open : ""}`}>
        <h2>
          <Link href="/web">
            <img
              src="/images/kokkologo.png"
              alt="こっこふぁくとりーロゴ"
              className={styles.logo}
            />
          </Link>
        </h2>

        <NavButton href="/web">ダッシュボード</NavButton>
        <NavButton href="/web/chicken">産卵記録</NavButton>
        <NavButton href="/web/environment">環境モニタリング</NavButton>
        <NavButton href="/web/shipment">出荷履歴</NavButton>
        <NavButton href="/web/customers">取引先名簿</NavButton>
        <NavButton href="/web/stock">在庫</NavButton>
        <NavButton href="/web/prediction">予測</NavButton>
        <NavButton href="/web/marketing">経営サポート</NavButton>
        <LogoutButton className={styles.button} />
      </div>

      {/* ページ本体 */}
      <div className={`${styles.main} ${open ? styles.shifted : ""}`}>{children}</div>
    </>
  );
};

export default LeftPullTab;
