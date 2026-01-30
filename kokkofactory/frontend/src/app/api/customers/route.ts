import { NextResponse } from "next/server";
import { adminDb } from "@/utils/firebase/server";



// --- GET ---
export async function GET() {
  try {
    
    const snapshot = await adminDb.collection("customers").get();

    const customers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

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
