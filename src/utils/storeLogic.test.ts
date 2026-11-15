import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCouponDiscount,
  calculatePayableTotal,
  capRecentPurchases,
  checkIsAdmin,
  clampResellerDiscount,
  computeExpiryIso,
  convertFromBdt,
  emailToDocId,
  formatCurrency,
  getEffectiveUnitPrice,
  getProductStartingPrice,
  maskDisplayName,
} from './storeLogic';
import type { RecentPurchase } from '../types/store';

test('formatCurrency converts BDT, USDT, and INR accurately', () => {
  const settings = { usdtRate: 120, inrRate: 1.5 };
  assert.equal(formatCurrency(600, 'BDT', settings), '৳600');
  assert.equal(formatCurrency(600, 'USDT', settings), '$5.00');
  assert.equal(formatCurrency(600, 'INR', settings), '₹400');
  assert.equal(convertFromBdt(240, 'USDT', settings), '2.00');
});

test('coupon discount and payable total handle percent and fixed discounts safely', () => {
  assert.equal(calculateCouponDiscount({ type: 'percent', value: 10 }, 500), 50);
  assert.equal(calculateCouponDiscount({ type: 'fixed', value: 700 }, 500), 500);

  const summary = calculatePayableTotal({ priceBdt: 160 }, 2, {
    type: 'percent',
    value: 25,
  });
  assert.deepEqual(summary, {
    standardSubtotalBdt: 320,
    resellerSavingsBdt: 0,
    subtotalBdt: 320,
    discountBdt: 80,
    totalBdt: 240,
  });
});

test('reseller pricing applies percentage discount cleanly and clamps bounds', () => {
  assert.equal(clampResellerDiscount(95), 80);
  assert.equal(clampResellerDiscount(-5), 0);
  assert.equal(getEffectiveUnitPrice(200, 'user', 20), 200);
  assert.equal(getEffectiveUnitPrice(200, 'reseller', 20), 160);

  const summary = calculatePayableTotal(
    { priceBdt: 200 },
    2,
    { type: 'fixed', value: 20 },
    'reseller',
    25
  );
  assert.deepEqual(summary, {
    standardSubtotalBdt: 400,
    resellerSavingsBdt: 100,
    subtotalBdt: 300,
    discountBdt: 20,
    totalBdt: 280,
  });
});

test('emailToDocId encodes normalized email into valid Firestore ID characters', () => {
  const idA = emailToDocId('  User.Name+1@Example.COM ');
  const idB = emailToDocId('user.name+1@example.com');
  assert.equal(idA, idB);
  assert.match(idA, /^[0-9a-f]+$/);
});

test('capRecentPurchases strictly limits feed to maximum 20 items', () => {
  const items: RecentPurchase[] = Array.from({ length: 35 }, (_, idx) => ({
    id: `p_${idx}`,
    displayNameMasked: 'Usr***1',
    productName: 'Panel',
    durationLabel: '1 Day',
    quantity: 1,
    amountBdt: 160,
    paymentMethod: 'wallet',
  }));
  const capped = capRecentPurchases(items);
  assert.equal(capped.length, 20);
  assert.equal(capped[0].id, 'p_0');
  assert.equal(capped[19].id, 'p_19');
});

test('maskDisplayName protects user privacy', () => {
  assert.equal(maskDisplayName('Rifat'), 'Rif***t');
  assert.equal(maskDisplayName('Al'), 'A***');
});

test('getProductStartingPrice finds lowest tier price', () => {
  const min = getProductStartingPrice({
    durations: [
      { id: '1d', label: '1 Day', hours: 24, priceBdt: 160, inStock: true },
      { id: '1h', label: '1 Hour', hours: 1, priceBdt: 30, inStock: true },
      { id: '7d', label: '7 Days', hours: 168, priceBdt: 650, inStock: true },
    ],
  });
  assert.equal(min, 30);
});

test('checkIsAdmin grants access to role=admin, bootstrapped admin, and configured emails', () => {
  assert.equal(checkIsAdmin('xif4t8@gmail.com', 'user', []), true);
  assert.equal(checkIsAdmin('other@example.com', 'admin', []), true);
  assert.equal(checkIsAdmin('staff@sifatmodz.com', 'user', ['staff@sifatmodz.com']), true);
  assert.equal(checkIsAdmin('guest@example.com', 'user', []), false);
});

test('computeExpiryIso adds hours cleanly', () => {
  const base = Date.UTC(2026, 0, 1, 0, 0, 0);
  assert.equal(computeExpiryIso(24, base), '2026-01-02T00:00:00.000Z');
});
