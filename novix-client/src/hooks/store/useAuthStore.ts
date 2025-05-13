import { IAccount } from "@/types/Account";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthStore {
	account: IAccount | null;
	setAccount: (acc: IAccount | null) => void;
}

export const useAuthStore = create(
	persist<AuthStore>(
		(set) => ({
			account: null,
			setAccount(acc) {
				set({ account: acc });
			},
		}),
		{ name: "novix-00-auth", storage: createJSONStorage(() => localStorage) },
	),
);
