<script lang="ts">
	import {
		CloseButton,
		Sidebar,
		SidebarItem,
		SidebarDropdownWrapper,
		uiHelpers
	} from 'svelte-5-ui-lib';
	import {
		ArchiveSolid,
		BugSolid,
		CogSolid,
		LockSolid,
		ServerSolid,
		ShieldCheckSolid,
		HomeSolid as Home
	} from 'flowbite-svelte-icons';
	import { page } from '$app/stores';
	import { beforeNavigate, afterNavigate } from '$app/navigation';
	import '../app.css';
	import NavBar from '../components/NavBar.svelte';

	let activeUrl = $state('');
	let isDemoOpen = $state(true); // Sidebar starts open
	let loading = $state(false);

	const demoSidebarUi = uiHelpers();
	const closeDemoSidebar = demoSidebarUi.close;

	// Control dropdown states (start open)
	let isClusterOpen = $state(true);
	let isNamespaceOpen = $state(true);

	beforeNavigate(() => {
		loading = true;
	});

	afterNavigate(() => {
		loading = false;
		activeUrl = $page.url.pathname;
		isDemoOpen = demoSidebarUi.isOpen;
	});

	let { children } = $props();
</script>

<div class="flex h-screen flex-col overflow-hidden">
	<NavBar></NavBar>
	<div class="relative flex flex-1 overflow-hidden">
		<Sidebar
			{activeUrl}
			backdrop={false}
			isOpen={isDemoOpen}
			closeSidebar={closeDemoSidebar}
			params={{ x: -50, duration: 50 }}
			class="z-50 flex h-full flex-col pt-6"
			position="absolute"
			activeClass="p-2"
			nonActiveClass="p-2"
			isSingle={false}
		>
			<CloseButton
				onclick={closeDemoSidebar}
				color="gray"
				class="absolute right-2 top-2 p-2 md:hidden"
			/>
			<SidebarItem label="Dashboard" href="/">
				{#snippet iconSlot()}
					<Home
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
			</SidebarItem>
			<SidebarDropdownWrapper label="Cluster Reports" isOpen={isClusterOpen} btnClass="p-2">
				{#snippet iconSlot()}
					<ShieldCheckSolid
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
				<SidebarItem label="Compliance" href="/clustercompliancereports">
					{#snippet iconSlot()}
						<ShieldCheckSolid
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem label="Config Audit" href="/clusterconfigauditreports">
					{#snippet iconSlot()}
						<CogSolid
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem label="Infrastructure" href="/clusterinfraassessmentreports">
					{#snippet iconSlot()}
						<ServerSolid
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem label="RBAC Assessment" href="/clusterrbacassessmentreports">
					{#snippet iconSlot()}
						<LockSolid
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem label="SBOM" href="/clustersbomreports">
					{#snippet iconSlot()}
						<ArchiveSolid
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem label="Vulnerability" href="/clustervulnerabilityreports">
					{#snippet iconSlot()}
						<BugSolid
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
			</SidebarDropdownWrapper>

			<SidebarDropdownWrapper label="Namespace Reports" isOpen={isNamespaceOpen} btnClass="p-2">
				{#snippet iconSlot()}
					<CogSolid
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
				<SidebarItem label="Config Audit" href="/configauditreports">
					{#snippet iconSlot()}
						<CogSolid
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem label="Exposed Secrets" href="/exposedsecretreports">
					{#snippet iconSlot()}
						<LockSolid
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem label="Infrastructure" href="/infraassessmentreports">
					{#snippet iconSlot()}
						<ServerSolid
							class="text-gray-5 h-5 w-5 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem label="RBAC Assessment" href="/rbacassessmentreports">
					{#snippet iconSlot()}
						<LockSolid
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem label="SBOM" href="/sbomreports">
					{#snippet iconSlot()}
						<ArchiveSolid
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
				<SidebarItem label="Vulnerability" href="/vulnerabilityreports">
					{#snippet iconSlot()}
						<BugSolid
							class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						/>
					{/snippet}
				</SidebarItem>
			</SidebarDropdownWrapper>
		</Sidebar>
		<div class="scrollbar-thin h-full flex-1 overflow-auto px-4 md:ml-64">
			<style>
				.scrollbar-thin {
					scrollbar-width: thin;
					scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
				}
				.scrollbar-thin::-webkit-scrollbar {
					width: 6px;
					height: 6px;
				}
				.scrollbar-thin::-webkit-scrollbar-track {
					background: transparent;
				}
				.scrollbar-thin::-webkit-scrollbar-thumb {
					background-color: rgba(156, 163, 175, 0.5);
					border-radius: 3px;
				}
				.scrollbar-thin::-webkit-scrollbar-thumb:hover {
					background-color: rgba(156, 163, 175, 0.7);
				}
				/* Dark mode support */
				@media (prefers-color-scheme: dark) {
					.scrollbar-thin {
						scrollbar-color: rgba(75, 85, 99, 0.5) transparent;
					}
					.scrollbar-thin::-webkit-scrollbar-thumb {
						background-color: rgba(75, 85, 99, 0.5);
					}
					.scrollbar-thin::-webkit-scrollbar-thumb:hover {
						background-color: rgba(75, 85, 99, 0.7);
					}
				}
			</style>

			{#if loading}
				<div
					class="flex h-full w-full flex-col items-center justify-center text-gray-500 dark:text-gray-400"
				>
					<svg
						class="mb-4 h-12 w-12 animate-spin"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"
						></path>
					</svg>
					<p>Loading...</p>
				</div>
			{:else}
				{@render children()}
			{/if}
		</div>
	</div>
</div>
