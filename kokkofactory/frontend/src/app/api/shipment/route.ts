import { NextResponse } from "next/server";
import { adminDb, adminTimestamp } from "@/utils/firebase/server";



// ====================
// GET: 出荷情報取得
// ====================
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const customerName = url.searchParams.get("customerName");

  try {
    // --- 1. 特定の取引先・特定の出荷 ---
    if (id && customerName) {
      const shipmentRef = adminDb
        .collection("customers")
        .doc(customerName)
        .collection("shipments")
        .doc(id);

      const shipmentSnap = await shipmentRef.get();
      const customerSnap = await adminDb.collection("customers").doc(customerName).get();

      if (!shipmentSnap.exists || !customerSnap.exists) {
        return NextResponse.json(
          { error: "指定された出荷情報が見つかりません。" },
          { status: 404 }
        );
      }

      const shipmentData = shipmentSnap.data()!;
      const customerData = customerSnap.data()!;

      return NextResponse.json({
        vendor: customerData.name,
        address: customerData.address,
        phoneNumber: customerData.phone_number,
        email: customerData.email,
        shipmentDate: shipmentData.shipment_date?.toDate(),
        shippedCount: shipmentData.shipped_count,
      });
    }

    // --- 2. 全出荷情報（collectionGroup） ---
    const snapshot = await adminDb
      .collectionGroup("shipments")
      .orderBy("shipment_date", "desc")
      .get();

    const shipments = await Promise.all(
      snapshot.docs.map(async (shipDoc) => {
        const shipmentData = shipDoc.data();

        const customerRef = shipDoc.ref.parent.parent;
        let customerData: any = {};

        if (customerRef) {
          const cSnap = await customerRef.get();
          customerData = cSnap.data() || {};
        }

        return {
          id: shipDoc.id,
          vendor: customerData.name || "不明な取引先",
          address: customerData.address,
          phoneNumber: customerData.phone_number,
          email: customerData.email,
          shipmentDate: shipmentData.shipment_date?.toDate(),
          shippedCount: shipmentData.shipped_count,
        };
      })
    );

    return NextResponse.json(shipments, { status: 200 });
  } catch (error) {
    console.error("Firestore Shipment取得エラー:", error);
    return NextResponse.json(
      { error: "データの取得に失敗しました。" },
      { status: 500 }
    );
  }
}

// ====================
// POST: 出荷情報作成
// ====================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName,
      phone_number,
      email,
      address,
      shipment_date,
      shipped_count,
    } = body;

    if (!customerName || shipped_count === undefined) {
      return NextResponse.json(
        { error: "Required fields are missing." },
        { status: 400 }
      );
    }

    const customerRef = adminDb.collection("customers").doc(customerName);
    const customerSnap = await customerRef.get();

    // 取引先がなければ作成（upsert）
    if (!customerSnap.exists) {
      await customerRef.set({
        name: customerName,
        phone_number: phone_number || null,
        email: email || null,
        address: address || null,
        createdAt: adminTimestamp.now(),
      });
    }

    // 出荷情報追加
    const shipmentRef = await customerRef.collection("shipments").add({
      shipped_count: Number(shipped_count),
      shipment_date: shipment_date
        ? adminTimestamp.fromDate(new Date(shipment_date))
        : adminTimestamp.now(),
    });

    return NextResponse.json(
      { id: shipmentRef.id, message: "Created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating new shipment:", error);
    return NextResponse.json(
      { error: "Failed to create new shipment." },
      { status: 500 }
    );
  }
}
