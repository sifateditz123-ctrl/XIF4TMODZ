import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import type {
  Coupon,
  Product,
  ProductDuration,
  UserProfile,
} from '../types/store';
import {
  calculateCouponDiscount,
  computeExpiryIso,
  maskDisplayName,
} from '../utils/storeLogic';
import { verifyPaymentAutomation } from './paymentService';

export async function validateCouponCode(
  code: string,
  subtotalBdt: number
): Promise<{ coupon: Coupon; discountBdt: number }> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) throw new Error('Enter a coupon code');

  let snap;
  try {
    const q = query(
      collection(db, 'coupons'),
      where('code', '==', cleanCode),
      where('active', '==', true),
      limit(1)
    );
    snap = await getDocs(q);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'coupons');
  }

  if (snap.empty) {
    throw new Error('Invalid or expired coupon code');
  }

  const couponDoc = snap.docs[0];
  const coupon = { id: couponDoc.id, ...couponDoc.data() } as Coupon;

  if (coupon.maxUses > 0 && (coupon.usageCount || 0) >= coupon.maxUses) {
    throw new Error('Coupon usage limit reached');
  }

  const discountBdt = calculateCouponDiscount(coupon, subtotalBdt);
  return { coupon, discountBdt };
}

async function pullAvailableKeys(
  productId: string,
  durationId: string,
  qty: number
) {
  try {
    const keysQuery = query(
      collection(db, 'licenseKeys'),
      where('productId', '==', productId),
      where('durationId', '==', durationId),
      where('status', '==', 'available'),
      limit(qty)
    );
    const snap = await getDocs(keysQuery);
    return snap.docs;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'licenseKeys');
  }
}

interface PurchaseInput {
  user: User;
  userProfile: UserProfile | null;
  product: Product;
  duration: ProductDuration;
  quantity: number;
  coupon: Coupon | null;
  discountBdt: number;
  totalAmountBdt: number;
}

export async function processWalletPurchase({
  user,
  userProfile,
  product,
  duration,
  quantity,
  coupon,
  discountBdt,
  totalAmountBdt,
}: PurchaseInput) {
  const availableKeyDocs = await pullAvailableKeys(
    product.id,
    duration.id,
    quantity
  );
  const hasAllKeys = availableKeyDocs.length >= quantity;

  const orderRef = doc(collection(db, 'orders'));
  const userRef = doc(db, 'users', user.uid);
  const txRef = doc(collection(db, 'transactions'));
  const recentRef = doc(collection(db, 'recentPurchases'));

  const deliveredKeys: string[] = [];
  const expiresAt = computeExpiryIso(Number(duration.hours) || 24);

  try {
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('User profile not found');
      const currentBalance = Number(userSnap.data().walletBalance || 0);
      if (currentBalance < totalAmountBdt) {
        throw new Error('Insufficient Wallet Balance. Please Add Balance first.');
      }

      if (hasAllKeys) {
        for (const kDoc of availableKeyDocs) {
          const freshKey = await transaction.get(kDoc.ref);
          if (!freshKey.exists() || freshKey.data().status !== 'available') {
            throw new Error('One of the license keys was just claimed. Please retry.');
          }
          deliveredKeys.push(String(freshKey.data().keyValue));
          transaction.update(kDoc.ref, {
            status: 'sold',
            soldToUid: user.uid,
            orderId: orderRef.id,
            soldAt: serverTimestamp(),
          });
        }
      }

      transaction.update(userRef, {
        walletBalance: currentBalance - totalAmountBdt,
        totalSpent: increment(totalAmountBdt),
        totalKeys: increment(hasAllKeys ? quantity : 0),
      });

      if (coupon?.id) {
        transaction.update(doc(db, 'coupons', coupon.id), {
          usageCount: increment(1),
        });
      }

      const orderStatus = hasAllKeys ? 'completed' : 'pending';

      transaction.set(orderRef, {
        userId: user.uid,
        userEmail: user.email || '',
        userName: userProfile?.displayName || user.displayName || 'User',
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl || '',
        durationId: duration.id,
        durationLabel: duration.label,
        durationHours: Number(duration.hours) || 24,
        quantity,
        unitPriceBdt: Number(duration.priceBdt),
        discountBdt: Number(discountBdt) || 0,
        couponCode: coupon?.code || '',
        totalAmountBdt: Number(totalAmountBdt),
        paymentMethod: 'wallet',
        trxId: `WALLET-${orderRef.id.slice(0, 8).toUpperCase()}`,
        status: orderStatus,
        deliveredKeys,
        expiresAt,
        createdAt: serverTimestamp(),
      });

      transaction.set(txRef, {
        userId: user.uid,
        type: 'purchase',
        title: `${product.name} (${duration.label} x${quantity})`,
        amountBdt: -Number(totalAmountBdt),
        method: 'wallet',
        status: orderStatus,
        createdAt: serverTimestamp(),
      });

      transaction.set(recentRef, {
        displayNameMasked: maskDisplayName(
          userProfile?.displayName || user.email || 'User'
        ),
        productName: product.name,
        productImage: product.imageUrl || '',
        durationLabel: duration.label,
        quantity,
        amountBdt: Number(totalAmountBdt),
        paymentMethod: 'wallet',
        createdAt: serverTimestamp(),
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Insufficient Wallet Balance')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, 'orders');
  }

  return {
    orderId: orderRef.id,
    status: hasAllKeys ? 'completed' : 'pending',
    deliveredKeys,
  };
}

export async function processGatewayPurchase({
  user,
  userProfile,
  product,
  duration,
  quantity,
  coupon,
  discountBdt,
  totalAmountBdt,
  paymentMethod,
  trxId,
}: PurchaseInput & { paymentMethod: string; trxId: string }) {
  if (!trxId || trxId.trim().length < 4) {
    throw new Error('Please enter a valid Transaction ID (TrxID)');
  }

  const verification = await verifyPaymentAutomation({
    method: paymentMethod,
    trxId,
    amountBdt: totalAmountBdt,
    type: 'order',
    userId: user.uid,
  });

  const deliveredKeys: string[] = [];

  if (verification.autoVerified) {
    const availableKeyDocs = await pullAvailableKeys(
      product.id,
      duration.id,
      quantity
    );
    if (availableKeyDocs.length >= quantity) {
      const orderRef = doc(collection(db, 'orders'));
      const expiresAt = computeExpiryIso(Number(duration.hours) || 24);

      try {
        await runTransaction(db, async (tx) => {
          for (const kDoc of availableKeyDocs) {
            deliveredKeys.push(String(kDoc.data().keyValue));
            tx.update(kDoc.ref, {
              status: 'sold',
              soldToUid: user.uid,
              orderId: orderRef.id,
              soldAt: serverTimestamp(),
            });
          }
          tx.update(doc(db, 'users', user.uid), {
            totalSpent: increment(totalAmountBdt),
            totalKeys: increment(quantity),
          });
          tx.set(orderRef, {
            userId: user.uid,
            userEmail: user.email || '',
            userName: userProfile?.displayName || 'User',
            productId: product.id,
            productName: product.name,
            productImage: product.imageUrl || '',
            durationId: duration.id,
            durationLabel: duration.label,
            durationHours: Number(duration.hours) || 24,
            quantity,
            unitPriceBdt: Number(duration.priceBdt),
            discountBdt: Number(discountBdt) || 0,
            couponCode: coupon?.code || '',
            totalAmountBdt: Number(totalAmountBdt),
            paymentMethod,
            trxId: trxId.trim(),
            status: 'completed',
            deliveredKeys,
            expiresAt,
            createdAt: serverTimestamp(),
          });
        });

        await addDoc(collection(db, 'recentPurchases'), {
          displayNameMasked: maskDisplayName(
            userProfile?.displayName || user.email || 'User'
          ),
          productName: product.name,
          productImage: product.imageUrl || '',
          durationLabel: duration.label,
          quantity,
          amountBdt: Number(totalAmountBdt),
          paymentMethod,
          createdAt: serverTimestamp(),
        });

        return { orderId: orderRef.id, status: 'completed', deliveredKeys };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'orders');
      }
    }
  }

  try {
    const orderDoc = await addDoc(collection(db, 'orders'), {
      userId: user.uid,
      userEmail: user.email || '',
      userName: userProfile?.displayName || user.displayName || 'User',
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl || '',
      durationId: duration.id,
      durationLabel: duration.label,
      durationHours: Number(duration.hours) || 24,
      quantity,
      unitPriceBdt: Number(duration.priceBdt),
      discountBdt: Number(discountBdt) || 0,
      couponCode: coupon?.code || '',
      totalAmountBdt: Number(totalAmountBdt),
      paymentMethod,
      trxId: trxId.trim(),
      status: 'pending',
      deliveredKeys: [],
      expiresAt: null,
      createdAt: serverTimestamp(),
    });

    if (coupon?.id) {
      await updateDoc(doc(db, 'coupons', coupon.id), {
        usageCount: increment(1),
      });
    }

    await addDoc(collection(db, 'transactions'), {
      userId: user.uid,
      type: 'purchase',
      title: `${product.name} (${duration.label} x${quantity})`,
      amountBdt: -Number(totalAmountBdt),
      method: paymentMethod,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    return {
      orderId: orderDoc.id,
      status: 'pending',
      deliveredKeys: [],
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'orders');
  }
}

export async function submitBalanceTopup({
  user,
  userProfile,
  method,
  amountBdt,
  trxId,
  senderNumber,
}: {
  user: User;
  userProfile: UserProfile | null;
  method: string;
  amountBdt: number;
  trxId: string;
  senderNumber?: string;
}) {
  if (!amountBdt || Number(amountBdt) < 10) {
    throw new Error('Minimum top-up amount is ৳10');
  }
  if (!trxId || trxId.trim().length < 4) {
    throw new Error('Please enter a valid Transaction ID (TrxID)');
  }

  const verification = await verifyPaymentAutomation({
    method,
    trxId,
    amountBdt: Number(amountBdt),
    type: 'topup',
    userId: user.uid,
  });

  if (verification.autoVerified) {
    try {
      await runTransaction(db, async (tx) => {
        const reqRef = doc(collection(db, 'balanceRequests'));
        const userRef = doc(db, 'users', user.uid);
        const txRef = doc(collection(db, 'transactions'));
        tx.update(userRef, { walletBalance: increment(Number(amountBdt)) });
        tx.set(reqRef, {
          userId: user.uid,
          userEmail: user.email || '',
          userName: userProfile?.displayName || 'User',
          method,
          amountBdt: Number(amountBdt),
          trxId: trxId.trim(),
          senderNumber: senderNumber?.trim() || '',
          status: 'approved',
          createdAt: serverTimestamp(),
        });
        tx.set(txRef, {
          userId: user.uid,
          type: 'topup',
          title: `Wallet Top-Up (${method.toUpperCase()})`,
          amountBdt: Number(amountBdt),
          method,
          status: 'completed',
          createdAt: serverTimestamp(),
        });
      });
      return { status: 'approved' };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'balanceRequests');
    }
  }

  try {
    await addDoc(collection(db, 'balanceRequests'), {
      userId: user.uid,
      userEmail: user.email || '',
      userName: userProfile?.displayName || user.displayName || 'User',
      method,
      amountBdt: Number(amountBdt),
      trxId: trxId.trim(),
      senderNumber: senderNumber?.trim() || '',
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'transactions'), {
      userId: user.uid,
      type: 'topup',
      title: `Wallet Top-Up (${method.toUpperCase()})`,
      amountBdt: Number(amountBdt),
      method,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    return { status: 'pending' };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'balanceRequests');
  }
}
