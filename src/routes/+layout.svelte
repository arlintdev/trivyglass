<script lang="ts">
	import { page } from '$app/stores';
	import { beforeNavigate, afterNavigate } from '$app/navigation';
	import '../app.css';
	import NavBar from '../components/NavBar.svelte';
	import ToastContainer from '../components/ToastContainer.svelte';

	let activeUrl = $state('');
	let loading = $state(false);
	let sidebarCollapsed = $state(false);
	let mobileMenuOpen = $state(false);

	beforeNavigate(() => {
		loading = true;
		mobileMenuOpen = false;
	});

	afterNavigate(() => {
		loading = false;
		activeUrl = $page.url.pathname;
	});

	let { children } = $props();

	function isActive(href: string) {
		if (href === '/') return activeUrl === '/';
		return activeUrl.startsWith(href);
	}

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<div style="display: flex; flex-direction: column; height: 100vh; overflow: hidden;">
	<NavBar onHamburgerClick={toggleMobileMenu} />
	<ToastContainer />
	<div style="display: flex; flex: 1; overflow: hidden; position: relative;">
		<!-- Mobile overlay -->
		<div
			class="nd-sidebar-overlay"
			class:visible={mobileMenuOpen}
			onclick={closeMobileMenu}
			onkeydown={(e) => e.key === 'Escape' && closeMobileMenu()}
			role="button"
			tabindex="-1"
		></div>

		<!-- Sidebar -->
		<nav
			class="nd-sidebar nd-scrollbar"
			class:collapsed={sidebarCollapsed}
			class:mobile-open={mobileMenuOpen}
			style="flex-shrink: 0;"
		>
			<!-- Collapse toggle (desktop only) -->
			<button class="nd-sidebar-collapse-btn" onclick={toggleSidebar} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
					style="transform: rotate({sidebarCollapsed ? '180deg' : '0deg'}); transition: transform var(--duration-micro) var(--ease-out);"
				>
					<polyline points="15 18 9 12 15 6"/>
				</svg>
			</button>

			<div class="nd-sidebar-group">
				<a href="/" class="nd-sidebar-item" class:active={isActive('/')} title="Dashboard">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
						<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
						<polyline points="9 22 9 12 15 12 15 22"/>
					</svg>
					<span class="nd-sidebar-item-label">Dashboard</span>
				</a>
			</div>

			<div class="nd-sidebar-group">
				<span class="nd-label nd-sidebar-section-label" style="padding: var(--space-sm) var(--space-md); font-size: var(--caption); color: var(--nd-text-disabled);">REPORTS</span>

				<a href="/vulnerabilities" class="nd-sidebar-item" class:active={isActive('/vulnerabilities')} title="Vulnerabilities">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
					<span class="nd-sidebar-item-label">Vulnerabilities</span>
				</a>

				<a href="/config-audit" class="nd-sidebar-item" class:active={isActive('/config-audit')} title="Config Audit">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
					<span class="nd-sidebar-item-label">Config Audit</span>
				</a>

				<a href="/compliance" class="nd-sidebar-item" class:active={isActive('/compliance')} title="Compliance">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
					<span class="nd-sidebar-item-label">Compliance</span>
				</a>

				<a href="/sbom" class="nd-sidebar-item" class:active={isActive('/sbom')} title="SBOM">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
					<span class="nd-sidebar-item-label">SBOM</span>
				</a>

				<a href="/secrets" class="nd-sidebar-item" class:active={isActive('/secrets')} title="Exposed Secrets">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
					<span class="nd-sidebar-item-label">Exposed Secrets</span>
				</a>

				<a href="/rbac" class="nd-sidebar-item" class:active={isActive('/rbac')} title="RBAC Assessment">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
					<span class="nd-sidebar-item-label">RBAC Assessment</span>
				</a>

				<a href="/infrastructure" class="nd-sidebar-item" class:active={isActive('/infrastructure')} title="Infrastructure">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
					<span class="nd-sidebar-item-label">Infrastructure</span>
				</a>
			</div>
		</nav>

		<!-- Main Content -->
		<main class="nd-scrollbar nd-main-content" style="flex: 1; overflow: auto; padding: var(--space-md);">
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
