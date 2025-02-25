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
		ShieldCheckSolid
	} from 'flowbite-svelte-icons';
	import { page } from '$app/stores';
	import { beforeNavigate, afterNavigate } from '$app/navigation';
	import '../app.css';
	import NavBar from '../components/NavBar.svelte';

	let activeUrl = $state('');
	let isDemoOpen = $state(true); // Sidebar starts open
	let loading = $state(false);

	const spanClass = 'flex-1 ms-3 whitespace-nowrap';
	const demoSidebarUi = uiHelpers();
	const closeDemoSidebar = demoSidebarUi.close;

	// Control dropdown states (start open)
	let isClusterOpen = $state(true);
	let isNamespaceOpen = $state(true);

	beforeNavigate((navigation) => {
		loading = true;
	});

	afterNavigate((navigation) => {
		loading = false;
		activeUrl = $page.url.pathname;
		isDemoOpen = demoSidebarUi.isOpen;
	});

	let { children } = $props();

	function Placeholder() {
		return `
            <div class="flex h-full w-full flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <svg class="h-12 w-12 animate-spin mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"></path>
                </svg>
                <p>Loading...</p>
            </div>
        `;
	}
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
		<div class="h-full flex-1 overflow-hidden px-4 md:ml-64">
			<div
				class="flex h-full w-full flex-col rounded-lg border-2 border-dashed border-gray-200 p-4 dark:border-gray-700"
			>
				<div
					class="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex-1 overflow-x-auto overflow-y-auto"
				>
					{#if loading}
						{@html Placeholder()}
					{:else}
						{@render children()}
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
