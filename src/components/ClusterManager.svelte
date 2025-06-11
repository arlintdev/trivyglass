<script lang="ts">
	import { Button, Modal, Alert, Spinner } from 'flowbite-svelte';
	import { ServerSolid, ArchiveSolid } from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';

	let { isOpen = false } = $props();
	let clusterToDelete = $state<string | null>(null);
	let clusters = $state<{ name: string; isLocal?: boolean; createdAt?: string }[]>([]);
	let currentCluster = $state<string>('local');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	// Upload form
	let kubeConfigText = $state('');
	let kubeConfigFile: File | null = $state(null);
	let uploadMethod = $state<'file' | 'text'>('file');
	let uploadedContexts = $state<string[]>([]);

	onMount(async () => {
		await loadClusters();
	});

	async function loadClusters() {
		isLoading = true;
		error = null;

		try {
			const response = await fetch('/api/clusters');
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to load clusters');
			}

			const data = await response.json();
			clusters = data.clusters;
			currentCluster = data.currentCluster;
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'An unknown error occurred';
			}
		} finally {
			isLoading = false;
		}
	}

	async function handleUpload() {
		isLoading = true;
		error = null;
		success = null;
		uploadedContexts = [];

		try {
			let kubeConfigData: string;

			if (uploadMethod === 'file') {
				if (!kubeConfigFile) {
					error = 'Please select a kubeconfig file';
					isLoading = false;
					return;
				}

				kubeConfigData = await kubeConfigFile.text();
			} else {
				if (!kubeConfigText) {
					error = 'Please enter kubeconfig content';
					isLoading = false;
					return;
				}

				kubeConfigData = kubeConfigText;
			}

			const response = await fetch('/api/clusters', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					kubeconfig: kubeConfigData
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to upload kubeconfig');
			}

			const data = await response.json();
			uploadedContexts = data.contexts || [];

			if (uploadedContexts.length > 0) {
				success = `Successfully added ${uploadedContexts.length} cluster context${uploadedContexts.length > 1 ? 's' : ''}: ${uploadedContexts.join(', ')}`;
			} else {
				success = 'Kubeconfig uploaded successfully';
			}

			kubeConfigText = '';
			kubeConfigFile = null;

			await loadClusters();
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'An unknown error occurred';
			}
		} finally {
			isLoading = false;
		}
	}

	async function switchCluster(cluster: string) {
		isLoading = true;
		error = null;
		console.log(`Switching to cluster: ${cluster}`);

		try {
			// First, set the localStorage values before making the API call
			console.log('Setting localStorage values');
			try {
				localStorage.setItem('clusterSwitched', 'true');
				localStorage.setItem('currentCluster', cluster);
				console.log('localStorage values set successfully');
			} catch (storageErr) {
				console.error('Error setting localStorage:', storageErr);
			}

			const response = await fetch('/api/clusters/switch', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: cluster
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to switch cluster');
			}

			console.log(`Successfully switched to cluster: ${cluster}`);

			// Add a small delay before reloading to ensure localStorage is set
			setTimeout(() => {
				console.log('Reloading page...');
				window.location.reload();
			}, 100);
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'An unknown error occurred';
			}
		} finally {
			isLoading = false;
		}
	}

	// Function to show delete confirmation
	function showDeleteConfirmation(cluster: string) {
		if (cluster === 'local') {
			error = 'Cannot delete local cluster';
			return;
		}
		clusterToDelete = cluster;
	}

	// Function to cancel delete
	function cancelDelete() {
		clusterToDelete = null;
	}

	// Function to confirm and execute delete
	async function confirmDeleteCluster() {
		if (!clusterToDelete) return;

		const cluster = clusterToDelete;
		clusterToDelete = null; // Clear confirmation state
		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/clusters/${encodeURIComponent(cluster)}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to delete cluster');
			}

			success = `Cluster ${cluster} deleted successfully`;
			await loadClusters();
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'An unknown error occurred';
			}
		} finally {
			isLoading = false;
		}
	}

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			kubeConfigFile = target.files[0];
		} else {
			kubeConfigFile = null;
		}
	}
</script>

<!-- Cluster Manager Modal -->
<Modal title="Manage Clusters" bind:open={isOpen} size="lg" params={{ duration: 300 }}>
	{#if error}
		<Alert color="red" class="mt-4">
			{error}
		</Alert>
	{/if}

	{#if success}
		<Alert color="green" class="mt-4">
			{success}
		</Alert>
	{/if}

	{#if clusterToDelete}
		<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
			<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
				<h3 class="mb-4 text-lg font-medium">Confirm Delete</h3>
				<p class="mb-6">
					Are you sure you want to delete the cluster "{clusterToDelete}"? This action cannot be
					undone.
				</p>
				<div class="flex justify-end space-x-3">
					<Button color="gray" onclick={cancelDelete}>Cancel</Button>
					<Button color="red" onclick={confirmDeleteCluster}>Delete</Button>
				</div>
			</div>
		</div>
	{/if}

	<div class="mt-4">
		<h3 class="mb-2 font-medium">Available Clusters</h3>

		{#if isLoading && clusters.length === 0}
			<div class="flex justify-center py-4">
				<Spinner color="blue" />
			</div>
		{:else if clusters.length === 0}
			<p class="py-2 text-gray-500">No clusters available</p>
		{:else}
			<ul class="space-y-2">
				{#each clusters as cluster}
					<li
						class="flex items-center justify-between rounded-lg border p-2 {currentCluster ===
						cluster.name
							? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
							: ''}"
					>
						<div class="flex items-center">
							<ServerSolid class="mr-2 h-5 w-5 text-gray-500" />
							<span>{cluster.name}</span>
							{#if currentCluster === cluster.name}
								<span
									class="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-300"
								>
									Active
								</span>
							{/if}
						</div>
						<div class="flex space-x-1">
							{#if currentCluster !== cluster.name}
								<Button
									color="blue"
									class="flex items-center p-1"
									onclick={() => switchCluster(cluster.name)}
									disabled={isLoading}
								>
									Switch
								</Button>
							{/if}
							{#if !cluster.isLocal}
								<Button
									color="red"
									class="p-1"
									onclick={() => showDeleteConfirmation(cluster.name)}
									disabled={isLoading}
									title="Delete cluster"
								>
									<ArchiveSolid class="h-4 w-4" />
								</Button>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="mt-6 border-t pt-4">
		<h3 class="mb-2 font-medium">Upload Kubeconfig</h3>
		<p class="mb-4 text-sm text-gray-500">
			All contexts in the kubeconfig will be automatically added.
		</p>

		<div class="space-y-4">
			<div class="space-y-4">
				<fieldset>
					<legend class="mb-2 block text-sm font-medium">Upload Method</legend>
					<div class="flex space-x-4">
						<label class="flex items-center">
							<input
								type="radio"
								name="uploadMethod"
								value="file"
								checked={uploadMethod === 'file'}
								onchange={() => (uploadMethod = 'file')}
								class="mr-2"
							/>
							File Upload
						</label>
						<label class="flex items-center">
							<input
								type="radio"
								name="uploadMethod"
								value="text"
								checked={uploadMethod === 'text'}
								onchange={() => (uploadMethod = 'text')}
								class="mr-2"
							/>
							Text Input
						</label>
					</div>
				</fieldset>
			</div>

			{#if uploadMethod === 'file'}
				<div>
					<label for="kubeConfigFile" class="mb-2 block text-sm font-medium">Kubeconfig File</label>
					<input
						type="file"
						id="kubeConfigFile"
						accept=".yaml,.yml,.json,.config"
						onchange={handleFileChange}
						class="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:border-gray-600 dark:bg-gray-700"
					/>
				</div>
			{:else}
				<div>
					<label for="kubeConfigText" class="mb-2 block text-sm font-medium"
						>Kubeconfig Content</label
					>
					<textarea
						id="kubeConfigText"
						bind:value={kubeConfigText}
						rows="5"
						class="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:border-gray-600 dark:bg-gray-700"
						placeholder="Paste your kubeconfig content here"
					></textarea>
				</div>
			{/if}

			<Button color="blue" class="w-full" onclick={handleUpload} disabled={isLoading}>
				{#if isLoading}
					<Spinner color="blue" class="mr-2" />
				{:else}
					<ArchiveSolid class="mr-2 h-5 w-5" />
				{/if}
				Upload Kubeconfig
			</Button>
		</div>
	</div>
</Modal>

<style>
	/* Custom styles for the cluster manager modal */
	:global(.cluster-manager-modal) {
		width: 40rem !important;
		max-width: 100%;
		margin: 0 auto !important;
		left: 50% !important;
		transform: translateX(-50%) !important;
	}
</style>
