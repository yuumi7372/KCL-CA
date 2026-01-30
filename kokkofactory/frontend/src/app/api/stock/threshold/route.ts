import { NextResponse } from "next/server";
import { adminDb, adminTimestamp } from "@/utils/firebase/server";

// --- PATCH: 品目名ごとのアラート基準値更新 ---
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { supplierName, ItemName, newThreshold } = body;

    if (!supplierName || !ItemName || newThreshold === undefined) {
      return NextResponse.json(
        { error: "項目が足りないよ！" },
        { status: 400 }
      );
    }

    // suppliers / {仕入れ先名} / settings / {品目名}
    const targetRef = adminDb
      .collection("suppliers")
      .doc(supplierName)
      .collection("settings")
      .doc(ItemName);

    // 🔥 update / create を気にせずこれ一発でOK
    await targetRef.set(
      {
        alert_threshold: newThreshold,
        updatedAt: adminTimestamp.now(),
      },
      { merge: true }
    );

    return NextResponse.json(
      { message: `${ItemName} の基準値を ${newThreshold} に更新したよ！✨` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Firestore更新エラー:", error);
    return NextResponse.json(
      { error: "更新に失敗しちゃった💦" },
      { status: 500 }
    );
  }
}
