<script lang="ts">
	import ClusterManager from './ClusterManager.svelte';
	import { onMount } from 'svelte';

	let { onHamburgerClick = () => {} }: { onHamburgerClick?: () => void } = $props();

	let clusterManagerOpen = $state(false);
	function toggleClusterManager() {
		clusterManagerOpen = !clusterManagerOpen;
	}

	// Dropdown state
	let dropdownOpen = $state(false);

	// Dark mode toggle
	let isDark = $state(true);
	function toggleDarkMode() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('color-theme', isDark ? 'dark' : 'light');
	}

	// Current cluster info
	let currentCluster = $state('local');
	let connectionError = $state<string | null>(null);
	let clusters = $state<{ name: string; isLocal?: boolean; createdAt?: string }[]>([]);
	let isLoading = $state(false);

	// Track when we last switched clusters to prevent API from overriding too quickly
	let lastClusterSwitchTime = 0;
	const SWITCH_PROTECTION_PERIOD = 10000;

	async function fetchClusterInfo() {
		console.log('Fetching full cluster info from API');
		isLoading = true;
		try {
			const now = Date.now();
			const recentlyChanged = now - lastClusterSwitchTime < SWITCH_PROTECTION_PERIOD;
			const storedCluster = localStorage.getItem('currentCluster');
			const clusterSwitched = localStorage.getItem('clusterSwitched');

			if (storedCluster) {
				console.log(`Found stored cluster in localStorage: ${storedCluster}`);
				if (recentlyChanged || clusterSwitched === 'true') {
					console.log('Using localStorage value due to recent switch or flag');
					currentCluster = storedCluster;
					if (clusterSwitched === 'true') {
						lastClusterSwitchTime = now;
						localStorage.removeItem('clusterSwitched');
						localStorage.setItem('lastClusterSwitchTime', now.toString());
						console.log('Updated lastClusterSwitchTime:', now);
					}
				}
			}

			if (!recentlyChanged) {
				const response = await fetch('/api/clusters');
				if (!response.ok) {
					const errorData = await response.json();
					connectionError = errorData.error || 'Failed to connect to cluster';
					console.error('API error:', connectionError);
					isLoading = false;
					return;
				}

				const data = await response.json();
				console.log('API response:', data);
				clusters = data.clusters || [];

				try {
					localStorage.setItem('cachedClusters', JSON.stringify(clusters));
				} catch (storageErr) {
					console.error('Error caching clusters:', storageErr);
				}

				if (currentCluster !== data.currentCluster) {
					if (storedCluster && storedCluster !== data.currentCluster) {
						console.warn(
							`API cluster (${data.currentCluster}) doesn't match localStorage (${storedCluster})`
						);
						if (!recentlyChanged) {
							console.log(`Updating current cluster from API: ${data.currentCluster}`);
							currentCluster = data.currentCluster;
							try {
								localStorage.setItem('currentCluster', data.currentCluster);
							} catch (storageErr) {
								console.error('Error updating localStorage:', storageErr);
							}
						}
					} else {
						console.log(`Updating current cluster from API: ${data.currentCluster}`);
						currentCluster = data.currentCluster;
						try {
							localStorage.setItem('currentCluster', data.currentCluster);
						} catch (storageErr) {
							console.error('Error updating localStorage:', storageErr);
						}
					}
				}
			}

			connectionError = null;
		} catch (err) {
			connectionError = err instanceof Error ? err.message : 'Failed to connect to cluster';
			console.error('Error fetching cluster info:', connectionError);
		} finally {
			isLoading = false;
		}
	}

	async function updateCurrentClusterOnly() {
		try {
			const now = Date.now();
			const recentlyChanged = now - lastClusterSwitchTime < SWITCH_PROTECTION_PERIOD;
			const storedCluster = localStorage.getItem('currentCluster');
			const clusterSwitched = localStorage.getItem('clusterSwitched');

			if (storedCluster) {
				if (recentlyChanged || clusterSwitched === 'true') {
					currentCluster = storedCluster;
					if (clusterSwitched === 'true') {
						lastClusterSwitchTime = now;
						localStorage.removeItem('clusterSwitched');
						localStorage.setItem('lastClusterSwitchTime', now.toString());
					}
				}
			}

			if (!recentlyChanged) {
				const response = await fetch('/api/clusters');
				if (!response.ok) {
					const errorData = await response.json();
					connectionError = errorData.error || 'Failed to connect to cluster';
					return;
				}

				const data = await response.json();

				if (currentCluster !== data.currentCluster) {
					if (storedCluster && storedCluster !== data.currentCluster) {
						if (!recentlyChanged) {
							currentCluster = data.currentCluster;
							try {
								localStorage.setItem('currentCluster', data.currentCluster);
							} catch (storageErr) {
								console.error('Error updating localStorage:', storageErr);
							}
						}
					} else {
						currentCluster = data.currentCluster;
						try {
							localStorage.setItem('currentCluster', data.currentCluster);
						} catch (storageErr) {
							console.error('Error updating localStorage:', storageErr);
						}
					}
				}
			}

			connectionError = null;
		} catch (err) {
			connectionError = err instanceof Error ? err.message : 'Failed to connect to cluster';
		}
	}

	async function switchCluster(cluster: string) {
		if (currentCluster === cluster) return;

		isLoading = true;
		console.log(`Switching to cluster: ${cluster}`);

		try {
			try {
				localStorage.setItem('clusterSwitched', 'true');
				localStorage.setItem('currentCluster', cluster);
			} catch (storageErr) {
				console.error('Error setting localStorage:', storageErr);
			}

			const response = await fetch('/api/clusters/switch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: cluster })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to switch cluster');
			}

			currentCluster = cluster;
			dropdownOpen = false;

			try {
				localStorage.setItem('cachedClusters', JSON.stringify(clusters));
			} catch (storageErr) {
				console.error('Error caching clusters:', storageErr);
			}

			setTimeout(() => {
				window.location.reload();
			}, 100);
		} catch (err) {
			console.error('Switch cluster error:', err instanceof Error ? err.message : err);
		} finally {
			isLoading = false;
		}
	}

	let clusterInfoInterval: number;

	onMount(() => {
		// Init dark mode from storage
		const storedTheme = localStorage.getItem('color-theme');
		if (storedTheme === 'light') {
			isDark = false;
			document.documentElement.classList.remove('dark');
		}

		const lastSwitchTimeStr = localStorage.getItem('lastClusterSwitchTime');
		if (lastSwitchTimeStr) {
			lastClusterSwitchTime = parseInt(lastSwitchTimeStr, 10);
		}

		const storedCluster = localStorage.getItem('currentCluster');
		if (storedCluster) {
			currentCluster = storedCluster;
			lastClusterSwitchTime = Date.now();
			localStorage.setItem('lastClusterSwitchTime', lastClusterSwitchTime.toString());
		}

		try {
			const cachedClustersJson = localStorage.getItem('cachedClusters');
			if (cachedClustersJson) {
				const cachedClusters = JSON.parse(cachedClustersJson);
				if (Array.isArray(cachedClusters) && cachedClusters.length > 0) {
					clusters = cachedClusters;
				}
			}
		} catch (err) {
			console.error('Error loading cached clusters:', err);
		}

		fetchClusterInfo().then(() => {
			if (clusters.length === 0) {
				fetch('/api/clusters')
					.then((response) => {
						if (response.ok) return response.json();
						throw new Error('Failed to fetch clusters');
					})
					.then((data) => {
						clusters = data.clusters || [];
						try {
							localStorage.setItem('cachedClusters', JSON.stringify(clusters));
						} catch (storageErr) {
							console.error('Error caching clusters:', storageErr);
						}
					})
					.catch((err) => {
						console.error('Error in direct API call:', err);
					});
			}
		});

		clusterInfoInterval = setInterval(() => {
			updateCurrentClusterOnly();
		}, 5000) as unknown as number;

		// Close dropdown on outside click
		function handleClickOutside(e: MouseEvent) {
			const target = e.target as HTMLElement;
			if (!target.closest('.cluster-dropdown-container')) {
				dropdownOpen = false;
			}
		}
		document.addEventListener('click', handleClickOutside);

		window.addEventListener('storage', (event) => {
			if (
				event.key === 'currentCluster' ||
				event.key === 'clusterSwitched' ||
				event.key === 'lastClusterSwitchTime'
			) {
				const storedCluster = localStorage.getItem('currentCluster');
				const lastSwitchTimeStr = localStorage.getItem('lastClusterSwitchTime');
				if (storedCluster) currentCluster = storedCluster;
				if (lastSwitchTimeStr) lastClusterSwitchTime = parseInt(lastSwitchTimeStr, 10);
			}
		});

		return () => {
			if (clusterInfoInterval) clearInterval(clusterInfoInterval);
			document.removeEventListener('click', handleClickOutside);
			window.removeEventListener('storage', () => {});
		};
	});
</script>

<div class="nd-navbar" style="height: 64px;">
	<div style="display: flex; align-items: center; gap: var(--space-sm);">
		<!-- Hamburger (mobile only) -->
		<button class="nd-hamburger" onclick={onHamburgerClick} title="Toggle menu">
			<svg
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="3" y1="6" x2="21" y2="6" />
				<line x1="3" y1="12" x2="21" y2="12" />
				<line x1="3" y1="18" x2="21" y2="18" />
			</svg>
		</button>

		<a href="/" class="nd-navbar-brand">
			<img width="30" src="/trivyglass.png" alt="Trivy Glass" />
			<span class="nd-navbar-brand-text">Trivy Glass</span>
		</a>
	</div>

	<div style="display: flex; align-items: center; gap: var(--space-sm);">
		{#if connectionError}
			<span
				class="nd-status-error"
				title={connectionError}
				style="display: flex; align-items: center;"
			>
				<!-- Exclamation circle SVG -->
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
			</span>
		{/if}

		<span
			class="nd-label"
			style="display: none; margin-right: var(--space-sm); color: var(--nd-text-secondary);"
			class:md-show={true}
		>
			CLUSTER: <span style="color: var(--nd-text-display);">{currentCluster}</span>
		</span>

		<!-- Cluster dropdown -->
		<div class="cluster-dropdown-container" style="position: relative;">
			<button
				class="nd-btn nd-btn-ghost nd-btn-sm"
				onclick={() => (dropdownOpen = !dropdownOpen)}
				style="display: flex; align-items: center; gap: var(--space-xs);"
			>
				<!-- Server icon -->
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
					<rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
					<line x1="6" y1="6" x2="6.01" y2="6" />
					<line x1="6" y1="18" x2="6.01" y2="18" />
				</svg>
				<!-- Chevron -->
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="6 9 12 15 18 9" />
				</svg>
			</button>

			{#if dropdownOpen}
				<div class="nd-dropdown" style="min-width: 224px;">
					<div class="nd-dropdown-header">Switch Cluster</div>
					{#if isLoading}
						<div style="padding: var(--space-md); text-align: center;">
							<span class="nd-spinner"></span>
						</div>
					{:else}
						{#each clusters as cluster}
							<button
								class="nd-dropdown-item {currentCluster === cluster.name ? 'active' : ''}"
								onclick={() => switchCluster(cluster.name)}
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
									<rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
									<line x1="6" y1="6" x2="6.01" y2="6" />
									<line x1="6" y1="18" x2="6.01" y2="18" />
								</svg>
								<span>{cluster.name}</span>
								{#if currentCluster === cluster.name}
									<span class="nd-tag nd-tag-active nd-btn-xs" style="margin-left: auto;"
										>ACTIVE</span
									>
								{/if}
							</button>
						{/each}
					{/if}
				</div>
			{/if}
		</div>

		<!-- Settings button -->
		<button
			class="nd-btn nd-btn-ghost nd-btn-sm"
			onclick={toggleClusterManager}
			title="Manage Clusters"
		>
			<!-- Cog icon -->
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="12" cy="12" r="3" />
				<path
					d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
				/>
			</svg>
		</button>

		<!-- Dark mode toggle -->
		<button class="nd-btn nd-btn-ghost nd-btn-sm" onclick={toggleDarkMode} title="Toggle dark mode">
			{#if isDark}
				<!-- Sun icon -->
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="5" />
					<line x1="12" y1="1" x2="12" y2="3" />
					<line x1="12" y1="21" x2="12" y2="23" />
					<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
					<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
					<line x1="1" y1="12" x2="3" y2="12" />
					<line x1="21" y1="12" x2="23" y2="12" />
					<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
					<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
				</svg>
			{:else}
				<!-- Moon icon -->
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
				</svg>
			{/if}
		</button>
	</div>
</div>

<ClusterManager isOpen={clusterManagerOpen} />

<style>
	.md-show {
		display: none !important;
	}
	@media (min-width: 768px) {
		.md-show {
			display: inline !important;
		}
	}
</style>
