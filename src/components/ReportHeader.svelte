<script lang="ts">
	import { Heading, Breadcrumb, BreadcrumbItem } from 'flowbite-svelte';

	interface Props {
		title: string;
		name: string | null;
		summaryCounts?: Record<string, number>;
		showSummary?: boolean;
	}

	let { title, name, showSummary = true, summaryCounts = {} }: Props = $props();

	function getTextColor(key: string) {
		switch (key.toLowerCase()) {
			case 'critical':
				return 'text-red-600';
			case 'fail':
				return 'text-red-600';
			case 'error':
				return 'text-red-600';
			case 'warning':
				return 'text-yellow-600';
			case 'info':
				return 'text-blue-600';
			case 'pass':
				return 'text-green-600';
			case 'success':
				return 'text-green-600';
			case 'high':
				return 'text-orange-600';
			case 'medium':
				return 'text-yellow-600';
			case 'low':
				return 'text-green-600';
			case 'none':
				return 'text-gray-600';
			default:
				return 'text-blue-600';
		}
	}
</script>

<Breadcrumb>
	<BreadcrumbItem href="/" home>Home</BreadcrumbItem>
	<BreadcrumbItem href="/{title}">{title}</BreadcrumbItem>
	{#if name}
		<BreadcrumbItem href="/{title}/{name}">{name}</BreadcrumbItem>
	{/if}
</Breadcrumb>
<header class="mb-8">
	<Heading tag="h1" class="text-primary-700 dark:text-primary-500">
		{title}
	</Heading>
	{#if showSummary}
		<div class="mt-4 flex space-x-4">
			{#each Object.entries(summaryCounts) as [key, value]}
				<p class={getTextColor(key)}>{key.replace('Count', '')}: {value}</p>
			{/each}
		</div>
	{/if}
</header>
