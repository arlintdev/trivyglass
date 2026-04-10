<script lang="ts">
	import { toastStore } from '$lib/stores/toastStore';

	async function simulateClusterError() {
		try {
			const response = await fetch('/api/clusters/nonexistent', { method: 'DELETE' });
			if (!response.ok) {
				const data = await response.json();
				toastStore.addToast(`Cluster connection error: ${data.message}`, 'error', 7000);
			}
		} catch (error) {
			toastStore.addToast(
				`Cluster connection error: ${error instanceof Error ? error.message : String(error)}`,
				'error',
				7000
			);
		}
	}

	function simulateRedisError() {
		toastStore.addToast('Failed to connect to Redis: Connection refused', 'warning', 7000);
	}

	function showGenericError() {
		toastStore.addToast('An unexpected error occurred while processing your request', 'info', 5000);
	}
</script>

<div class="nd-card">
	<h3 class="nd-label" style="margin-bottom: var(--space-md);">Error Notification Demo</h3>
	<div style="display: flex; flex-direction: column; gap: var(--space-sm);">
		<button class="nd-btn nd-btn-destructive nd-btn-sm" onclick={simulateClusterError}
			>Simulate Cluster Error</button
		>
		<button class="nd-btn nd-btn-secondary nd-btn-sm" onclick={simulateRedisError}
			>Simulate Redis Error</button
		>
		<button class="nd-btn nd-btn-secondary nd-btn-sm" onclick={showGenericError}
			>Show Generic Error</button
		>
		<button
			class="nd-btn nd-btn-destructive nd-btn-sm"
			onclick={() => toastStore.addToast('Direct error toast test', 'error', 7000)}
			>Test Error Toast</button
		>
	</div>
</div>
