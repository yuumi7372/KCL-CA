import { NextResponse } from "next/server";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

// ====================
// GET: 在庫一覧取得
// ====================
export async function GET() {
  try {
    const snapshot = await db.collectionGroup("inventory").get();

    const inventoryList = await Promise.all(
      snapshot.docs.map(async (stockDoc) => {
        const stockData = stockDoc.data();
        const itemName = stockDoc.id;

        const supplierRef = stockDoc.ref.parent.parent;
        let supplierData: any = {};

        if (supplierRef) {
          const sSnap = await supplierRef.get();
          supplierData = sSnap.data() || {};
        }

        // threshold
        let alertThreshold = 100;
        if (supplierRef) {
          const thresholdSnap = await db
            .collection("suppliers")
            .doc(supplierRef.id)
            .collection("settings")
            .doc(itemName)
            .get();

          if (thresholdSnap.exists) {
            alertThreshold = thresholdSnap.data()!.alert_threshold;
          }
        }

        return {
          supplierName: supplierData.name || "不明な仕入れ先",
          ItemName: itemName,
          address: supplierData.address || "未登録",
          phoneNumber: supplierData.phone_number || "未登録",
          email: supplierData.email || "未登録",
          remainingCount: stockData.count || 0,
          alertThreshold,
        };
      })
    );

    return NextResponse.json(inventoryList, { status: 200 });
  } catch (error) {
    console.error("Firestore 在庫取得エラー:", error);
    return NextResponse.json(
      { error: "在庫情報の取得に失敗しました。" },
      { status: 500 }
    );
  }
}

// ====================
// POST: 在庫追加・更新
// ====================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      supplierName,
      ItemName,
      count,
      address,
      phoneNumber,
      email,
      alertThreshold,
    } = body;

    if (!supplierName || !ItemName || count === undefined) {
      return NextResponse.json(
        { error: "仕入れ先名、品目名、在庫数は必須だよ！" },
        { status: 400 }
      );
    }

    const supplierRef = db.collection("suppliers").doc(supplierName);

    // 仕入れ先 upsert
    await supplierRef.set(
      {
        name: supplierName,
        address: address || "未登録",
        phone_number: phoneNumber || "未登録",
        email: email || "未登録",
      },
      { merge: true }
    );

    const stockRef = supplierRef.collection("inventory").doc(ItemName);
    const stockSnap = await stockRef.get();

    if (!stockSnap.exists) {
      await stockRef.set({
        item_name: ItemName,
        count: Number(count),
      });
    } else {
      const current = stockSnap.data()!.count || 0;
      await stockRef.update({
        count: current + Number(count),
      });
    }

    // threshold 保存
    if (alertThreshold !== undefined) {
      await supplierRef
        .collection("settings")
        .doc(ItemName)
        .set(
          {
            alert_threshold: Number(alertThreshold),
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        );
    }

    return NextResponse.json(
      { message: `${ItemName} の在庫を更新したよ！✨` },
      { status: 201 }
    );
  } catch (error) {
    console.error("Firestore 保存エラー:", error);
    return NextResponse.json(
      { error: "保存に失敗しちゃった…" },
      { status: 500 }
    );
  }
}

// ====================
// PATCH: 在庫数直接修正
// ====================
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { supplierName, ItemName, newCount } = body;

    if (!supplierName || !ItemName || newCount === undefined) {
      return NextResponse.json(
        { error: "情報が足りないよ！" },
        { status: 400 }
      );
    }

    await db
      .collection("suppliers")
      .doc(supplierName)
      .collection("inventory")
      .doc(ItemName)
      .update({
        count: Number(newCount),
      });

    return NextResponse.json(
      { message: "在庫数を更新したよ！✨" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Firestore 在庫修正エラー:", error);
    return NextResponse.json(
      { error: "更新に失敗しました。" },
      { status: 500 }
    );
  }
}

// ====================
// DELETE: 在庫削除
// ====================
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { supplierName, ItemName } = body;

    if (!supplierName || !ItemName) {
      return NextResponse.json(
        { error: "削除に必要な情報が足りないよ！" },
        { status: 400 }
      );
    }

    await db
      .collection("suppliers")
      .doc(supplierName)
      .collection("inventory")
      .doc(ItemName)
      .delete();

    await db
      .collection("suppliers")
      .doc(supplierName)
      .collection("settings")
      .doc(ItemName)
      .delete();

    return NextResponse.json(
      { message: "削除に成功したよ！✨" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Firestore 削除エラー:", error);
    return NextResponse.json(
      { error: "削除に失敗しちゃった…" },
      { status: 500 }
    );
  }
}
