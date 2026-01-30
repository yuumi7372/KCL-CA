import { NextResponse } from "next/server";
import { adminDb, adminTimestamp } from "@/utils/firebase/server";

// --- PUT: 特定の死亡記録の更新 ---
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const data = await request.json();
    const { coop_number, count, cause_of_death } = data;

    if (!id) {
      return NextResponse.json(
        { message: "有効なIDが指定されていません。" },
        { status: 400 }
      );
    }

    if (coop_number === undefined || count === undefined || !cause_of_death) {
      return NextResponse.json(
        { message: "鶏舎番号、死んだ羽数、死因は必須です。" },
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
      countInt < 0 ||
      typeof cause_of_death !== "string" ||
      cause_of_death.trim() === ""
    ) {
      return NextResponse.json(
        { message: "入力値が不正です。" },
        { status: 400 }
      );
    }

    const deadChickenRef = adminDb
      .collection("dead_chickens")
      .doc(id);

    const docSnap = await deadChickenRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { message: `ID ${id} の死亡記録が見つかりませんでした。` },
        { status: 404 }
      );
    }

    await deadChickenRef.update({
      coop_number: coopNumberInt,
      count: countInt,
      cause_of_death,
      updatedAt: adminTimestamp.now(),
    });

    return NextResponse.json(
      { message: `ID ${id} の死亡記録を更新しました！` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Firestore DeadChicken更新エラー:", error);
    return NextResponse.json(
      { message: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}

// --- DELETE: 特定の死亡記録の削除 ---
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

    const deadChickenRef = adminDb
      .collection("dead_chickens")
      .doc(id);

    const docSnap = await deadChickenRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { message: "削除対象の記録が見つかりませんでした。" },
        { status: 404 }
      );
    }

    await deadChickenRef.delete();

    return NextResponse.json(
      { message: `ID ${id} の記録を削除しました。` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Firestore DeadChicken削除エラー:", error);
    return NextResponse.json(
      { message: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}
