<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { toastStore } from '$lib/stores/toastStore';

	// Function to simulate a cluster connection error
	async function simulateClusterError() {
		try {
			const response = await fetch('/api/clusters/nonexistent', {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = await response.json();
				console.error('Cluster error:', data.message);

				// Directly show an error toast
				toastStore.addToast(`Cluster connection error: ${data.message}`, 'error', 7000);
			}
		} catch (error) {
			console.error('Error:', error);

			// Directly show an error toast for network errors
			toastStore.addToast(
				`Cluster connection error: ${error instanceof Error ? error.message : String(error)}`,
				'error',
				7000
			);
		}
	}

	// Function to simulate a Redis connection error
	function simulateRedisError() {
		// Since we can't directly trigger a Redis error from the frontend,
		// we'll just create a toast notification with the appropriate type
		toastStore.addToast('Failed to connect to Redis: Connection refused', 'warning', 7000);
	}

	// Function to show a generic error
	function showGenericError() {
		toastStore.addToast('An unexpected error occurred while processing your request', 'info', 5000);
	}
</script>

<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
	<h2 class="mb-4 text-xl font-semibold">Error Notification Demo</h2>
	<div class="flex flex-col gap-3">
		<Button color="red" onclick={simulateClusterError}>Simulate Cluster Connection Error</Button>
		<Button color="yellow" onclick={simulateRedisError}>Simulate Redis Connection Error</Button>
		<Button color="blue" onclick={showGenericError}>Show Generic Error</Button>
		<Button
			color="red"
			onclick={() => toastStore.addToast('Direct error toast test', 'error', 7000)}
		>
			Test Error Toast Directly
		</Button>
	</div>
</div>
