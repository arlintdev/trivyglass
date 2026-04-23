<script lang="ts">
	import { onMount } from 'svelte';

	let { isOpen = false } = $props();
	let clusterToDelete = $state<string | null>(null);
	let clusters = $state<{ name: string; isLocal?: boolean; createdAt?: string }[]>([]);
	let currentCluster = $state<string>('local');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

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
			error = err instanceof Error ? err.message : 'An unknown error occurred';
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
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ kubeconfig: kubeConfigData })
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to upload kubeconfig');
			}
			const data = await response.json();
			uploadedContexts = data.contexts || [];
			success =
				uploadedContexts.length > 0
					? `Successfully added ${uploadedContexts.length} cluster context${uploadedContexts.length > 1 ? 's' : ''}: ${uploadedContexts.join(', ')}`
					: 'Kubeconfig uploaded successfully';
			kubeConfigText = '';
			kubeConfigFile = null;
			await loadClusters();
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unknown error occurred';
		} finally {
			isLoading = false;
		}
	}

	async function switchCluster(cluster: string) {
		isLoading = true;
		error = null;
		try {
			localStorage.setItem('clusterSwitched', 'true');
			localStorage.setItem('currentCluster', cluster);
			const response = await fetch('/api/clusters/switch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: cluster })
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to switch cluster');
			}
			setTimeout(() => window.location.reload(), 100);
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unknown error occurred';
		} finally {
			isLoading = false;
		}
	}

	function showDeleteConfirmation(cluster: string) {
		if (cluster === 'local') {
			error = 'Cannot delete local cluster';
			return;
		}
		clusterToDelete = cluster;
	}

	function cancelDelete() {
		clusterToDelete = null;
	}

	async function confirmDeleteCluster() {
		if (!clusterToDelete) return;
		const cluster = clusterToDelete;
		clusterToDelete = null;
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
			error = err instanceof Error ? err.message : 'An unknown error occurred';
		} finally {
			isLoading = false;
		}
	}

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		kubeConfigFile = target.files && target.files.length > 0 ? target.files[0] : null;
	}
</script>

{#if isOpen}
	<div class="nd-modal-backdrop" role="dialog" tabindex="-1">
		<div class="nd-modal nd-modal-lg" role="document">
			<div class="nd-modal-header">
				<span class="nd-modal-title">Manage Clusters</span>
				<button class="nd-modal-close" onclick={() => (isOpen = false)}>[ X ]</button>
			</div>

			{#if error}
				<div class="nd-alert nd-alert-error" style="margin-bottom: var(--space-md);">{error}</div>
			{/if}

			{#if success}
				<div class="nd-alert nd-alert-success" style="margin-bottom: var(--space-md);">
					{success}
				</div>
			{/if}

			<!-- Delete confirmation -->
			{#if clusterToDelete}
				<div class="nd-modal-backdrop" style="z-index: 110;">
					<div class="nd-modal" style="max-width: 400px;">
						<h3 class="nd-subheading" style="margin-bottom: var(--space-md);">Confirm Delete</h3>
						<p
							class="nd-body-sm"
							style="margin-bottom: var(--space-lg); color: var(--nd-text-secondary);"
						>
							Are you sure you want to delete "{clusterToDelete}"? This cannot be undone.
						</p>
						<div style="display: flex; justify-content: flex-end; gap: var(--space-sm);">
							<button class="nd-btn nd-btn-secondary nd-btn-sm" onclick={cancelDelete}
								>Cancel</button
							>
							<button class="nd-btn nd-btn-destructive nd-btn-sm" onclick={confirmDeleteCluster}
								>Delete</button
							>
						</div>
					</div>
				</div>
			{/if}

			<!-- Available Clusters -->
			<div style="margin-bottom: var(--space-lg);">
				<h3 class="nd-label" style="margin-bottom: var(--space-sm);">Available Clusters</h3>
				{#if isLoading && clusters.length === 0}
					<div style="text-align: center; padding: var(--space-md);">
						<span class="nd-spinner"></span>
					</div>
				{:else if clusters.length === 0}
					<p class="nd-caption" style="color: var(--nd-text-disabled);">No clusters available</p>
				{:else}
					<div style="display: flex; flex-direction: column; gap: var(--space-sm);">
						{#each clusters as cluster}
							<div
								class="nd-surface-raised"
								style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-sm) var(--space-md); border-radius: 8px; {currentCluster ===
								cluster.name
									? 'border-color: var(--nd-interactive);'
									: ''}"
							>
								<div style="display: flex; align-items: center; gap: var(--space-sm);">
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
										stroke-linejoin="round"
										><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect
											x="2"
											y="14"
											width="20"
											height="8"
											rx="2"
											ry="2"
										/><line x1="6" y1="6" x2="6.01" y2="6" /><line
											x1="6"
											y1="18"
											x2="6.01"
											y2="18"
										/></svg
									>
									<span>{cluster.name}</span>
									{#if currentCluster === cluster.name}
										<span class="nd-tag nd-tag-active">ACTIVE</span>
									{/if}
								</div>
								<div style="display: flex; gap: var(--space-xs);">
									{#if currentCluster !== cluster.name}
										<button
											class="nd-btn nd-btn-secondary nd-btn-xs"
											onclick={() => switchCluster(cluster.name)}
											disabled={isLoading}>Switch</button
										>
									{/if}
									{#if !cluster.isLocal}
										<button
											class="nd-btn nd-btn-destructive nd-btn-xs"
											onclick={() => showDeleteConfirmation(cluster.name)}
											disabled={isLoading}
											title="Delete cluster"
										>
											<svg
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
												stroke-linecap="round"
												stroke-linejoin="round"
												><polyline points="3 6 5 6 21 6" /><path
													d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
												/></svg
											>
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Upload Kubeconfig -->
			<div style="border-top: 1px solid var(--nd-border); padding-top: var(--space-lg);">
				<h3 class="nd-label" style="margin-bottom: var(--space-sm);">Upload Kubeconfig</h3>
				<p
					class="nd-caption"
					style="margin-bottom: var(--space-md); color: var(--nd-text-disabled);"
				>
					All contexts in the kubeconfig will be automatically added.
				</p>

				<div style="display: flex; flex-direction: column; gap: var(--space-md);">
					<fieldset style="border: none; padding: 0; margin: 0;">
						<legend class="nd-label" style="margin-bottom: var(--space-sm);">Upload Method</legend>
						<div style="display: flex; gap: var(--space-md);">
							<label
								style="display: flex; align-items: center; gap: var(--space-xs); cursor: pointer; color: var(--nd-text-primary); font-size: var(--body-sm);"
							>
								<input
									type="radio"
									name="uploadMethod"
									value="file"
									checked={uploadMethod === 'file'}
									onchange={() => (uploadMethod = 'file')}
								/>
								File Upload
							</label>
							<label
								style="display: flex; align-items: center; gap: var(--space-xs); cursor: pointer; color: var(--nd-text-primary); font-size: var(--body-sm);"
							>
								<input
									type="radio"
									name="uploadMethod"
									value="text"
									checked={uploadMethod === 'text'}
									onchange={() => (uploadMethod = 'text')}
								/>
								Text Input
							</label>
						</div>
					</fieldset>

					{#if uploadMethod === 'file'}
						<div>
							<label
								for="kubeConfigFile"
								class="nd-label"
								style="display: block; margin-bottom: var(--space-xs);">Kubeconfig File</label
							>
							<input
								type="file"
								id="kubeConfigFile"
								accept=".yaml,.yml,.json,.config"
								onchange={handleFileChange}
								class="nd-input-bordered"
								style="font-family: var(--font-mono); font-size: var(--body-sm);"
							/>
						</div>
					{:else}
						<div>
							<label
								for="kubeConfigText"
								class="nd-label"
								style="display: block; margin-bottom: var(--space-xs);">Kubeconfig Content</label
							>
							<textarea
								id="kubeConfigText"
								bind:value={kubeConfigText}
								rows="5"
								class="nd-textarea"
								placeholder="Paste your kubeconfig content here"
							></textarea>
						</div>
					{/if}

					<button
						class="nd-btn nd-btn-primary"
						onclick={handleUpload}
						disabled={isLoading}
						style="width: 100%;"
					>
						{#if isLoading}
							[UPLOADING...]
						{:else}
							Upload Kubeconfig
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
