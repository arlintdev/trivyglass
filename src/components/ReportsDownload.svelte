<script lang="ts">
	interface Props {
		title: string;
		clusterName: string | null;
		summaryCounts: Record<string, number>;
		showSummary: boolean;
	}

	let { title, clusterName, showSummary, summaryCounts }: Props = $props();

	function getStatusColor(key: string): string {
		switch (key) {
			case 'criticalCount': return 'var(--accent)';
			case 'highCount': return 'var(--warning)';
			case 'mediumCount': return 'var(--warning)';
			case 'lowCount': return 'var(--success)';
			default: return 'var(--nd-text-secondary)';
		}
	}
</script>

<header style="text-align: center; margin-bottom: var(--space-xl);">
	<h1 class="nd-heading" style="font-size: var(--display-md); color: var(--nd-text-display);">{title}</h1>
	<p class="nd-body" style="color: var(--nd-text-secondary); margin-top: var(--space-sm);">
		Cluster: <span style="color: var(--nd-text-display); font-weight: 500;">{clusterName}</span>
	</p>
	{#if showSummary}
		<div style="display: flex; justify-content: center; gap: var(--space-md); margin-top: var(--space-sm);">
			{#each Object.entries(summaryCounts) as [key, value]}
				<span class="nd-mono" style="font-size: var(--body-sm); color: {getStatusColor(key)};">
					{key.replace('Count', '')}: {value}
				</span>
			{/each}
		</div>
	{/if}
</header>
