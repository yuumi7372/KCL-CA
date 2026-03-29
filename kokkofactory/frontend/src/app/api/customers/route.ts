import { NextResponse } from "next/server";
import { adminDb } from "@/utils/firebase/server";

// --- GET ---
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    // クエリパラメータ取得（スマホのキーワード検索もここで処理）
    const name = url.searchParams.get("name")?.toLowerCase() || "";
    const address = url.searchParams.get("address")?.toLowerCase() || "";
    const phone_number = url.searchParams.get("phone_number")?.toLowerCase() || "";
    const email = url.searchParams.get("email")?.toLowerCase() || "";

    const snapshot = await adminDb.collection("customers").get();

    // 全件取得してからフィルター
    let customers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // スマホ版キーワード検索は OR 条件にする
    if (name) { // name にはスマホのキーワードが入っている
      const keyword = name.toLowerCase();
      customers = customers.filter((c: any) =>
        (c.name?.toLowerCase() || "").includes(keyword) ||
        (c.address?.toLowerCase() || "").includes(keyword) ||
        (c.phone_number?.toLowerCase() || "").includes(keyword) ||
        (c.email?.toLowerCase() || "").includes(keyword)
      );
    } else {
      // PC版の AND 条件
      customers = customers.filter((c: any) =>
        (c.name?.toLowerCase() || "").includes(name) &&
        (c.address?.toLowerCase() || "").includes(address) &&
        (c.phone_number?.toLowerCase() || "").includes(phone_number) &&
        (c.email?.toLowerCase() || "").includes(email)
      );
    }
    return NextResponse.json(customers);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// --- POST ---
export async function POST(request: Request) {
  try {

    const body = await request.json();
    const { name, address, phone_number, email } = body;

    if (!name) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const ref = adminDb.collection("customers").doc(name);
    const snap = await ref.get();

    if (snap.exists) {
      return NextResponse.json({ error: "Already exists" }, { status: 409 });
    }

    await ref.set({
      name,
      address: address ?? null,
      phone_number: phone_number ?? null,
      email: email ?? null,
      createdAt: new Date(),
    });

    return NextResponse.json({ id: name }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// --- DELETE ---
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const ref = adminDb.collection("customers").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ message: "Deleted" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
