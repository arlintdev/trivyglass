<script lang="ts">
	export let title: string;
	export let clusterName: string;
	export let summaryCounts: Record<string, number> = {};
    export let showSummary = true;
	import { Heading, P } from 'svelte-5-ui-lib';
	function getTextColor(key: string) {
		switch (key) {
			case 'criticalCount':
				return 'text-red-600';
			case 'highCount':
				return 'text-orange-600';
			case 'mediumCount':
				return 'text-yellow-600';
			case 'lowCount':
				return 'text-green-600';
			case 'noneCount':
				return 'text-gray-600';
			default:
				return 'text-blue-600';
		}
	}
</script>

<header class="mb-8 text-center">
	<Heading tag="h1" class="text-primary-700 dark:text-primary-500">
		{title}
	</Heading>
	<P class="text-xl font-bold">Cluster: {clusterName}</P>
    {#if showSummary}
        <div class="mt-4">
            {#each Object.entries(summaryCounts) as [key, value]}
                <p class={getTextColor(key)}>{key.replace('Count', '')}: {value}</p>
            {/each}
        </div>
    {/if}
</header>
