import { NextResponse } from "next/server";
import { adminDb, adminTimestamp } from "@/utils/firebase/server";

// --- PUT: 特定の卵の記録を更新 ---
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const data = await request.json();
    const { coop_number, count } = data;

    if (!id) {
      return NextResponse.json(
        { message: "有効なIDが指定されていません。" },
        { status: 400 }
      );
    }

    if (coop_number === undefined || count === undefined) {
      return NextResponse.json(
        { message: "鶏舎番号と個数は必須です。" },
        { status: 400 }
      );
    }

    const coopNumberInt = Number(coop_number);
    const countInt = Number(count);

    if (
      isNaN(coopNumberInt) ||
      isNaN(countInt) ||
      coopNumberInt < 1 ||
      coopNumberInt > 9 ||
      countInt < 0
    ) {
      return NextResponse.json(
        { message: "入力値が不正です。" },
        { status: 400 }
      );
    }

    const eggRef = adminDb.collection("eggs").doc(id);
    const docSnap = await eggRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { message: `ID ${id} の卵の記録が見つかりませんでした。` },
        { status: 404 }
      );
    }

    await eggRef.update({
      coop_number: coopNumberInt,
      count: countInt,
      updatedAt: adminTimestamp.now(),
    });

    return NextResponse.json(
      { message: `ID ${id} の卵の記録を更新しました！` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Firestore Egg更新エラー:", error);
    return NextResponse.json(
      { message: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}

// --- DELETE: 特定の卵の記録を削除 ---
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json(
        { message: "有効なIDが指定されていません。" },
        { status: 400 }
      );
    }

    const eggRef = adminDb.collection("eggs").doc(id);
    const docSnap = await eggRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { message: "削除対象の記録が見つかりませんでした。" },
        { status: 404 }
      );
    }

    await eggRef.delete();

    return NextResponse.json(
      { message: `ID ${id} の記録を削除しました。` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Firestore Egg削除エラー:", error);
    return NextResponse.json(
      { message: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}
