<script lang="ts">
	import Secrets from './Secrets.svelte';
	import SecurityChecks from './SecurityChecks.svelte';
	import ReportHeader from './ReportHeader.svelte';
	import ComplianceComponent from './ComplianceComponent.svelte';
	import Vulnerabilities from './Vulnerabilities.svelte';
	import SBOM from './SBOM.svelte';
	import DownloadReport from './DownloadReport.svelte';

	const { data } = $props();
</script>

<ReportHeader title={data.resource} name={data.name} />
<DownloadReport {data} />

<div
	style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-md); padding: var(--space-lg) 0;"
>
	<!-- Metadata Card -->
	<div class="nd-card">
		<p class="nd-label" style="margin-bottom: var(--space-sm);">Report Metadata</p>
		<div style="display: flex; flex-direction: column; gap: var(--space-xs);">
			<p class="nd-body-sm">
				<span class="nd-caption">NAME</span><br />{data.manifest.metadata.name ?? 'N/A'}
			</p>
			<p class="nd-body-sm">
				<span class="nd-caption">NAMESPACE</span><br />{data.manifest.metadata.namespace ?? 'N/A'}
			</p>
			<p class="nd-body-sm">
				<span class="nd-caption">CREATED</span><br />{data.manifest.metadata.creationTimestamp
					? new Date(data.manifest.metadata.creationTimestamp).toLocaleString()
					: 'N/A'}
			</p>
		</div>
	</div>

	<!-- Scanner Card -->
	{#if data.manifest?.report?.scanner}
		<div class="nd-card">
			<p class="nd-label" style="margin-bottom: var(--space-sm);">Scanner</p>
			<div style="display: flex; flex-direction: column; gap: var(--space-xs);">
				<p class="nd-body-sm">
					<span class="nd-caption">NAME</span><br />{data.manifest.report.scanner.name ?? 'N/A'}
				</p>
				<p class="nd-body-sm">
					<span class="nd-caption">VENDOR</span><br />{data.manifest.report.scanner.vendor ?? 'N/A'}
				</p>
				<p class="nd-body-sm">
					<span class="nd-caption">VERSION</span><br />{data.manifest.report.scanner.version ??
						'N/A'}
				</p>
			</div>
		</div>
	{/if}

	<!-- Registry Card -->
	{#if data.manifest?.report?.registry}
		<div class="nd-card">
			<p class="nd-label" style="margin-bottom: var(--space-sm);">Registry</p>
			<p class="nd-body-sm">
				<span class="nd-caption">SERVER</span><br />{data.manifest.report.registry.server ?? 'N/A'}
			</p>
		</div>
	{/if}

	<!-- Summary Card -->
	{#if data.manifest?.report?.summary}
		<div class="nd-card">
			<p class="nd-label" style="margin-bottom: var(--space-sm);">Security Summary</p>
			<div style="display: flex; flex-wrap: wrap; gap: var(--space-xs);">
				<span class="nd-tag nd-tag-critical"
					>CRIT {data.manifest.report.summary.criticalCount ?? 0}</span
				>
				<span class="nd-tag nd-tag-high">HIGH {data.manifest.report.summary.highCount ?? 0}</span>
				<span class="nd-tag nd-tag-medium">MED {data.manifest.report.summary.mediumCount ?? 0}</span
				>
				<span class="nd-tag nd-tag-low">LOW {data.manifest.report.summary.lowCount ?? 0}</span>
			</div>
		</div>
	{/if}

	<!-- Artifact Card -->
	{#if data.manifest?.report?.artifact}
		<div class="nd-card">
			<p class="nd-label" style="margin-bottom: var(--space-sm);">Artifact</p>
			<div style="display: flex; flex-direction: column; gap: var(--space-xs);">
				<p class="nd-body-sm" style="word-break: break-all;">
					<span class="nd-caption">DIGEST</span><br />{data.manifest.report.artifact.digest ??
						'N/A'}
				</p>
				<p class="nd-body-sm" style="word-break: break-all;">
					<span class="nd-caption">REPOSITORY</span><br />{data.manifest.report.artifact
						.repository ?? 'N/A'}
				</p>
				<p class="nd-body-sm">
					<span class="nd-caption">TAG</span><br />{data.manifest.report.artifact.tag ?? 'N/A'}
				</p>
			</div>
		</div>
	{/if}

	<!-- OS Card -->
	{#if data.manifest?.report?.os}
		<div class="nd-card">
			<p class="nd-label" style="margin-bottom: var(--space-sm);">OS</p>
			<p class="nd-body-sm">
				<span class="nd-caption">FAMILY</span><br />{data.manifest.report.os.family ?? 'N/A'}
			</p>
			<p class="nd-body-sm">
				<span class="nd-caption">NAME</span><br />{data.manifest.report.os.name ?? 'N/A'}
			</p>
		</div>
	{/if}
</div>

<div style="padding: var(--space-lg) 0;">
	{#if data.manifest?.report?.checks}
		<SecurityChecks checks={data.manifest.report.checks} />
	{/if}
	{#if data.resource === 'clustercompliancereports'}
		<ComplianceComponent {data} />
	{/if}
	{#if data.manifest?.report?.secrets}
		<Secrets secrets={data.manifest.report.secrets} />
	{/if}
	{#if data.manifest?.report?.vulnerabilities}
		<Vulnerabilities vulnerabilities={data.manifest.report.vulnerabilities} />
	{/if}
	{#if data.manifest?.report?.components}
		<SBOM components={data.manifest.report.components} />
	{/if}
</div>
