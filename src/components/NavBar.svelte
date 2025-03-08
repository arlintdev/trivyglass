<script lang="ts">
	import {
		MegaMenu,
		Navbar,
		NavBrand,
		NavUl,
		NavLi,
		uiHelpers,
		NavHamburger,
		Dropdown,
		DropdownHeader,
		DropdownUl,
		DropdownLi,
		Button,
		Spinner
	} from 'svelte-5-ui-lib';
	import {
		ChevronDownOutline,
		ServerSolid,
		ExclamationCircleSolid,
		CogSolid
	} from 'flowbite-svelte-icons';
	import ClusterManager from './ClusterManager.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	let activeUrl = $state($page.url.pathname);
	import { sineIn } from 'svelte/easing';
	let nav = uiHelpers();
	let navStatus = $state(false);
	let toggleNav = nav.toggle;
	let dropdownUser = uiHelpers();
	let dropdownUserStatus = $state(false);
	let closeDropdownUser = dropdownUser.close;

	// Cluster manager
	let clusterManager = uiHelpers();
	let toggleClusterManager = clusterManager.toggle;

	// Current cluster info
	let currentCluster = $state('local');
	let connectionError = $state<string | null>(null);
	let error = $state<string | null>(null);
	let clusters = $state<{ name: string; isLocal?: boolean; createdAt?: string }[]>([]);
	let isLoading = $state(false);

	// Track when we last switched clusters to prevent API from overriding too quickly
	let lastClusterSwitchTime = 0;
	const SWITCH_PROTECTION_PERIOD = 10000; // 10 seconds protection after switch

	// Fetch full cluster info including the list of available clusters
	async function fetchClusterInfo() {
		console.log('Fetching full cluster info from API');
		isLoading = true;
		try {
			// Check if we recently switched clusters (within protection period)
			const now = Date.now();
			const recentlyChanged = now - lastClusterSwitchTime < SWITCH_PROTECTION_PERIOD;

			// First check if we have a stored cluster name that should take precedence
			const storedCluster = localStorage.getItem('currentCluster');
			const clusterSwitched = localStorage.getItem('clusterSwitched');

			if (storedCluster) {
				console.log(`Found stored cluster in localStorage: ${storedCluster}`);

				// If we recently switched or the clusterSwitched flag is set, prioritize localStorage
				if (recentlyChanged || clusterSwitched === 'true') {
					console.log('Using localStorage value due to recent switch or flag');
					currentCluster = storedCluster;

					// If this is the first time after a switch, update the timestamp
					if (clusterSwitched === 'true') {
						lastClusterSwitchTime = now;
						localStorage.removeItem('clusterSwitched');
						localStorage.setItem('lastClusterSwitchTime', now.toString());
						console.log('Updated lastClusterSwitchTime:', now);
					}
				}
			}

			// Only fetch from API if we're not in the protection period
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

				// Update clusters list
				clusters = data.clusters || [];

				// Cache the clusters in localStorage
				try {
					localStorage.setItem('cachedClusters', JSON.stringify(clusters));
					console.log('Cached clusters in localStorage');
				} catch (storageErr) {
					console.error('Error caching clusters:', storageErr);
				}

				// If we're not in protection period, update from API
				if (currentCluster !== data.currentCluster) {
					// If we have a stored cluster and it doesn't match API, log a warning
					if (storedCluster && storedCluster !== data.currentCluster) {
						console.warn(
							`API cluster (${data.currentCluster}) doesn't match localStorage (${storedCluster})`
						);

						// If we recently switched, trust localStorage over API
						if (recentlyChanged) {
							console.log('Ignoring API value due to recent cluster switch');
						} else {
							console.log(`Updating current cluster from API: ${data.currentCluster}`);
							currentCluster = data.currentCluster;

							// Update localStorage to keep in sync
							try {
								localStorage.setItem('currentCluster', data.currentCluster);
								console.log('Updated localStorage with current cluster from API');
							} catch (storageErr) {
								console.error('Error updating localStorage:', storageErr);
							}
						}
					} else {
						// Normal update when no conflict
						console.log(`Updating current cluster from API: ${data.currentCluster}`);
						currentCluster = data.currentCluster;

						// Update localStorage to keep in sync
						try {
							localStorage.setItem('currentCluster', data.currentCluster);
							console.log('Updated localStorage with current cluster from API');
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

	// Only update the current cluster info without refreshing the clusters list
	// This is used for polling to avoid UI glitches in the dropdown
	async function updateCurrentClusterOnly() {
		console.log('Updating current cluster info only');
		try {
			// Check if we recently switched clusters (within protection period)
			const now = Date.now();
			const recentlyChanged = now - lastClusterSwitchTime < SWITCH_PROTECTION_PERIOD;

			// First check if we have a stored cluster name that should take precedence
			const storedCluster = localStorage.getItem('currentCluster');
			const clusterSwitched = localStorage.getItem('clusterSwitched');

			if (storedCluster) {
				// If we recently switched or the clusterSwitched flag is set, prioritize localStorage
				if (recentlyChanged || clusterSwitched === 'true') {
					currentCluster = storedCluster;

					// If this is the first time after a switch, update the timestamp
					if (clusterSwitched === 'true') {
						lastClusterSwitchTime = now;
						localStorage.removeItem('clusterSwitched');
						localStorage.setItem('lastClusterSwitchTime', now.toString());
					}
				}
			}

			// Only fetch from API if we're not in the protection period
			if (!recentlyChanged) {
				const response = await fetch('/api/clusters');
				if (!response.ok) {
					const errorData = await response.json();
					connectionError = errorData.error || 'Failed to connect to cluster';
					return;
				}

				const data = await response.json();

				// Only update the current cluster, not the clusters list
				if (currentCluster !== data.currentCluster) {
					// If we have a stored cluster and it doesn't match API, log a warning
					if (storedCluster && storedCluster !== data.currentCluster) {
						// If we recently switched, trust localStorage over API
						if (recentlyChanged) {
							// Do nothing, keep using localStorage value
						} else {
							currentCluster = data.currentCluster;

							// Update localStorage to keep in sync
							try {
								localStorage.setItem('currentCluster', data.currentCluster);
							} catch (storageErr) {
								console.error('Error updating localStorage:', storageErr);
							}
						}
					} else {
						// Normal update when no conflict
						currentCluster = data.currentCluster;

						// Update localStorage to keep in sync
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
			console.error('Error updating current cluster info:', connectionError);
		}
	}

	// Function to switch to a different cluster
	async function switchCluster(cluster: string) {
		if (currentCluster === cluster) return;

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

			// Update current cluster
			currentCluster = cluster;

			// Close the dropdown
			closeDropdownUser();

			// Store the clusters list in localStorage before reloading
			try {
				localStorage.setItem('cachedClusters', JSON.stringify(clusters));
			} catch (storageErr) {
				console.error('Error caching clusters:', storageErr);
			}

			// Add a small delay before reloading to ensure localStorage is set
			setTimeout(() => {
				console.log('Reloading page...');
				window.location.reload();
			}, 100);
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
				console.error('Error switching cluster:', error);
			} else {
				error = 'An unknown error occurred';
				console.error('Unknown error switching cluster');
			}
		} finally {
			isLoading = false;
		}
	}

	// Set up polling to keep cluster info updated
	let clusterInfoInterval: number;

	// No longer needed as this functionality is now integrated into fetchClusterInfo

	onMount(() => {
		console.log('NavBar component mounted');

		// Check if we have a last switch time stored
		const lastSwitchTimeStr = localStorage.getItem('lastClusterSwitchTime');
		if (lastSwitchTimeStr) {
			lastClusterSwitchTime = parseInt(lastSwitchTimeStr, 10);
			console.log('Loaded lastClusterSwitchTime from localStorage:', lastClusterSwitchTime);
		}

		// Force the stored cluster to be used on initial load
		const storedCluster = localStorage.getItem('currentCluster');
		if (storedCluster) {
			console.log(`Using stored cluster on mount: ${storedCluster}`);
			currentCluster = storedCluster;

			// Set the switch time to now to protect it
			lastClusterSwitchTime = Date.now();
			localStorage.setItem('lastClusterSwitchTime', lastClusterSwitchTime.toString());
		}

		// Try to load cached clusters from localStorage first
		try {
			const cachedClustersJson = localStorage.getItem('cachedClusters');
			if (cachedClustersJson) {
				const cachedClusters = JSON.parse(cachedClustersJson);
				if (Array.isArray(cachedClusters) && cachedClusters.length > 0) {
					console.log('Using cached clusters from localStorage:', cachedClusters);
					clusters = cachedClusters;
				}
			}
		} catch (err) {
			console.error('Error loading cached clusters:', err);
		}

		// Then fetch clusters from API to ensure we have the latest data
		fetchClusterInfo().then(() => {
			// If clusters list is still empty after initial fetch, try a direct API call
			if (clusters.length === 0) {
				console.log('Clusters list is still empty, trying direct API call');
				fetch('/api/clusters')
					.then((response) => {
						if (response.ok) return response.json();
						throw new Error('Failed to fetch clusters');
					})
					.then((data) => {
						clusters = data.clusters || [];
						console.log('Loaded clusters from direct API call:', clusters);

						// Cache the clusters in localStorage
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

		// Set up polling every 5 seconds to keep cluster info updated
		// Use updateCurrentClusterOnly to avoid refreshing the dropdown and causing UI glitches
		clusterInfoInterval = setInterval(() => {
			updateCurrentClusterOnly();
		}, 5000) as unknown as number;

		// Also set up a listener for storage events (in case localStorage is modified by another tab)
		window.addEventListener('storage', (event) => {
			if (
				event.key === 'currentCluster' ||
				event.key === 'clusterSwitched' ||
				event.key === 'lastClusterSwitchTime'
			) {
				console.log('Storage event detected:', event);

				// Update our local variables from localStorage
				const storedCluster = localStorage.getItem('currentCluster');
				const lastSwitchTimeStr = localStorage.getItem('lastClusterSwitchTime');

				if (storedCluster) {
					currentCluster = storedCluster;
				}

				if (lastSwitchTimeStr) {
					lastClusterSwitchTime = parseInt(lastSwitchTimeStr, 10);
				}
			}
		});

		return () => {
			// Clean up interval and event listener on component unmount
			if (clusterInfoInterval) clearInterval(clusterInfoInterval);
			window.removeEventListener('storage', () => {});
		};
	});
	let menu = [
		{ name: 'About us', href: '/about' },
		{ name: 'Blog', href: '/blog' },
		{ name: 'Contact us', href: '/contact' },
		{ name: 'Library', href: '/library' },
		{ name: 'Newsletter', href: '/news' },
		{ name: 'Support Center', href: '/support' },
		{ name: 'Resources', href: '/resource' },
		{ name: 'Playground', href: '/play' },
		{ name: 'Terms', href: '/terms' },
		{ name: 'Pro Version', href: '/pro' },
		{ name: 'License', href: '/license' }
	];
	let mega = uiHelpers();
	let megaStatus = $state(false);
	$effect(() => {
		navStatus = nav.isOpen;
		megaStatus = mega.isOpen;
	});
	import { Darkmode } from 'svelte-5-ui-lib';
	$effect(() => {
		dropdownUserStatus = dropdownUser.isOpen;
		navStatus = nav.isOpen;
		activeUrl = $page.url.pathname;
	});
</script>

<div class="h-16">
	<Navbar {navStatus} hamburgerMenu={false}>
		{#snippet brand()}
			<NavBrand siteName="Trivy Glass">
				<img width="30" src="/trivyglass.png" alt="svelte icon" />
			</NavBrand>
		{/snippet}
		{#snippet navSlotBlock()}
			<div class="flex items-center space-x-1 md:order-2">
				<div class="mr-2 flex items-center">
					{#if connectionError}
						<div class="mr-2 flex items-center text-red-500" title={connectionError}>
							<ExclamationCircleSolid class="h-5 w-5" />
						</div>
					{/if}
					<div class="relative flex items-center">
						<div class="mr-2 hidden text-sm font-medium md:block">
							Cluster: <span class="font-bold">{currentCluster}</span>
						</div>

						<!-- Quick Cluster Change Dropdown -->
						<div class="relative mr-2">
							<Button color="gray" class="flex items-center p-2" onclick={dropdownUser.toggle}>
								<ServerSolid class="mr-1 h-5 w-5" />
								<ChevronDownOutline class="h-4 w-4" />
							</Button>

							<Dropdown
								dropdownStatus={dropdownUserStatus}
								closeDropdown={closeDropdownUser}
								params={{ y: 0, duration: 200, easing: sineIn }}
								class="absolute right-0 top-[40px] z-50 w-56"
							>
								<DropdownHeader>
									<span class="block text-sm">Switch Cluster</span>
								</DropdownHeader>
								<DropdownUl class="py-2">
									{#if isLoading}
										<DropdownLi class="flex justify-center py-2">
											<Spinner color="blue" />
										</DropdownLi>
									{:else}
										{#each clusters as cluster}
											<DropdownLi
												class="cursor-pointer {currentCluster === cluster.name
													? 'bg-gray-100 dark:bg-gray-700'
													: ''}"
											>
												<button
													class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600"
													onclick={() => switchCluster(cluster.name)}
												>
													<div class="flex items-center">
														<ServerSolid class="mr-2 h-4 w-4 text-gray-500" />
														<span>{cluster.name}</span>
														{#if currentCluster === cluster.name}
															<span
																class="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-300"
															>
																Active
															</span>
														{/if}
													</div>
												</button>
											</DropdownLi>
										{/each}
									{/if}
								</DropdownUl>
							</Dropdown>
						</div>

						<!-- Cluster Manager Button -->
						<Button
							color="gray"
							class="cluster-manager-button p-2"
							onclick={toggleClusterManager}
							title="Manage Clusters"
						>
							<CogSolid class="h-5 w-5" />
						</Button>
					</div>
				</div>

				<Darkmode />

				<NavHamburger {toggleNav} />
			</div>
		{/snippet}
		<NavUl class="!m-0 hidden !h-0 !w-0 !overflow-hidden !p-0" {activeUrl}>
			<NavLi href="/" class="hidden">.</NavLi>
		</NavUl>
	</Navbar>
	<div class="relative">
		<MegaMenu
			items={menu}
			dropdownStatus={megaStatus}
			class="absolute -top-[20px] left-[300px] w-[400px]"
		>
			{#snippet children(prop)}
				<a href={prop.item.href} class="hover:text-primary-600 dark:hover:text-primary-500"
					>{prop.item.name}</a
				>
			{/snippet}
		</MegaMenu>
	</div>
</div>

<!-- Cluster Manager -->
<ClusterManager toggleOpen={toggleClusterManager} />
