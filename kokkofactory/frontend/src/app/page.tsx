// src/app/page.tsx
"use client"; 

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css"
import { login, signup } from '@/app/auth/login/actions'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { auth } from '@/firebase'; // firebase.ts から

export default function WebPage() {
  const [mode, setMode] = useState<"login" | "help">("login");
  const router = useRouter();

  const isMobile = () => {
    if (typeof navigator === "undefined") return false;
    return /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent);
  };

  const handleModeSwitch = () => {
    setMode(mode === "login" ? "help" : "login");
  };

  const handleLogin = async (formData: FormData) => {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // ログイン成功後、直接リダイレクト
      router.push('/web');
    } catch (error) {
      alert(`ログインエラー: ${(error as Error).message}`);
    }
  };

  const handleSignup = async (formData: FormData) => {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // サインアップ成功後、直接リダイレクト
      router.push('/web');
    } catch (error) {
      alert(`サインアップエラー: ${(error as Error).message}`);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.logoWrapper}>
        <img src="/images/kokkologo.png" alt="こっこふぁくとりーロゴ" className={styles.logo} />
      </div>
      <div className={styles.main}>
        <form action={async (formData) => {
          if (mode === "login") {
            await handleLogin(formData);
          } else {
            await handleSignup(formData);
          }
        }}>
          <label htmlFor="email">Email:</label>
          <input id="email" name="email" type="email" required />
          <label htmlFor="password">パスワード：</label>
          <input id="password" name="password" type="password" required />

          <div className={styles.ctas}>
            <button className={styles.primary} type="submit">
              {mode === "login" ? "ログイン" : "新規登録"}
            </button>
          </div>
        </form>
        <p>デモページを見るときは URL に "/web" を追加してください</p>
      </div>

      <footer className={styles.footer}>
        <a href="#" onClick={handleModeSwitch}>
          {mode === "login" ? "ヘルプ" : "ログイン"}
        </a>
        <a href="#">プライバシー</a>
        <a href="#">お問い合わせ</a>
      </footer>
    </div>
  )
}