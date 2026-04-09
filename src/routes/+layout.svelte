<script lang="ts">
	import { page } from '$app/stores';
	import { beforeNavigate, afterNavigate } from '$app/navigation';
	import '../app.css';
	import NavBar from '../components/NavBar.svelte';
	import ToastContainer from '../components/ToastContainer.svelte';

	let activeUrl = $state('');
	let sidebarOpen = $state(true);
	let loading = $state(false);

	let isClusterOpen = $state(true);
	let isNamespaceOpen = $state(true);

	beforeNavigate(() => {
		loading = true;
	});

	afterNavigate(() => {
		loading = false;
		activeUrl = $page.url.pathname;
	});

	let { children } = $props();

	function isActive(href: string) {
		return activeUrl === href;
	}
</script>

<div style="display: flex; flex-direction: column; height: 100vh; overflow: hidden;">
	<NavBar />
	<ToastContainer />
	<div style="display: flex; flex: 1; overflow: hidden; position: relative;">
		<!-- Sidebar -->
		<nav class="nd-sidebar nd-scrollbar" style="flex-shrink: 0;">
			<!-- Dashboard -->
			<div class="nd-sidebar-group">
				<a href="/" class="nd-sidebar-item" class:active={isActive('/')}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
						<polyline points="9 22 9 12 15 12 15 22"/>
					</svg>
					Dashboard
				</a>
			</div>

			<!-- Cluster Reports -->
			<div class="nd-sidebar-group">
				<button class="nd-sidebar-toggle" onclick={() => (isClusterOpen = !isClusterOpen)}>
					<span style="display: flex; align-items: center; gap: var(--space-sm);">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
							<polyline points="14 2 14 8 20 8"/>
						</svg>
						Cluster Reports
					</span>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate({isClusterOpen ? '180deg' : '0deg'}); transition: transform var(--duration-micro) var(--ease-out);">
						<polyline points="6 9 12 15 18 9"/>
					</svg>
				</button>
				{#if isClusterOpen}
					<a href="/clustercompliancereports" class="nd-sidebar-item nd-sidebar-item-nested" class:active={isActive('/clustercompliancereports')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
						Compliance
					</a>
					<a href="/clusterconfigauditreports" class="nd-sidebar-item nd-sidebar-item-nested" class:active={isActive('/clusterconfigauditreports')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
						Config Audit
					</a>
					<a href="/clusterinfraassessmentreports" class="nd-sidebar-item nd-sidebar-item-nested" class:active={isActive('/clusterinfraassessmentreports')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
						Infrastructure
					</a>
					<a href="/clusterrbacassessmentreports" class="nd-sidebar-item nd-sidebar-item-nested" class:active={isActive('/clusterrbacassessmentreports')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
						RBAC Assessment
					</a>
					<a href="/clustersbomreports" class="nd-sidebar-item nd-sidebar-item-nested" class:active={isActive('/clustersbomreports')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
						SBOM
					</a>
					<a href="/clustervulnerabilityreports" class="nd-sidebar-item nd-sidebar-item-nested" class:active={isActive('/clustervulnerabilityreports')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
						Vulnerability
					</a>
				{/if}
			</div>

			<!-- Namespace Reports -->
			<div class="nd-sidebar-group">
				<button class="nd-sidebar-toggle" onclick={() => (isNamespaceOpen = !isNamespaceOpen)}>
					<span style="display: flex; align-items: center; gap: var(--space-sm);">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
							<polyline points="14 2 14 8 20 8"/>
						</svg>
						Namespace Reports
					</span>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate({isNamespaceOpen ? '180deg' : '0deg'}); transition: transform var(--duration-micro) var(--ease-out);">
						<polyline points="6 9 12 15 18 9"/>
					</svg>
				</button>
				{#if isNamespaceOpen}
					<a href="/configauditreports" class="nd-sidebar-item nd-sidebar-item-nested" class:active={isActive('/configauditreports')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
						Config Audit
					</a>
					<a href="/exposedsecretreports" class="nd-sidebar-item nd-sidebar-item-nested" class:active={isActive('/exposedsecretreports')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
						Exposed Secrets
					</a>
					<a href="/infraassessmentreports" class="nd-sidebar-item nd-sidebar-item-nested" class:active={isActive('/infraassessmentreports')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
						Infrastructure
					</a>
					<a href="/rbacassessmentreports" class="nd-sidebar-item nd-sidebar-item-nested" class:active={isActive('/rbacassessmentreports')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
						RBAC Assessment
					</a>
					<a href="/sbomreports" class="nd-sidebar-item nd-sidebar-item-nested" class:active={isActive('/sbomreports')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
						SBOM
					</a>
					<a href="/vulnerabilityreports" class="nd-sidebar-item nd-sidebar-item-nested" class:active={isActive('/vulnerabilityreports')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
						Vulnerability
					</a>
				{/if}
			</div>
		</nav>

		<!-- Main Content -->
		<main class="nd-scrollbar" style="flex: 1; overflow: auto; padding: var(--space-md);">
			{#if loading}
				<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--nd-text-secondary);">
					<span class="nd-spinner" style="font-size: var(--subheading);"></span>
				</div>
			{:else}
				{@render children()}
			{/if}
		</main>
	</div>
</div>
