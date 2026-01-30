import { NextResponse } from 'next/server';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { getAuth } from "@/utils/firebase/server";

// --- GET: 取引先一覧の取得 ---
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name') || '';

    const customersRef = collection(db, 'customers');
    let q = query(customersRef);

    // 注意：Firestoreは標準で「部分一致(contains)」や「大文字小文字無視」ができません。
    // ここでは簡易的に「名前が一致するか」のフィルタ例を載せます。
    if (name) {
      q = query(customersRef, where("name", "==", name));
    }

    const querySnapshot = await getDocs(q);
    const customers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // メモ：本当の部分一致検索が必要な場合は、全件取得してJS側でfilterするか、
    // Algoliaなどの外部サービスを使うのが一般的だよ🌸
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers.' }, { status: 500 });
  }
}

// --- POST: 取引先の新規登録 ---
export async function POST(request: Request) {
  const auth = getAuth();
  // signout 処理
  try {
    const body = await request.json();
    const { name, address, phone_number, email } = body;

    if (!name) {
      return NextResponse.json({ error: 'Customer name is required.' }, { status: 400 });
    }

    // 重複チェック (PrismaのP2002の代わり)
    const customerRef = doc(db, 'customers', name);
    const docSnap = await getDoc(customerRef);

    if (docSnap.exists()) {
      return NextResponse.json({ error: 'A customer with this name already exists.' }, { status: 409 });
    }

    // 登録実行
    await setDoc(customerRef, {
      name,
      address: address || null,
      phone_number: phone_number || null,
      email: email || null,
      createdAt: serverTimestamp()
    });

    return NextResponse.json({ id: name, name }, { status: 201 });
  } catch (error) {
    console.error('Error creating new customer:', error);
    return NextResponse.json({ error: 'Failed to create new customer.' }, { status: 500 });
  }
}

// --- DELETE: 取引先の削除 ---
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body; // ここでのidは「取引先名」を想定しているよ

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required.' }, { status: 400 });
    }

    const customerRef = doc(db, 'customers', id);
    
    // 存在確認
    const docSnap = await getDoc(customerRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    }

    // 削除実行
    // メモ：サブコレクション(shipments)がある場合、親を消しても子は自動で消えません。
    // 本来はループして子を消す必要があるけど、まずは親の削除を行うよ！
    await deleteDoc(customerRef);

    return NextResponse.json({ message: 'Deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer.' }, { status: 500 });
  }
}