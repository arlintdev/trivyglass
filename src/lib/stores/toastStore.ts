import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration: number;
	timestamp: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function addToast(message: string, type: ToastType = 'info', duration: number = 5000) {
		const id = crypto.randomUUID();
		const toast: Toast = {
			id,
			message,
			type,
			duration,
			timestamp: Date.now()
		};

		update((toasts) => [...toasts, toast]);

		// Auto-remove toast after duration
		if (duration > 0) {
			setTimeout(() => {
				removeToast(id);
			}, duration);
		}

		return id;
	}

	function removeToast(id: string) {
		update((toasts) => toasts.filter((toast) => toast.id !== id));
	}

	function clearToasts() {
		update(() => []);
	}

	return {
		subscribe,
		addToast,
		removeToast,
		clearToasts
	};
}

export const toastStore = createToastStore();
