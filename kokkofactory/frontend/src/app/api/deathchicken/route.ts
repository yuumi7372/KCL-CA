// frontend/src/app/api/deathchicken/route.ts
import { NextResponse } from "next/server";
import { adminDb, adminTimestamp } from "@/utils/firebase/server";

// --- POST: 死亡記録の作成 ---
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { coop_number, count, cause_of_death } = data;

    // 必須フィールドのチェック
    if (coop_number === undefined || count === undefined || !cause_of_death) {
      return NextResponse.json(
        { message: '鶏舎番号、死んだ羽数、および死因は必須です。' },
        { status: 400 }
      );
    }

    const coopNumberInt = Number(coop_number);
    const countInt = Number(count);

    // バリデーション
    if (
      isNaN(coopNumberInt) || isNaN(countInt) ||
      coopNumberInt < 1 || coopNumberInt > 9 || 
      countInt < 0 || typeof cause_of_death !== 'string' || cause_of_death.trim() === ''
    ) {
      return NextResponse.json(
        { message: '入力値が不正です。鶏舎番号は1-9、羽数は0以上の整数、死因は文字列である必要があります。' },
        { status: 400 }
      );
    }

    // Firestoreの "dead_chickens" コレクションに保存
    const docRef = await adminDb.collection("dead_chickens").add({
      coop_number: coopNumberInt,
      count: countInt,
      cause_of_death,
      date: adminTimestamp.now(),
    });

    return NextResponse.json(
      { message: '死んだ鶏の数を正常に記録しました！', id: docRef.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Firestore DeadChickenデータ保存エラー:', error);
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}

// --- GET: 死亡記録の一覧取得 ---
export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("dead_chickens")
      .orderBy("date", "desc")
      .get();

    const deadChickens = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Timestamp型をJSONで送れるように日付に変換しておくと親切だよ🌸
      date: doc.data().date?.toDate ? doc.data().date.toDate() : doc.data().date
    }));

    return NextResponse.json(deadChickens, { status: 200 });
  } catch (error) {
    console.error('Firestore DeadChickenデータ取得エラー:', error);
    return NextResponse.json(
      { message: '一覧データの取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// --- PUT: 死亡記録の更新 ---
export async function PUT(
    request: Request, 
    { params }: { params: { id: string } } // FirestoreのIDは文字列だよ
) {
    try {
        const id = params.id; 
        const data = await request.json();
        const { coop_number, count, cause_of_death } = data;

        if (!id) {
            return NextResponse.json({ message: '有効なIDが指定されていません。' }, { status: 400 });
        }

        const coopNumberInt = Number(coop_number);
        const countInt = Number(count);

        // バリデーション (POSTと共通)
        if (
            isNaN(coopNumberInt) || isNaN(countInt) ||
            coopNumberInt < 1 || coopNumberInt > 9 || 
            countInt < 0 || typeof cause_of_death !== 'string' || cause_of_death.trim() === ''
        ) {
            return NextResponse.json({ message: '入力値が不正です。' }, { status: 400 });
        }
        
        // 存在確認
        const deadChickenRef = adminDb.collection("dead_chickens").doc(id);
        const docSnap = await deadChickenRef.get();

        if (!docSnap.exists) {
          return NextResponse.json(
            { message: "指定された記録が見つかりません。" },
            { status: 404 }
          );
        }

        // データの更新
        await deadChickenRef.update({
            coop_number: coopNumberInt,
            count: countInt,
            cause_of_death: cause_of_death,
            updatedAt: adminTimestamp.now() // 更新時間も入れておくと便利！✨
        });

        return NextResponse.json(
            { message: `ID ${id} の死亡記録を正常に更新しました！` },
            { status: 200 }
        );

    } catch (error) {
        console.error('Firestore DeadChickenデータ更新エラー:', error);
        return NextResponse.json({ message: 'データの更新に失敗しました。' }, { status: 500 });
    }
}