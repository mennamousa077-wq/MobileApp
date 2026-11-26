import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCNejkkiuS1iXOICzBN8plMPe-9Kkxg68Y",
  authDomain: "mobile-shop-b5122.firebaseapp.com",
  projectId: "mobile-shop-b5122",
  storageBucket: "mobile-shop-b5122.firebasestorage.app",
  messagingSenderId: "987134507712",
  appId: "1:987134507712:web:600e65836275ce581bcb25",
  measurementId: "G-XB77Y7LNF5"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export let analytics = null;
try {
  analytics = getAnalytics(app);
} catch {
  // Analytics may be blocked in certain environments or local file contexts
}

export const db = getFirestore(app);

// Collection references
export const COLLECTIONS = {
  PRODUCTS: "products",
  SALES: "sales",
  VODAFONE_LINES: "vodafoneLines",
  VODAFONE_TXS: "vodafoneTransactions",
  CATEGORIES: "categories",
  PERMISSIONS: "userPermissions"
};

export function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getMonthKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// Subscriptions
export function subscribeCollection(colName, callback, onError, orderField = "createdAt") {
  const colRef = collection(db, colName);
  const q = orderField ? query(colRef, orderBy(orderField, "desc")) : colRef;
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(items);
    },
    (error) => {
      console.error(`Firestore error (${colName}):`, error);
      if (onError) onError(error);
    }
  );
}

// Product CRUD
export async function createProduct(data) {
  const colRef = collection(db, COLLECTIONS.PRODUCTS);
  return addDoc(colRef, {
    ...data,
    purchasePrice: Number(data.purchasePrice) || 0,
    sellingPrice: Number(data.sellingPrice) || 0,
    quantity: Number(data.quantity) || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateProduct(id, data) {
  const docRef = doc(db, COLLECTIONS.PRODUCTS, id);
  return updateDoc(docRef, {
    ...data,
    purchasePrice: Number(data.purchasePrice) || 0,
    sellingPrice: Number(data.sellingPrice) || 0,
    quantity: Number(data.quantity) || 0,
    updatedAt: serverTimestamp()
  });
}

export async function removeProduct(id) {
  return deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));
}

// Atomic Sell Product (decrements inventory + logs sale)
export async function sellProductTransaction(productId, qty = 1) {
  const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
  const saleRef = doc(collection(db, COLLECTIONS.SALES));

  return runTransaction(db, async (transaction) => {
    const prodSnap = await transaction.get(productRef);
    if (!prodSnap.exists()) {
      throw new Error("الصنف غير موجود في قاعدة البيانات");
    }
    const prod = prodSnap.data();
    const currentQty = Number(prod.quantity) || 0;
    if (currentQty < qty) {
      throw new Error("الكمية المتوفرة غير كافية لإتمام البيع");
    }

    const sellingPrice = Number(prod.sellingPrice) || 0;
    const purchasePrice = Number(prod.purchasePrice) || 0;
    const totalAmount = sellingPrice * qty;
    const profit = (sellingPrice - purchasePrice) * qty;

    transaction.update(productRef, {
      quantity: currentQty - qty,
      updatedAt: serverTimestamp()
    });

    transaction.set(saleRef, {
      productId,
      productName: prod.name || "",
      category: prod.category || "",
      subCategory: prod.subCategory || "",
      barcode: prod.barcode || "",
      quantity: qty,
      purchasePrice,
      sellingPrice,
      totalAmount,
      profit,
      dateKey: getTodayKey(),
      createdAt: serverTimestamp()
    });

    return {
      productName: prod.name,
      totalAmount,
      profit,
      remainingQty: currentQty - qty
    };
  });
}

// Sales CRUD (Edit / Delete)
export async function updateSaleRecord(id, data) {
  const docRef = doc(db, COLLECTIONS.SALES, id);
  const qty = Number(data.quantity) || 1;
  const sellingPrice = Number(data.sellingPrice) || 0;
  const purchasePrice = Number(data.purchasePrice) || 0;
  return updateDoc(docRef, {
    ...data,
    quantity: qty,
    sellingPrice,
    purchasePrice,
    totalAmount: sellingPrice * qty,
    profit: (sellingPrice - purchasePrice) * qty,
    updatedAt: serverTimestamp()
  });
}

export async function removeSaleRecord(id) {
  return deleteDoc(doc(db, COLLECTIONS.SALES, id));
}

// Vodafone Cash Line Settings (1..18)
export async function saveVodafoneLineSettings(lineNumber, data) {
  const docRef = doc(db, COLLECTIONS.VODAFONE_LINES, `line-${lineNumber}`);
  return setDoc(
    docRef,
    {
      lineNumber: Number(lineNumber),
      phoneNumber: data.phoneNumber || "",
      balance: Number(data.balance) || 0,
      dailyLimit: Number(data.dailyLimit) || 60000,
      monthlyLimit: Number(data.monthlyLimit) || 200000,
      notes: data.notes || "",
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

// Vodafone Cash Transaction (Atomic balance update + tx log)
export async function addVodafoneTxTransaction(lineNumber, txData) {
  const lineRef = doc(db, COLLECTIONS.VODAFONE_LINES, `line-${lineNumber}`);
  const txRef = doc(collection(db, COLLECTIONS.VODAFONE_TXS));

  return runTransaction(db, async (transaction) => {
    const lineSnap = await transaction.get(lineRef);
    const currentData = lineSnap.exists()
      ? lineSnap.data()
      : {
          lineNumber: Number(lineNumber),
          phoneNumber: "",
          balance: 0,
          dailyLimit: 60000,
          monthlyLimit: 200000,
          notes: ""
        };

    const amount = Number(txData.amount) || 0;
    const commission = Number(txData.commission) || 0;
    const currentBalance = Number(currentData.balance) || 0;

    // 'in' (استلام / سحب للعميل -> يزيد رصيد المحفظة أو حسب نوع العملية؛ هنا استلام يزيد رصيد المحفظة، تحويل ينقص رصيد المحفظة)
    const newBalance =
      txData.type === "in" ? currentBalance + amount : currentBalance - amount;

    if (newBalance < 0) {
      throw new Error("رصيد المحفظة لا يكفي لإتمام عملية التحويل");
    }

    transaction.set(
      lineRef,
      {
        ...currentData,
        lineNumber: Number(lineNumber),
        balance: newBalance,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    transaction.set(txRef, {
      lineNumber: Number(lineNumber),
      type: txData.type, // 'in' | 'out'
      amount,
      commission,
      peerNumber: txData.peerNumber || "",
      notes: txData.notes || "",
      dateKey: getTodayKey(),
      monthKey: getMonthKey(),
      createdAt: serverTimestamp()
    });

    return { newBalance };
  });
}

// Edit / Delete Vodafone Transaction with balance adjustment
export async function updateVodafoneTxTransaction(txId, lineNumber, oldTx, newTx) {
  const lineRef = doc(db, COLLECTIONS.VODAFONE_LINES, `line-${lineNumber}`);
  const txRef = doc(db, COLLECTIONS.VODAFONE_TXS, txId);

  return runTransaction(db, async (transaction) => {
    const lineSnap = await transaction.get(lineRef);
    const currentBalance = lineSnap.exists() ? Number(lineSnap.data().balance) || 0 : 0;

    const oldDelta = oldTx.type === "in" ? Number(oldTx.amount) : -Number(oldTx.amount);
    const newDelta = newTx.type === "in" ? Number(newTx.amount) : -Number(newTx.amount);
    const adjustedBalance = currentBalance - oldDelta + newDelta;

    if (adjustedBalance < 0) {
      throw new Error("لا يمكن التعديل لأن الرصيد الناتج سيكون أقل من صفر");
    }

    transaction.set(
      lineRef,
      {
        lineNumber: Number(lineNumber),
        balance: adjustedBalance,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    transaction.update(txRef, {
      type: newTx.type,
      amount: Number(newTx.amount) || 0,
      commission: Number(newTx.commission) || 0,
      peerNumber: newTx.peerNumber || "",
      notes: newTx.notes || "",
      updatedAt: serverTimestamp()
    });
  });
}

export async function deleteVodafoneTxTransaction(txId, lineNumber, oldTx) {
  const lineRef = doc(db, COLLECTIONS.VODAFONE_LINES, `line-${lineNumber}`);
  const txRef = doc(db, COLLECTIONS.VODAFONE_TXS, txId);

  return runTransaction(db, async (transaction) => {
    const lineSnap = await transaction.get(lineRef);
    if (lineSnap.exists()) {
      const currentBalance = Number(lineSnap.data().balance) || 0;
      const oldDelta = oldTx.type === "in" ? Number(oldTx.amount) : -Number(oldTx.amount);
      const revertedBalance = Math.max(0, currentBalance - oldDelta);
      transaction.update(lineRef, {
        balance: revertedBalance,
        updatedAt: serverTimestamp()
      });
    }
    transaction.delete(txRef);
  });
}

// Categories CRUD
export async function createCategory(data) {
  return addDoc(collection(db, COLLECTIONS.CATEGORIES), {
    name: data.name || "",
    description: data.description || "",
    createdAt: serverTimestamp()
  });
}

export async function updateCategory(id, data) {
  return updateDoc(doc(db, COLLECTIONS.CATEGORIES, id), {
    name: data.name || "",
    description: data.description || "",
    updatedAt: serverTimestamp()
  });
}

export async function removeCategory(id) {
  return deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id));
}

// User Permissions CRUD
export async function createUserPermission(data) {
  return addDoc(collection(db, COLLECTIONS.PERMISSIONS), {
    userName: data.userName || "",
    role: data.role || "كاشير",
    permissions: data.permissions || [],
    active: data.active !== false,
    createdAt: serverTimestamp()
  });
}

export async function updateUserPermission(id, data) {
  return updateDoc(doc(db, COLLECTIONS.PERMISSIONS, id), {
    userName: data.userName || "",
    role: data.role || "كاشير",
    permissions: data.permissions || [],
    active: data.active !== false,
    updatedAt: serverTimestamp()
  });
}

export async function removeUserPermission(id) {
  return deleteDoc(doc(db, COLLECTIONS.PERMISSIONS, id));
}
