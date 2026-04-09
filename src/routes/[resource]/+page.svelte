<script lang="ts">
	import ReportHeader from '../../components/ReportHeader.svelte';
	import ReportTable from '../../components/ReportTable.svelte';
	import { SvelteMap } from 'svelte/reactivity';

	// data now includes the dynamic columns from the CRD
	interface Manifest {
		[key: string]: string | number | object | null; // Adjust based on your actual data structure
	}

	interface Data {
		manifests: Manifest[];
		clusterName: string;
		resource: string;
	}

	interface Props {
		data: Data;
	}

	interface Metadata {
		namespace?: string;
		name: string;
		uid?: string;
	}

	interface Manifest {
		[key: string]: string | number | object | null;
	}

	interface Report {
		metadata: Metadata;
		[key: string]: unknown;
	}

	let { data }: Props = $props();

	// Helper functions to extract metadata from manifests
	function getResourceName(manifest: Manifest): string {
		// Try to find name in various possible locations
		if (
			manifest.metadata &&
			typeof manifest.metadata === 'object' &&
			'name' in manifest.metadata &&
			typeof manifest.metadata.name === 'string'
		) {
			return manifest.metadata.name;
		}

		// Fallback options
		if (typeof manifest.name === 'string') return manifest.name;
		if (typeof manifest.Name === 'string') return manifest.Name;

		// Last resort - generate placeholder if no name found
		return `Resource-${Math.random().toString(36).substring(2, 7)}`;
	}

	function getResourceNamespace(manifest: Manifest): string | undefined {
		// Try to find namespace in metadata
		if (
			manifest.metadata &&
			typeof manifest.metadata === 'object' &&
			'namespace' in manifest.metadata &&
			typeof manifest.metadata.namespace === 'string'
		) {
			return manifest.metadata.namespace;
		}

		// Fallback options
		if (typeof manifest.namespace === 'string') return manifest.namespace;
		if (typeof manifest.Namespace === 'string') return manifest.Namespace;

		return undefined;
	}

	function getResourceUID(manifest: Manifest): string | undefined {
		// Try to find UID in metadata
		if (
			manifest.metadata &&
			typeof manifest.metadata === 'object' &&
			'uid' in manifest.metadata &&
			typeof manifest.metadata.uid === 'string'
		) {
			return manifest.metadata.uid;
		}

		// Fallback options
		if (typeof manifest.uid === 'string') return manifest.uid;
		if (typeof manifest.UID === 'string') return manifest.UID;

		return undefined;
	}

	// Function to create a unique key for a manifest (excluding metadata and age)
	function createUniqueKey(manifest: Manifest): string {
		return Object.entries(manifest)
			.filter(([key]) => key !== 'metadata' && key !== 'Age')
			.map(([key, value]) => `${key}:${JSON.stringify(value)}`)
			.sort()
			.join('|');
	}

	const reportsWithMetadata: Report[] = $derived(
		data.manifests.map((manifest) => {
			const report: Report = {
				...manifest,
				metadata: {
					name: getResourceName(manifest),
					namespace: getResourceNamespace(manifest),
					uid: getResourceUID(manifest)
				}
			};
			return report;
		})
	);

	let showSummary = false;

	// Derived computations from data.manifests
	const computedCounts = $derived.by(() => {
		const uniqueGroups = new SvelteMap<string, Manifest[]>();
		const totalCounts: Record<string, number> = {};
		const uniqueCounts: Record<string, number> = {};

		// Group manifests by their unique key
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
		const uniqueManifests = Array.from(uniqueGroups.values()).map((group) => group[0]);
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

		return { uniqueCounts, totalCounts, uniqueGroups };
	});

	let uniqueCounts = $derived(computedCounts.uniqueCounts);
	let totalCounts = $derived(computedCounts.totalCounts);

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
</script>

<ReportHeader title={data.resource} name={null} summaryCounts={{}} {showSummary} />

<!-- Custom summary display with stacked layout -->
<div class="mt-4 mb-8">
	<div class="flex flex-wrap gap-6">
		{#each Object.keys(totalCounts) as key}
			<div class="flex flex-col items-center">
				<div class={getTextColor(key) + ' font-medium'}>
					{key.replace('Count', '')}: {totalCounts[key]}
				</div>
				<div class={getTextColor(key) + ' text-sm opacity-80'}>
					Unique: {uniqueCounts[key] || 0}
				</div>
			</div>
		{/each}
	</div>
	<div class="mt-2 text-xs text-gray-600">
		<em
			>* Unique counts exclude records with duplicate values (excluding namespace, name, and age)</em
		>
	</div>
</div>

<!-- Pass the dynamic columns directly -->
<ReportTable reports={reportsWithMetadata} reportType={data.resource} />
