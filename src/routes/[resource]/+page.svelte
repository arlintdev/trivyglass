<script lang="ts">
	import ReportHeader from '../../components/ReportHeader.svelte';
	import ReportTable from '../../components/ReportTable.svelte';

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

	const reportsWithMetadata: Report[] = data.manifests.map((manifest) => {
		const report: Report = {
			...manifest,
			metadata: {
				name: getResourceName(manifest), // Extract name from manifest
				namespace: getResourceNamespace(manifest), // Extract namespace if available
				uid: getResourceUID(manifest) // Extract UID if available
			}
		};
		return report;
	});

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

	let uniqueCounts: Record<string, number> = {};
	let totalCounts: Record<string, number> = {};
	let showSummary = false; // We'll create our own custom summary display

	// Function to create a unique key for a manifest (excluding metadata and age)
	function createUniqueKey(manifest: Manifest): string {
		return Object.entries(manifest)
			.filter(([key]) => key !== 'metadata' && key !== 'Age')
			.map(([key, value]) => `${key}:${JSON.stringify(value)}`)
			.sort()
			.join('|');
	}

	// Group manifests by their unique key (excluding metadata and age)
	const uniqueGroups = new Map<string, Manifest[]>();

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
