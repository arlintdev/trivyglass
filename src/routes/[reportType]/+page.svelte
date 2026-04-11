<script lang="ts">
	import ReportHeader from '../../components/ReportHeader.svelte';
	import ReportTable from '../../components/ReportTable.svelte';
	import { SvelteMap } from 'svelte/reactivity';

	interface Manifest {
		[key: string]: string | number | object | null;
	}

	interface Data {
		manifests: Manifest[];
		clusterName: string;
		resource: string;
		label: string;
		hasCluster: boolean;
		hasNamespace: boolean;
		error?: string;
	}

	interface Props {
		data: Data;
	}

	interface Metadata {
		namespace?: string;
		name: string;
		uid?: string;
	}

	interface Report {
		metadata: Metadata;
		[key: string]: unknown;
	}

	let { data }: Props = $props();

	// Scope filter: 'all', 'cluster', 'namespace'
	let scopeFilter = $state<'all' | 'cluster' | 'namespace'>('all');
	const hasBothScopes = $derived(data.hasCluster && data.hasNamespace);

	// Filter manifests by selected scope
	const scopedManifests = $derived(
		scopeFilter === 'all'
			? data.manifests
			: data.manifests.filter((m) => (m as Record<string, unknown>)._scope === scopeFilter)
	);

	// Helper functions to extract metadata from manifests
	function getResourceName(manifest: Manifest): string {
		if (
			manifest.metadata &&
			typeof manifest.metadata === 'object' &&
			'name' in manifest.metadata &&
			typeof manifest.metadata.name === 'string'
		) {
			return manifest.metadata.name;
		}
		if (typeof manifest.name === 'string') return manifest.name;
		if (typeof manifest.Name === 'string') return manifest.Name;
		return `Resource-${Math.random().toString(36).substring(2, 7)}`;
	}

	function getResourceNamespace(manifest: Manifest): string | undefined {
		if (
			manifest.metadata &&
			typeof manifest.metadata === 'object' &&
			'namespace' in manifest.metadata &&
			typeof manifest.metadata.namespace === 'string'
		) {
			return manifest.metadata.namespace;
		}
		if (typeof manifest.namespace === 'string') return manifest.namespace;
		if (typeof manifest.Namespace === 'string') return manifest.Namespace;
		return undefined;
	}

	function getResourceUID(manifest: Manifest): string | undefined {
		if (
			manifest.metadata &&
			typeof manifest.metadata === 'object' &&
			'uid' in manifest.metadata &&
			typeof manifest.metadata.uid === 'string'
		) {
			return manifest.metadata.uid;
		}
		if (typeof manifest.uid === 'string') return manifest.uid;
		if (typeof manifest.UID === 'string') return manifest.UID;
		return undefined;
	}

	function createUniqueKey(manifest: Manifest): string {
		return Object.entries(manifest)
			.filter(
				([key]) => key !== 'metadata' && key !== 'Age' && key !== '_scope' && key !== '_crdPlural'
			)
			.map(([key, value]) => `${key}:${JSON.stringify(value)}`)
			.sort()
			.join('|');
	}

	const reportsWithMetadata: Report[] = $derived(
		scopedManifests.map((manifest) => {
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

	const computedCounts = $derived.by(() => {
		const uniqueGroups = new SvelteMap<string, Manifest[]>();
		const totalCounts: Record<string, number> = {};
		const uniqueCounts: Record<string, number> = {};

		for (const manifest of scopedManifests) {
			const uniqueKey = createUniqueKey(manifest);
			if (!uniqueGroups.has(uniqueKey)) {
				uniqueGroups.set(uniqueKey, []);
			}
			uniqueGroups.get(uniqueKey)!.push(manifest);
		}

		for (const manifest of scopedManifests) {
			for (const key in manifest) {
				if (key === '_scope' || key === '_crdPlural') continue;
				if (typeof manifest[key] === 'number') {
					if (!totalCounts[key]) totalCounts[key] = 0;
					totalCounts[key] += manifest[key] as number;
				}
			}
		}

		const uniqueManifests = Array.from(uniqueGroups.values()).map((group) => group[0]);
		for (const manifest of uniqueManifests) {
			for (const key in manifest) {
				if (key === '_scope' || key === '_crdPlural') continue;
				if (typeof manifest[key] === 'number') {
					if (!uniqueCounts[key]) uniqueCounts[key] = 0;
					uniqueCounts[key] += manifest[key] as number;
				}
			}
		}

		return { uniqueCounts, totalCounts, uniqueGroups };
	});

	let uniqueCounts = $derived(computedCounts.uniqueCounts);
	let totalCounts = $derived(computedCounts.totalCounts);

	function getSeverityTag(key: string): string | undefined {
		const k = key.toLowerCase();
		if (k === 'critical' || k === 'fail' || k === 'error') return 'nd-tag-critical';
		if (k === 'high') return 'nd-tag-high';
		if (k === 'medium' || k === 'warning') return 'nd-tag-medium';
		if (k === 'low') return 'nd-tag-low';
		if (k === 'pass' || k === 'success') return 'nd-tag-pass';
		return 'nd-tag-info';
	}
</script>

<ReportHeader
	title={data.label}
	href="/{data.resource}"
	name={null}
	summaryCounts={{}}
	{showSummary}
/>

<!-- Scope filter -->
{#if hasBothScopes}
	<div style="display: flex; gap: var(--space-xs); margin-bottom: var(--space-md);">
		<button
			class="nd-btn nd-btn-sm"
			class:nd-btn-primary={scopeFilter === 'all'}
			class:nd-btn-ghost={scopeFilter !== 'all'}
			onclick={() => (scopeFilter = 'all')}
		>
			All
		</button>
		<button
			class="nd-btn nd-btn-sm"
			class:nd-btn-primary={scopeFilter === 'cluster'}
			class:nd-btn-ghost={scopeFilter !== 'cluster'}
			onclick={() => (scopeFilter = 'cluster')}
		>
			Cluster-wide
		</button>
		<button
			class="nd-btn nd-btn-sm"
			class:nd-btn-primary={scopeFilter === 'namespace'}
			class:nd-btn-ghost={scopeFilter !== 'namespace'}
			onclick={() => (scopeFilter = 'namespace')}
		>
			Workload
		</button>
	</div>
{/if}

<!-- Summary counts -->
<div style="display: flex; flex-wrap: wrap; gap: var(--space-lg); margin-bottom: var(--space-lg);">
	{#each Object.keys(totalCounts) as key}
		<div style="display: flex; flex-direction: column; align-items: center;">
			<span
				class="nd-tag {getSeverityTag(key)}"
				style="font-size: var(--body); padding: var(--space-xs) var(--space-sm);"
			>
				{key.replace('Count', '')}: {totalCounts[key]}
			</span>
			<span
				class="nd-caption"
				style="margin-top: var(--space-2xs); color: var(--nd-text-secondary);"
			>
				Unique: {uniqueCounts[key] || 0}
			</span>
		</div>
	{/each}
</div>
{#if Object.keys(totalCounts).length > 0}
	<p class="nd-caption" style="color: var(--nd-text-disabled); margin-bottom: var(--space-md);">
		* Unique counts exclude records with duplicate values (excluding namespace, name, and age)
	</p>
{/if}

<ReportTable reports={reportsWithMetadata} reportType={data.resource} />
