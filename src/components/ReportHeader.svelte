<script lang="ts">
	interface Props {
		title: string;
		name: string | null;
		summaryCounts?: Record<string, number>;
		showSummary?: boolean;
	}

	let { title, name, showSummary = true, summaryCounts = {} }: Props = $props();

	function getStatusColor(key: string): string {
		switch (key.toLowerCase()) {
			case 'critical': case 'fail': case 'error': return 'var(--accent)';
			case 'high': return 'var(--warning)';
			case 'warning': case 'medium': return 'var(--warning)';
			case 'pass': case 'success': case 'low': return 'var(--success)';
			default: return 'var(--nd-text-secondary)';
		}
	}
</script>

<nav class="nd-breadcrumb">
	<a href="/">Home</a>
	<span class="nd-breadcrumb-separator"></span>
	<a href="/{title}">{title}</a>
	{#if name}
		<span class="nd-breadcrumb-separator"></span>
		<span style="color: var(--nd-text-primary);">{name}</span>
	{/if}
</nav>

<header style="margin-bottom: var(--space-xl);">
	<h1 class="nd-heading" style="font-size: var(--display-md); color: var(--nd-text-display);">{title}</h1>
	{#if showSummary}
		<div style="display: flex; gap: var(--space-md); margin-top: var(--space-sm);">
			{#each Object.entries(summaryCounts) as [key, value]}
				<span class="nd-mono" style="font-size: var(--body-sm); color: {getStatusColor(key)};">
					{key.replace('Count', '')}: {value}
				</span>
			{/each}
		</div>
	{/if}
</header>
