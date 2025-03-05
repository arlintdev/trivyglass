<script lang="ts">
	import ReportHeader from '../../components/ReportHeader.svelte';
	import ReportTable from '../../components/ReportTable.svelte';
	import { Heading, P } from 'svelte-5-ui-lib';

	// data now includes the dynamic columns from the CRD
	export let data: {
		manifests: any[];
		clusterName: string;
		resource: string;
	};

	let uniqueCounts = {};
	let totalCounts = {};
	let showSummary = false; // We'll create our own custom summary display

	// Function to create a unique key for a manifest (excluding metadata and age)
	function createUniqueKey(manifest: any): string {
		return Object.entries(manifest)
			.filter(([key]) => key !== 'metadata' && key !== 'Age')
			.map(([key, value]) => `${key}:${JSON.stringify(value)}`)
			.sort()
			.join('|');
	}

	// Group manifests by their unique key (excluding metadata and age)
	const uniqueGroups = new Map<string, any[]>();

	// First pass: group manifests by their unique key
	for (const manifest of data.manifests) {
		const uniqueKey = createUniqueKey(manifest);
		if (!uniqueGroups.has(uniqueKey)) {
			uniqueGroups.set(uniqueKey, []);
		}
		uniqueGroups.get(uniqueKey)!.push(manifest);
	}

	// Calculate total counts from all manifests
	for (const manifest of data.manifests) {
		for (const key in manifest) {
			if (typeof manifest[key] === 'number') {
				if (!totalCounts[key]) {
					totalCounts[key] = 0;
				}
				totalCounts[key] += manifest[key];
			}
		}
	}

	// Calculate unique counts using one representative from each group
	const uniqueManifests = Array.from(uniqueGroups.values()).map(group => group[0]);
	for (const manifest of uniqueManifests) {
		for (const key in manifest) {
			if (typeof manifest[key] === 'number') {
				if (!uniqueCounts[key]) {
					uniqueCounts[key] = 0;
				}
				uniqueCounts[key] += manifest[key];
			}
		}
	}

	// Function to get text color based on key (copied from ReportHeader)
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

	console.log({ uniqueCounts, totalCounts });
</script>

<ReportHeader title={data.resource} name={null} summaryCounts={{}} {showSummary} />

<!-- Custom summary display with stacked layout -->
<div class="mb-8 mt-4">
	<div class="flex flex-wrap gap-6">
		{#each Object.keys(totalCounts) as key}
			<div class="flex flex-col items-center">
				<div class={getTextColor(key) + " font-medium"}>
					{key.replace('Count', '')}: {totalCounts[key]}
				</div>
				<div class={getTextColor(key) + " text-sm opacity-80"}>
					Unique: {uniqueCounts[key] || 0}
				</div>
			</div>
		{/each}
	</div>
	<div class="mt-2 text-xs text-gray-600">
		<em>* Unique counts exclude records with duplicate values (excluding namespace, name, and age)</em>
	</div>
</div>

<!-- Pass the dynamic columns directly -->
<ReportTable reports={data.manifests} reportType={data.resource} />
