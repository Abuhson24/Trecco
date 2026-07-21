'use client';
// Member wallet screen. Two states for the "Fund wallet" section:
//   - Not yet provisioned (no BVN/DOB on file): show a one-time identity
//     form; submitting calls /wallet/setup-identity, which saves the BVN/DOB
//     and provisions the real Xpress Wallet account in the same request.
//   - Provisioned: show the real dedicated account number, bank name, and
//     account name so the member knows exactly where to send a transfer.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface Balance {
  personalBalance: string;
  cooperativeSavings: string;
  providusAccountNumber: string;
  walletProvisioned: boolean;
  bankName: string | null;
  accountName: string | null;
}

interface Bank {
  code: string;
  name: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  createdAt: string;
}

// Types where money leaves the personal account (shown in red with a
// leading "-"); everything else is a credit (green, leading "+").
const DEBIT_TYPES = new Set(['MOVE_TO_SAVINGS', 'WITHDRAWAL', 'CARD_ISSUANCE_FEE']);

const TRANSACTION_LABELS: Record<string, string> = {
  FUNDING: 'Wallet funding',
  MOVE_TO_SAVINGS: 'Moved to savings',
  WITHDRAWAL: 'Sent to bank',
  LOAN_DISBURSEMENT: 'Loan disbursed',
  LOAN_REPAYMENT: 'Loan repayment',
  CARD_ISSUANCE_FEE: 'Card issuance fee',
  WALLET_TRANSFER: 'Trecco transfer',
};

async function api(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('trecco_token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
  return res.json();
}

function formatNaira(value: string | number) {
  return `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const inputStyle = {
  display: 'block',
  width: '100%',
  height: 36,
  borderRadius: 8,
  border: '1px solid #2a2a2e',
  background: '#0b0b0d',
  color: '#f5f5f5',
  padding: '0 10px',
  boxSizing: 'border-box',
  marginBottom: 10,
} as const;

function sendTabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    height: 32,
    borderRadius: 6,
    border: active ? '1px solid #8a1414' : '1px solid #2a2a2e',
    background: active ? 'rgba(138,20,20,0.15)' : 'transparent',
    color: '#f5f5f5',
    fontSize: 12,
    cursor: 'pointer',
  };
}

function primaryButtonStyle(busy: boolean): React.CSSProperties {
  return {
    width: '100%',
    height: 38,
    borderRadius: 8,
    border: 'none',
    background: '#8a1414',
    color: '#fff',
    fontWeight: 500,
    cursor: busy ? 'default' : 'pointer',
    opacity: busy ? 0.7 : 1,
  };
}

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [amount, setAmount] = useState('');
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bvn, setBvn] = useState('');
  const [dob, setDob] = useState('');
  const [settingUp, setSettingUp] = useState(false);
  const [copied, setCopied] = useState(false);

  const [sendMode, setSendMode] = useState<'bank' | 'trecco'>('bank');
  const [banks, setBanks] = useState<Bank[]>([]);

  const [withdrawSortCode, setWithdrawSortCode] = useState('');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNarration, setWithdrawNarration] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const [treccoContact, setTreccoContact] = useState('');
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [resolvingRecipient, setResolvingRecipient] = useState(false);
  const [treccoAmount, setTreccoAmount] = useState('');
  const [sendingToTrecco, setSendingToTrecco] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txPerPage] = useState(10);
  const [txTotal, setTxTotal] = useState(0);

  async function load() {
    try {
      setBalance(await api('/wallet/balance'));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function loadBanks() {
    try {
      const data = await api('/wallet/banks');
      setBanks(data.banks ?? []);
    } catch {
      // Non-fatal — bank dropdown just stays empty if this fails.
    }
  }

  async function loadTransactions(page: number) {
    try {
      const data = await api(`/wallet/transactions?page=${page}&perPage=${txPerPage}`);
      setTransactions(data.transactions ?? []);
      setTxTotal(data.total ?? 0);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!requireAuth(router)) return;
    load();
    loadBanks();
    loadTransactions(1);
  }, []);

  useEffect(() => {
    loadTransactions(txPage);
  }, [txPage]);

  async function setupIdentity() {
    if (!bvn || bvn.length !== 11) {
      setError('Enter a valid 11-digit BVN');
      return;
    }
    if (!dob) {
      setError('Enter your date of birth');
      return;
    }
    setSettingUp(true);
    setError(null);
    try {
      const updated = await api('/wallet/setup-identity', {
        method: 'POST',
        body: JSON.stringify({ bvn, dateOfBirth: dob }),
      });
      setBalance(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSettingUp(false);
    }
  }

  async function moveToSavings() {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError('Enter a valid amount greater than zero');
      return;
    }
    setMoving(true);
    setError(null);
    try {
      const updated = await api('/wallet/move-to-savings', {
        method: 'POST',
        body: JSON.stringify({ amount: parsed }),
      });
      setBalance(updated);
      setAmount('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMoving(false);
    }
  }

  function copyAccountNumber() {
    if (!balance?.providusAccountNumber) return;
    navigator.clipboard.writeText(balance.providusAccountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function resolveAccount() {
    if (!withdrawSortCode || withdrawAccountNumber.length !== 10) return;
    setResolvingAccount(true);
    setError(null);
    try {
      const data = await api(`/wallet/resolve-account?sortCode=${withdrawSortCode}&accountNumber=${withdrawAccountNumber}`);
      setResolvedName(data.account?.accountName ?? null);
    } catch (e: any) {
      setResolvedName(null);
      setError(e.message);
    } finally {
      setResolvingAccount(false);
    }
  }

  async function submitWithdraw() {
    const parsed = Number(withdrawAmount);
    if (!parsed || parsed <= 0) {
      setError('Enter a valid amount greater than zero');
      return;
    }
    if (!resolvedName) {
      setError('Confirm the destination account first');
      return;
    }
    setWithdrawing(true);
    setError(null);
    try {
      const updated = await api('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          amount: parsed,
          sortCode: withdrawSortCode,
          accountNumber: withdrawAccountNumber,
          accountName: resolvedName,
          narration: withdrawNarration || undefined,
        }),
      });
      setBalance(updated);
      setWithdrawAmount('');
      setWithdrawAccountNumber('');
      setWithdrawSortCode('');
      setWithdrawNarration('');
      setResolvedName(null);
      loadTransactions(1);
      setTxPage(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWithdrawing(false);
    }
  }

  async function resolveRecipient() {
    if (!treccoContact) return;
    setResolvingRecipient(true);
    setError(null);
    try {
      const data = await api(`/wallet/find-recipient?contact=${encodeURIComponent(treccoContact)}`);
      setRecipientName(data.fullName ?? null);
    } catch (e: any) {
      setRecipientName(null);
      setError(e.message);
    } finally {
      setResolvingRecipient(false);
    }
  }

  async function submitSendToTrecco() {
    const parsed = Number(treccoAmount);
    if (!parsed || parsed <= 0) {
      setError('Enter a valid amount greater than zero');
      return;
    }
    if (!recipientName) {
      setError('Confirm the recipient first');
      return;
    }
    setSendingToTrecco(true);
    setError(null);
    try {
      const updated = await api('/wallet/send-to-trecco', {
        method: 'POST',
        body: JSON.stringify({ recipientContact: treccoContact, amount: parsed }),
      });
      setBalance(updated);
      setTreccoAmount('');
      setTreccoContact('');
      setRecipientName(null);
      loadTransactions(1);
      setTxPage(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSendingToTrecco(false);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Wallet</h1>

      {!balance && !error && <p style={{ color: '#9a9a9f' }}>Loading…</p>}

      {balance && (
        <>
          <div
            style={{
              background: '#8a1414',
              borderRadius: 12,
              padding: '20px 24px',
              marginBottom: 16,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Personal account</p>
            <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 600, color: '#fff' }}>
              {formatNaira(balance.personalBalance)}
            </p>
          </div>

          {/* ---------- Fund wallet ---------- */}
          {balance.walletProvisioned ? (
            <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 500 }}>Fund wallet</p>
              <p style={{ margin: '0 0 12px', fontSize: 11, color: '#9a9a9f' }}>
                Send a bank transfer to this account — it lands in your balance automatically.
              </p>
              <div style={{ background: '#0b0b0d', border: '1px solid #2a2a2e', borderRadius: 8, padding: 12, marginBottom: 4 }}>
                <p style={{ margin: 0, fontSize: 11, color: '#6b6b6b' }}>Account number</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 600, letterSpacing: 1 }}>{balance.providusAccountNumber}</p>
                  <button
                    onClick={copyAccountNumber}
                    style={{ background: 'transparent', border: '1px solid #2a2a2e', color: '#9a9a9f', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 12, color: '#c4c4c8' }}>Bank: {balance.bankName ?? '—'}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#c4c4c8' }}>Account name: {balance.accountName ?? '—'}</p>
            </div>
          ) : (
            <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500 }}>Set up your wallet</p>
              <p style={{ margin: '0 0 12px', fontSize: 11, color: '#9a9a9f' }}>
                We need a couple of details, one time only, to create your dedicated bank account for funding.
              </p>
              <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>BVN (11 digits)</label>
              <input
                type="text"
                maxLength={11}
                placeholder="12345678901"
                value={bvn}
                onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))}
                style={inputStyle}
              />
              <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Date of birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                style={inputStyle}
              />
              <button
                onClick={setupIdentity}
                disabled={settingUp}
                style={{
                  width: '100%',
                  height: 38,
                  borderRadius: 8,
                  border: 'none',
                  background: '#8a1414',
                  color: '#fff',
                  fontWeight: 500,
                  cursor: settingUp ? 'default' : 'pointer',
                  opacity: settingUp ? 0.7 : 1,
                }}
              >
                {settingUp ? 'Setting up…' : 'Set up wallet'}
              </button>
            </div>
          )}

          <div
            style={{
              background: '#1f1f23',
              border: '1px solid #2a2a2e',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 11, color: '#9a9a9f' }}>Cooperative savings</p>
              <p style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 500 }}>
                {formatNaira(balance.cooperativeSavings)}
              </p>
            </div>
          </div>

          <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500 }}>Move to savings</p>
            <p style={{ margin: '0 0 10px', fontSize: 11, color: '#9a9a9f' }}>
              Transfer from your personal account into your cooperative's pooled savings.
            </p>
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={inputStyle}
            />
            <button
              onClick={moveToSavings}
              disabled={moving}
              style={{
                width: '100%',
                height: 38,
                borderRadius: 8,
                border: 'none',
                background: '#8a1414',
                color: '#fff',
                fontWeight: 500,
                cursor: moving ? 'default' : 'pointer',
                opacity: moving ? 0.7 : 1,
              }}
            >
              {moving ? 'Moving…' : 'Move to savings'}
            </button>
          </div>

          <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button
                onClick={() => setSendMode('bank')}
                style={sendTabStyle(sendMode === 'bank')}
              >
                Send to bank
              </button>
              <button
                onClick={() => setSendMode('trecco')}
                style={sendTabStyle(sendMode === 'trecco')}
              >
                Send to Trecco user
              </button>
            </div>

            {sendMode === 'bank' ? (
              <>
                <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Bank</label>
                <select
                  value={withdrawSortCode}
                  onChange={(e) => { setWithdrawSortCode(e.target.value); setResolvedName(null); }}
                  style={inputStyle}
                >
                  <option value="">Select a bank</option>
                  {banks.map((b) => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>

                <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Account number</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="0123456789"
                  value={withdrawAccountNumber}
                  onChange={(e) => { setWithdrawAccountNumber(e.target.value.replace(/\D/g, '')); setResolvedName(null); }}
                  onBlur={resolveAccount}
                  style={inputStyle}
                />

                {resolvingAccount && <p style={{ fontSize: 11, color: '#9a9a9f', margin: '-4px 0 10px' }}>Checking account…</p>}
                {resolvedName && (
                  <p style={{ fontSize: 12, color: '#34c471', margin: '-4px 0 10px' }}>{resolvedName}</p>
                )}

                <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Amount</label>
                <input
                  type="number"
                  placeholder="Amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  style={inputStyle}
                />

                <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Narration (optional)</label>
                <input
                  type="text"
                  placeholder="What's this for?"
                  value={withdrawNarration}
                  onChange={(e) => setWithdrawNarration(e.target.value)}
                  style={inputStyle}
                />

                <button
                  onClick={submitWithdraw}
                  disabled={withdrawing || !resolvedName}
                  style={primaryButtonStyle(withdrawing)}
                >
                  {withdrawing ? 'Sending…' : 'Send to bank'}
                </button>
              </>
            ) : (
              <>
                <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Recipient email or phone</label>
                <input
                  type="text"
                  placeholder="member@email.com or 08012345678"
                  value={treccoContact}
                  onChange={(e) => { setTreccoContact(e.target.value); setRecipientName(null); }}
                  onBlur={resolveRecipient}
                  style={inputStyle}
                />

                {resolvingRecipient && <p style={{ fontSize: 11, color: '#9a9a9f', margin: '-4px 0 10px' }}>Looking up recipient…</p>}
                {recipientName && (
                  <p style={{ fontSize: 12, color: '#34c471', margin: '-4px 0 10px' }}>{recipientName}</p>
                )}

                <label style={{ fontSize: 11, color: '#6b6b6b', display: 'block', marginBottom: 4 }}>Amount</label>
                <input
                  type="number"
                  placeholder="Amount"
                  value={treccoAmount}
                  onChange={(e) => setTreccoAmount(e.target.value)}
                  style={inputStyle}
                />

                <button
                  onClick={submitSendToTrecco}
                  disabled={sendingToTrecco || !recipientName}
                  style={primaryButtonStyle(sendingToTrecco)}
                >
                  {sendingToTrecco ? 'Sending…' : 'Send to Trecco user'}
                </button>
              </>
            )}
          </div>

          {/* ---------- Transaction history ---------- */}
          <div style={{ background: '#1f1f23', border: '1px solid #2a2a2e', borderRadius: 12, padding: 16, marginTop: 16 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 500 }}>Transaction history</p>
            {transactions.length === 0 && <p style={{ margin: 0, fontSize: 12, color: '#9a9a9f' }}>No transactions yet.</p>}
            {transactions.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #2a2a2e' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{TRANSACTION_LABELS[t.type] ?? t.type}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b6b6b' }}>{new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: DEBIT_TYPES.has(t.type) ? '#e5484d' : '#34c471' }}>
                  {DEBIT_TYPES.has(t.type) ? '-' : '+'}{formatNaira(t.amount)}
                </p>
              </div>
            ))}
            {txTotal > txPerPage && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                  disabled={txPage === 1}
                  style={{ background: 'transparent', border: '1px solid #2a2a2e', color: '#9a9a9f', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
                >
                  Previous
                </button>
                <span style={{ fontSize: 11, color: '#9a9a9f', alignSelf: 'center' }}>
                  Page {txPage} of {Math.ceil(txTotal / txPerPage)}
                </span>
                <button
                  onClick={() => setTxPage((p) => p + 1)}
                  disabled={txPage * txPerPage >= txTotal}
                  style={{ background: 'transparent', border: '1px solid #2a2a2e', color: '#9a9a9f', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {error && <p style={{ color: '#e5484d', fontSize: 13, marginTop: 12 }}>{error}</p>}
    </main>
  );
}
