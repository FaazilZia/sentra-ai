import { create } from 'zustand';

export type ModalType = 
  | 'ADD_FRAMEWORK' 
  | 'ADD_USE_CASE' 
  | 'EDIT_USE_CASE' 
  | 'DELETE_CONFIRMATION' 
  | 'RISK_DETAILS' 
  | 'EXPORT_SETTINGS';

interface ModalState {
  type: ModalType | null;
  data: any;
  isOpen: boolean;
  openModal: (type: ModalType, data?: any) => void;
  closeModal: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

interface UIState {
  isRefreshing: boolean;
  setRefreshing: (val: boolean) => void;
}

export const useStore = create<ModalState & ToastState & UIState>((set) => ({
  // Modal State
  type: null,
  data: null,
  isOpen: false,
  openModal: (type, data = null) => set({ type, data, isOpen: true }),
  closeModal: () => set({ type: null, data: null, isOpen: false }),

  // Toast State
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, toast.duration || 3000);
    }
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),

  // UI State
  isRefreshing: false,
  setRefreshing: (val) => set({ isRefreshing: val }),
}));
