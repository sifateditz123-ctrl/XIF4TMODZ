import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  BadgePercent,
  Check,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import type { RoleInviteRecord, UserProfile, UserRole } from '../../types/store';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  clampResellerDiscount,
  emailToDocId,
} from '../../utils/storeLogic';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<RoleInviteRecord[]>([]);
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [emailInput, setEmailInput] = useState('');
  const [assignRole, setAssignRole] = useState<'admin' | 'reseller'>('reseller');
  const [discountInput, setDiscountInput] = useState('15');
  const [submitting, setSubmitting] = useState(false);

  const [editingDiscountUid, setEditingDiscountUid] = useState<string | null>(null);
  const [editingDiscountVal, setEditingDiscountVal] = useState('15');

  useEffect(() => {
    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(
      qUsers,
      (snap) => {
        setUsers(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<UserProfile, 'id'>),
          }))
        );
      },
      (err) => {
        console.error('Users listener error:', err);
        toast.error('Failed to load users directory');
      }
    );

    const qInvites = query(
      collection(db, 'roleInvites'),
      orderBy('createdAt', 'desc')
    );
    const unsubInvites = onSnapshot(
      qInvites,
      (snap) => {
        setInvites(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<RoleInviteRecord, 'id'>),
          }))
        );
      },
      (err) => {
        console.error('Role invites listener error:', err);
      }
    );

    return () => {
      unsubUsers();
      unsubInvites();
    };
  }, []);

  const counts = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === 'admin').length,
      resellers: users.filter((u) => u.role === 'reseller').length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const roleMatch = roleFilter === 'all' || u.role === roleFilter;
      const textMatch =
        !q ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.displayName || '').toLowerCase().includes(q);
      return roleMatch && textMatch;
    });
  }, [users, roleFilter, searchQuery]);

  const pendingInvites = useMemo(() => {
    const registeredEmails = new Set(
      users.map((u) => (u.email || '').trim().toLowerCase())
    );
    return invites.filter(
      (inv) => !registeredEmails.has((inv.email || '').trim().toLowerCase())
    );
  }, [invites, users]);

  const handleAssignByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = emailInput.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }

    const cleanDiscount =
      assignRole === 'reseller' ? clampResellerDiscount(Number(discountInput)) : 0;

    setSubmitting(true);
    try {
      const matchedUser = users.find(
        (u) => (u.email || '').trim().toLowerCase() === normalizedEmail
      );

      if (matchedUser?.uid || matchedUser?.id) {
        const uid = matchedUser.uid || matchedUser.id!;
        await updateDoc(doc(db, 'users', uid), {
          role: assignRole,
          resellerDiscountPct: cleanDiscount,
        });
      }

      const inviteId = emailToDocId(normalizedEmail);
      await setDoc(doc(db, 'roleInvites', inviteId), {
        email: normalizedEmail,
        role: assignRole,
        resellerDiscountPct: cleanDiscount,
        addedByEmail: currentUser?.email || '',
        createdAt: serverTimestamp(),
      });

      toast.success(
        matchedUser
          ? `${normalizedEmail} is now ${assignRole.toUpperCase()}!`
          : `Role invite saved! ${normalizedEmail} will get ${assignRole.toUpperCase()} access upon login.`
      );
      setEmailInput('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign role');
      handleFirestoreError(err, OperationType.WRITE, 'roleInvites');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (target: UserProfile, nextRole: UserRole) => {
    const targetEmailLower = (target.email || '').trim().toLowerCase();
    if (
      targetEmailLower === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase() &&
      nextRole !== 'admin'
    ) {
      toast.error('Primary owner admin cannot be demoted.');
      return;
    }

    const uid = target.uid || target.id!;
    const nextDiscount =
      nextRole === 'reseller'
        ? clampResellerDiscount(target.resellerDiscountPct || 15)
        : 0;

    try {
      await updateDoc(doc(db, 'users', uid), {
        role: nextRole,
        resellerDiscountPct: nextDiscount,
      });

      const inviteId = emailToDocId(targetEmailLower);
      if (nextRole === 'user') {
        await deleteDoc(doc(db, 'roleInvites', inviteId)).catch(() => {});
      } else {
        await setDoc(doc(db, 'roleInvites', inviteId), {
          email: targetEmailLower,
          role: nextRole,
          resellerDiscountPct: nextDiscount,
          addedByEmail: currentUser?.email || '',
          createdAt: serverTimestamp(),
        });
      }
      toast.success(`Updated ${target.email} to ${nextRole.toUpperCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Role update failed');
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleSaveResellerDiscount = async (target: UserProfile) => {
    const uid = target.uid || target.id!;
    const cleanPct = clampResellerDiscount(Number(editingDiscountVal));
    try {
      await updateDoc(doc(db, 'users', uid), {
        resellerDiscountPct: cleanPct,
      });
      const targetEmailLower = (target.email || '').trim().toLowerCase();
      await setDoc(doc(db, 'roleInvites', emailToDocId(targetEmailLower)), {
        email: targetEmailLower,
        role: 'reseller',
        resellerDiscountPct: cleanPct,
        addedByEmail: currentUser?.email || '',
        createdAt: serverTimestamp(),
      });
      setEditingDiscountUid(null);
      toast.success(`Reseller discount updated to ${cleanPct}%`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Discount update failed');
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleDeleteInvite = async (invite: RoleInviteRecord) => {
    try {
      await deleteDoc(doc(db, 'roleInvites', invite.id));
      toast.success(`Removed invite for ${invite.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove invite');
      handleFirestoreError(err, OperationType.DELETE, `roleInvites/${invite.id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="cyber-card rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
            <Users className="h-4 w-4 text-cyan-400" />
            <span>Total Users</span>
          </div>
          <p className="mt-1.5 font-mono text-xl font-extrabold tabular-nums text-white">
            {counts.total}
          </p>
        </div>

        <div className="cyber-card rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
            <ShieldCheck className="h-4 w-4 text-fuchsia-400" />
            <span>Admins</span>
          </div>
          <p className="mt-1.5 font-mono text-xl font-extrabold tabular-nums text-fuchsia-300">
            {counts.admins}
          </p>
        </div>

        <div className="cyber-card rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
            <Store className="h-4 w-4 text-emerald-400" />
            <span>Resellers</span>
          </div>
          <p className="mt-1.5 font-mono text-xl font-extrabold tabular-nums text-emerald-300">
            {counts.resellers}
          </p>
        </div>
      </div>

      {/* Add New Admin / Reseller Form */}
      <form
        onSubmit={handleAssignByEmail}
        className="cyber-card space-y-4 rounded-2xl p-4 sm:p-6"
      >
        <div>
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
            <UserPlus className="h-4 w-4 text-cyan-400" />
            Add New Admin or Reseller
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Works for both existing registered users and new emails (auto-activates when they sign in with a verified Google/email account).
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label
              htmlFor="assign-email"
              className="mb-1 block text-[11px] font-bold text-slate-400"
            >
              Email Address
            </label>
            <input
              id="assign-email"
              type="email"
              required
              placeholder="partner@gmail.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="assign-role"
              className="mb-1 block text-[11px] font-bold text-slate-400"
            >
              Role Type
            </label>
            <select
              id="assign-role"
              value={assignRole}
              onChange={(e) =>
                setAssignRole(e.target.value === 'admin' ? 'admin' : 'reseller')
              }
              className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-cyan-400"
            >
              <option value="reseller">Reseller</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {assignRole === 'reseller' && (
            <div className="sm:col-span-2">
              <label
                htmlFor="assign-discount"
                className="mb-1 block text-[11px] font-bold text-slate-400"
              >
                Discount %
              </label>
              <input
                id="assign-discount"
                type="number"
                min={0}
                max={80}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 font-mono text-xs font-bold text-emerald-300 outline-none focus:border-cyan-400"
              />
            </div>
          )}

          <div
            className={`flex items-end ${
              assignRole === 'reseller' ? 'sm:col-span-2' : 'sm:col-span-4'
            }`}
          >
            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-extrabold text-white shadow-neon-purple transition hover:brightness-110 disabled:opacity-50"
            >
              <UserCheck className="h-3.5 w-3.5" />
              {assignRole === 'admin' ? 'Add Admin' : 'Add Reseller'}
            </button>
          </div>
        </div>
      </form>

      {/* Pending Role Invites (not yet signed in) */}
      {pendingInvites.length > 0 && (
        <div className="cyber-card space-y-3 rounded-2xl p-4 sm:p-5">
          <h3 className="font-display text-sm font-bold text-amber-300">
            Pending Role Invites ({pendingInvites.length})
          </h3>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#090b14] px-3.5 py-2.5 text-xs"
              >
                <div>
                  <p className="font-bold text-white">{inv.email}</p>
                  <p className="text-[11px] text-slate-400">
                    Role:{' '}
                    <span className="font-bold uppercase text-cyan-300">
                      {inv.role}
                    </span>
                    {inv.role === 'reseller' && (
                      <span> · {inv.resellerDiscountPct}% Reseller Discount</span>
                    )}
                    <span> · Waiting for sign-in</span>
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove invite for ${inv.email}`}
                  onClick={() => handleDeleteInvite(inv)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registered Users, Admins & Resellers Directory */}
      <div className="cyber-card space-y-4 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-sm font-bold text-white">
            Manage Users, Admins & Resellers ({filteredUsers.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-slate-700 bg-[#090b14] py-1.5 pl-8 pr-3 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex gap-1 text-[11px]">
              {(['all', 'admin', 'reseller', 'user'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-lg px-2.5 py-1.5 font-bold uppercase ${
                    roleFilter === r
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {r === 'user' ? 'Customers' : r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            No matching accounts found.
          </p>
        ) : (
          <div className="space-y-2.5">
            {filteredUsers.map((u) => {
              const uid = u.uid || u.id!;
              const isPrimaryOwner =
                (u.email || '').trim().toLowerCase() ===
                BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

              return (
                <div
                  key={uid}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#090b14] p-3 text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white">
                        {u.displayName || 'Member'}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          u.role === 'admin'
                            ? 'bg-fuchsia-500/20 text-fuchsia-300'
                            : u.role === 'reseller'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {u.role}
                        {u.role === 'reseller' &&
                          ` · ${u.resellerDiscountPct || 0}% OFF`}
                      </span>
                    </div>
                    <p className="truncate text-slate-400">{u.email}</p>
                    <p className="font-mono text-[11px] text-cyan-300 tabular-nums">
                      Wallet: ৳{Math.round(u.walletBalance || 0)} · Spent: ৳
                      {Math.round(u.totalSpent || 0)} · Keys: {u.totalKeys || 0}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {u.role === 'reseller' &&
                      (editingDiscountUid === uid ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={80}
                            value={editingDiscountVal}
                            onChange={(e) => setEditingDiscountVal(e.target.value)}
                            className="w-14 rounded-lg border border-cyan-500/50 bg-[#0f1221] px-2 py-1 font-mono text-xs text-white"
                          />
                          <button
                            type="button"
                            aria-label="Save reseller discount"
                            onClick={() => handleSaveResellerDiscount(u)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDiscountUid(uid);
                            setEditingDiscountVal(
                              String(u.resellerDiscountPct ?? 15)
                            );
                          }}
                          className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/20"
                        >
                          <BadgePercent className="h-3.5 w-3.5" />
                          Edit %
                        </button>
                      ))}

                    <select
                      aria-label={`Change role for ${u.email}`}
                      disabled={isPrimaryOwner}
                      value={u.role || 'user'}
                      onChange={(e) =>
                        handleRoleChange(u, e.target.value as UserRole)
                      }
                      className="rounded-lg border border-slate-700 bg-[#0f1221] px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      <option value="user">Customer</option>
                      <option value="reseller">Reseller</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
