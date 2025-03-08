<script lang="ts">
	import Secrets from './Secrets.svelte';
	import SecurityChecks from './SecurityChecks.svelte';
	import ReportHeader from './ReportHeader.svelte';
	import ComplianceComponent from './ComplianceComponent.svelte';
	import Vulnerabilities from './Vulnerabilities.svelte';
	import SBOM from './SBOM.svelte';
	import { Card, Badge } from 'svelte-5-ui-lib';
	import DownloadReport from './DownloadReport.svelte';

	const { data } = $props();
</script>

<ReportHeader title={data.resource} name={data.name} />
<DownloadReport {data} />
<div class="container mx-auto grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-5">
	<!-- Metadata Card -->
	<Card
		class="rounded-lg border border-gray-200 shadow-md transition-shadow duration-300 hover:shadow-lg dark:border-gray-700"
	>
		<div class="rounded-t-lg bg-red-50 p-4 dark:bg-red-800">
			<h2 class="text-xl font-bold text-gray-800 dark:text-gray-200">Report Metadata</h2>
		</div>
		<div class="space-y-2 p-4 text-gray-700 dark:text-gray-300">
			<p class="whitespace-normal break-words">
				<strong>Name:</strong>
				{data.manifest.metadata.name ?? 'N/A'}
			</p>
			<p class="whitespace-normal break-words">
				<strong>Namespace:</strong>
				{data.manifest.metadata.namespace ?? 'N/A'}
			</p>
			<p class="whitespace-normal break-words">
				<strong>Created:</strong>
				{data.manifest.metadata.creationTimestamp
					? new Date(data.manifest.metadata.creationTimestamp).toLocaleString()
					: 'N/A'}
			</p>
		</div>
	</Card>

	<!-- Scanner Card -->
	{#if data.manifest?.report?.scanner}
		<Card
			class="rounded-lg border border-gray-200 shadow-md transition-shadow duration-300 hover:shadow-lg dark:border-gray-700"
		>
			<div class="rounded-t-lg bg-teal-50 p-4 dark:bg-teal-900">
				<h2 class="text-xl font-bold text-teal-800 dark:text-teal-200">Scanner Details</h2>
			</div>
			<div class="space-y-2 p-4 text-gray-700 dark:text-gray-300">
				<p class="whitespace-normal break-words">
					<strong>Name:</strong>
					{data.manifest?.report?.scanner?.name ?? 'N/A'}
				</p>
				<p class="whitespace-normal break-words">
					<strong>Vendor:</strong>
					{data.manifest?.report?.scanner?.vendor ?? 'N/A'}
				</p>
				<p class="whitespace-normal break-words">
					<strong>Version:</strong>
					{data.manifest?.report?.scanner?.version ?? 'N/A'}
				</p>
			</div>
		</Card>
	{/if}
	<!-- Registry Card-->
	{#if data.manifest?.report?.registry}
		<Card
			class="rounded-lg border border-gray-200 shadow-md transition-shadow duration-300 hover:shadow-lg dark:border-gray-700"
		>
			<div class="rounded-t-lg bg-blue-50 p-4 dark:bg-blue-900">
				<h2 class="text-xl font-bold text-blue-800 dark:text-blue-200">Registry Details</h2>
			</div>
			<div class="space-y-2 p-4 text-gray-700 dark:text-gray-300">
				<p
					class="whitespace
      -normal break-words"
				>
					<strong>Server:</strong>
					{data.manifest.report.registry.server ?? 'N/A'}
				</p>
			</div>
		</Card>
	{/if}

	<!-- Summary Card -->
	{#if data.manifest?.report?.summary}
		<Card
			class="rounded-lg border border-gray-200 shadow-md transition-shadow duration-300 hover:shadow-lg dark:border-gray-700"
		>
			<div class="rounded-t-lg bg-indigo-50 p-4 dark:bg-indigo-900">
				<h2 class="text-xl font-bold text-indigo-800 dark:text-indigo-200">Security Summary</h2>
			</div>
			<div class="flex flex-col gap-2 p-4 text-gray-700 dark:text-gray-300">
				<div class="flex flex-wrap items-center gap-2">
					<Badge class="bg-red-500 text-white dark:bg-red-600 dark:text-white"
						>Critical: {data.manifest.report.summary.criticalCount ?? 0}</Badge
					>
					<Badge class="bg-orange-500 text-white dark:bg-orange-600 dark:text-white"
						>High: {data.manifest.report.summary.highCount ?? 0}</Badge
					>
					<Badge class="bg-yellow-400 text-gray-800 dark:bg-yellow-600 dark:text-gray-200"
						>Medium: {data.manifest.report.summary.mediumCount ?? 0}</Badge
					>
					<Badge class="bg-green-500 text-white dark:bg-green-600 dark:text-white"
						>Low: {data.manifest.report.summary.lowCount ?? 0}</Badge
					>
				</div>
			</div>
		</Card>
	{/if}
	<!-- Artifact Card -->
	{#if data.manifest?.report?.artifact}
		<Card
			class="rounded-lg border border-gray-200 shadow-md transition-shadow duration-300 hover:shadow-lg dark:border-gray-700"
		>
			<div class="rounded-t-lg bg-indigo-50 p-4 dark:bg-indigo-900">
				<h2 class="text-xl font-bold text-indigo-800 dark:text-indigo-200">Artifact</h2>
			</div>
			<div class="flex flex-col gap-2 p-4 text-gray-700 dark:text-gray-300">
				<p class="whitespace-normal break-words">
					<strong>Digest:</strong>
					{data.manifest.report.artifact.digest ?? 'N/A'}
				</p>
				<p class="whitespace-normal break-words">
					<strong>Repository:</strong>
					{data.manifest.report.artifact.repository ?? 'N/A'}
				</p>
				<p class="whitespace-normal break-words">
					<strong>Tag:</strong>
					{data.manifest.report.artifact.tag ?? 'N/A'}
				</p>
			</div>
		</Card>
	{/if}

	{#if data.manifest?.report?.os}
		<Card
			class="rounded-lg border border-gray-200 shadow-md transition-shadow duration-300 hover:shadow-lg dark:border-gray-700"
		>
			<div class="rounded-t-lg bg-indigo-50 p-4 dark:bg-indigo-900">
				<h2 class="text-xl font-bold text-indigo-800 dark:text-indigo-200">OS</h2>
			</div>
			<div class="flex flex-col gap-2 p-4 text-gray-700 dark:text-gray-300">
				<p
					class="whitespace
    -normal break-words"
				>
					<strong>Family:</strong>
					{data.manifest.report.os.family ?? 'N/A'}
				</p>
				<p class="whitespace-normal break-words">
					<strong>Name :</strong>
					{data.manifest.report.os.name ?? 'N/A'}
				</p>
			</div>
		</Card>
	{/if}
</div>
<div class="container mx-auto p-6">
	<!-- Security Checks Section -->
	{#if data.manifest?.report?.checks}
		<SecurityChecks checks={data.manifest.report.checks}></SecurityChecks>
	{/if}
	{#if data.resource === 'clustercompliancereports'}
		<ComplianceComponent {data} />
	{/if}

	{#if data.manifest?.report?.secrets}
		<Secrets secrets={data.manifest.report.secrets}></Secrets>
	{/if}

	{#if data.manifest?.report?.vulnerabilities}
		<Vulnerabilities vulnerabilities={data.manifest.report.vulnerabilities}></Vulnerabilities>
	{/if}

	{#if data.manifest?.report?.components}
		<SBOM components={data.manifest.report.components}></SBOM>
	{/if}
</div>
