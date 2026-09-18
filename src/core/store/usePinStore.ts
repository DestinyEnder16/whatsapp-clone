// src/core/store/usePinStore.ts
import { mmkvStorage } from "@/core/storage/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface PinState {
  pinCode: string | null;
  isPinCodeSet: boolean;
}

export interface PinActions {
  setPinCode: (pin: string) => void;
  clearPinCode: () => void;
}

export const usePinStore = create<PinState & PinActions>()(
  persist(
    (set) => ({
      pinCode: null,
      isPinCodeSet: false,

      setPinCode: (pinCode: string) =>
        set({
          pinCode,
          isPinCodeSet: true,
        }),

      clearPinCode: () =>
        set({
          pinCode: null,
          isPinCodeSet: false,
        }),
    }),
    {
      name: "pin-code-storage",
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
