import { create } from 'zustand/react';
import { useUserStore } from './userStore';
import { soundFx } from './soundEffects';
import { PaymentPackage, PAYMENT_PACKAGES } from './youpiStore';

export interface PhonePeTransaction {
  id: string;
  merchantTransactionId: string;
  phonepeTransactionId: string;
  packageId: string;
  packageName: string;
  amountInr: number;
  bullionsCredited: number;
  coinsCredited: number;
  vipUnlocked: boolean;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  timestamp: number;
  gateway: 'PHONEPE_OFFICIAL';
}

interface PhonePeStoreState {
  isPhonePeModalOpen: boolean;
  selectedPackage: PaymentPackage | null;
  activeTransactionId: string | null;
  instrumentType: 'PAY_PAGE' | 'UPI_INTENT' | 'UPI_QR';
  paymentState: 'idle' | 'initiating' | 'awaiting_payment' | 'verifying' | 'success' | 'failed';
  redirectUrl: string | null;
  errorMessage: string | null;
  successData: {
    txnId: string;
    phonepeTxnId: string;
    packageName: string;
    bullionsAdded: number;
    coinsAdded: number;
    amountInr: number;
  } | null;

  // Gateway Config & Environment
  merchantId: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  apiBaseUrl: string;
  isOnline: boolean;
  transactions: PhonePeTransaction[];

  // Actions
  openPhonePeCheckout: (pkg: PaymentPackage, instrument?: 'PAY_PAGE' | 'UPI_INTENT' | 'UPI_QR') => void;
  closePhonePeCheckout: () => void;
  setInstrumentType: (instrument: 'PAY_PAGE' | 'UPI_INTENT' | 'UPI_QR') => void;
  initiatePayment: () => Promise<string | null>;
  simulatePaymentSuccess: () => Promise<boolean>;
  checkGatewayStatus: () => Promise<boolean>;
  clearTransactions: () => void;
}

const STORAGE_PHONEPE_TXNS = 'phonepe_gateway_transactions';

function loadInitialPhonePeTransactions(): PhonePeTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_PHONEPE_TXNS);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

export const usePhonePeStore = create<PhonePeStoreState>((set, get) => ({
  isPhonePeModalOpen: false,
  selectedPackage: null,
  activeTransactionId: null,
  instrumentType: 'PAY_PAGE',
  paymentState: 'idle',
  redirectUrl: null,
  errorMessage: null,
  successData: null,

  merchantId: 'PGTESTPAYUAT',
  environment: 'SANDBOX',
  apiBaseUrl: 'http://localhost:2567',
  isOnline: true,
  transactions: loadInitialPhonePeTransactions(),

  openPhonePeCheckout: (pkg: PaymentPackage, instrument = 'PAY_PAGE') => {
    soundFx.playClick();
    const txnId = `MT_BT_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    set({
      isPhonePeModalOpen: true,
      selectedPackage: pkg,
      activeTransactionId: txnId,
      instrumentType: instrument,
      paymentState: 'awaiting_payment',
      redirectUrl: null,
      errorMessage: null,
      successData: null,
    });
    // Auto-initiate payment session with backend
    get().initiatePayment();
  },

  closePhonePeCheckout: () => {
    set({
      isPhonePeModalOpen: false,
      selectedPackage: null,
      activeTransactionId: null,
      paymentState: 'idle',
      redirectUrl: null,
      errorMessage: null,
    });
  },

  setInstrumentType: (instrument) => set({ instrumentType: instrument }),

  initiatePayment: async () => {
    const { selectedPackage, activeTransactionId, instrumentType, apiBaseUrl } = get();
    if (!selectedPackage || !activeTransactionId) return null;

    set({ paymentState: 'initiating', errorMessage: null });

    try {
      const user = useUserStore.getState().user;
      const res = await fetch(`${apiBaseUrl}/api/phonepe/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountInr: selectedPackage.priceInr,
          packageId: selectedPackage.id,
          packageName: selectedPackage.name,
          bullions: selectedPackage.bullions,
          bonusCoins: selectedPackage.bonusCoins,
          userId: user.id,
          instrumentType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        set({
          redirectUrl: data.redirectUrl,
          paymentState: 'awaiting_payment',
        });
        return data.redirectUrl;
      }
    } catch (err: any) {
      console.warn('PhonePe initiate call fallback:', err.message);
    }

    // Seamless fallback to sandbox checkout state
    set({
      paymentState: 'awaiting_payment',
      redirectUrl: `https://mercury-uat.phonepe.com/transact/simulator?txn=${activeTransactionId}`,
    });
    return null;
  },

  simulatePaymentSuccess: async () => {
    const { selectedPackage, activeTransactionId, transactions, apiBaseUrl } = get();
    if (!selectedPackage || !activeTransactionId) return false;

    set({ paymentState: 'verifying' });

    // Call server settlement simulation if server is online
    try {
      await fetch(`${apiBaseUrl}/api/phonepe/simulate-settlement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantTransactionId: activeTransactionId,
          status: 'SUCCESS',
        }),
      });
    } catch (_) {}

    await new Promise((r) => setTimeout(r, 1000));

    // Credit user store
    const userStore = useUserStore.getState();
    userStore.addCoins(selectedPackage.bullions);
    if (selectedPackage.bonusVip || selectedPackage.isVipOnly) {
      userStore.upgradeToVip();
    }

    soundFx.playCashRegister();

    const phonepeTxnId = `T${Date.now()}${Math.floor(Math.random() * 899 + 100)}`;
    const newTx: PhonePeTransaction = {
      id: `pp_tx_${Date.now()}`,
      merchantTransactionId: activeTransactionId,
      phonepeTransactionId: phonepeTxnId,
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      amountInr: selectedPackage.priceInr,
      bullionsCredited: selectedPackage.bullions,
      coinsCredited: selectedPackage.bonusCoins,
      vipUnlocked: Boolean(selectedPackage.bonusVip || selectedPackage.isVipOnly),
      status: 'SUCCESS',
      timestamp: Date.now(),
      gateway: 'PHONEPE_OFFICIAL',
    };

    const updated = [newTx, ...transactions];
    localStorage.setItem(STORAGE_PHONEPE_TXNS, JSON.stringify(updated));

    set({
      transactions: updated,
      paymentState: 'success',
      successData: {
        txnId: activeTransactionId,
        phonepeTxnId,
        packageName: selectedPackage.name,
        bullionsAdded: selectedPackage.bullions,
        coinsAdded: selectedPackage.bonusCoins,
        amountInr: selectedPackage.priceInr,
      },
    });

    return true;
  },

  checkGatewayStatus: async () => {
    const { apiBaseUrl } = get();
    try {
      const res = await fetch(`${apiBaseUrl}/api/phonepe/config`, { signal: AbortSignal.timeout(3000) });
      const ok = res.ok;
      set({ isOnline: ok });
      return ok;
    } catch (_) {
      set({ isOnline: false });
      return false;
    }
  },

  clearTransactions: () => {
    localStorage.removeItem(STORAGE_PHONEPE_TXNS);
    set({ transactions: [] });
  },
}));
