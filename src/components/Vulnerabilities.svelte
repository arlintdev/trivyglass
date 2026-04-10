<script lang="ts">
	interface Vulnerability {
		title: string;
		vulnerabilityID: string;
		severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
		resource: string;
		installedVersion: string;
		fixedVersion?: string;
		packagePURL: string;
		target?: string;
		primaryLink: string;
		links?: string[];
		score: number;
		publishedDate: string;
		lastModifiedDate: string;
	}

	interface Props {
		vulnerabilities: Vulnerability[];
		text?: string;
	}

	let { vulnerabilities, text = $bindable('') }: Props = $props();

	const severityOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

	function severityTag(s: string): string {
		switch (s.toUpperCase()) {
			case 'CRITICAL':
				return 'critical';
			case 'HIGH':
				return 'high';
			case 'MEDIUM':
				return 'medium';
			case 'LOW':
				return 'low';
			default:
				return 'unknown';
		}
	}

	const sortedVulnerabilities = $derived(
		vulnerabilities
			.slice()
			.sort(
				(a, b) => severityOrder[b.severity.toUpperCase()] - severityOrder[a.severity.toUpperCase()]
			)
	);

	const filteredVulnerabilities = $derived(
		sortedVulnerabilities.filter((v) => {
			const term = text.toLowerCase();
			return (
				v.title?.toLowerCase().includes(term) ||
				v.vulnerabilityID?.toLowerCase().includes(term) ||
				v.severity?.toLowerCase().includes(term) ||
				v.resource?.toLowerCase().includes(term) ||
				v.installedVersion?.toLowerCase().includes(term) ||
				v.fixedVersion?.toLowerCase().includes(term) ||
				v.packagePURL?.toLowerCase().includes(term) ||
				v.target?.toLowerCase().includes(term) ||
				v.primaryLink?.toLowerCase().includes(term) ||
				v.links?.some((link) => link.toLowerCase().includes(term))
			);
		})
	);
</script>

<div style="padding: var(--space-lg) 0;">
	<div style="margin-bottom: var(--space-lg);">
		<input
			class="nd-input-bordered"
			type="text"
			bind:value={text}
			placeholder="Search vulnerabilities..."
			style="width: 100%; max-width: 500px; margin-bottom: var(--space-md);"
		/>
		<h2 class="nd-heading">
			Vulnerabilities
			<span class="nd-caption" style="margin-left: var(--space-sm);"
				>({filteredVulnerabilities.length} found)</span
			>
		</h2>
	</div>

	<div
		style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-md);"
	>
		{#each filteredVulnerabilities as v}
			<div class="nd-card" style="display: flex; flex-direction: column; gap: var(--space-sm);">
				<div
					style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-sm);"
				>
					<span
						class="nd-body-sm"
						style="color: var(--nd-text-display); font-weight: 500;"
						title={v.title}
					>
						{v.title}
					</span>
					<span class="nd-tag nd-tag-{severityTag(v.severity)}">{v.severity}</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--space-xs);">
					<p class="nd-caption">
						ID: <span style="color: var(--nd-text-primary);">{v.vulnerabilityID}</span>
					</p>
					<p class="nd-caption">
						RESOURCE: <span style="color: var(--nd-text-primary);">{v.resource}</span>
					</p>
					<p class="nd-caption">
						VERSION: <span style="color: var(--nd-text-primary);">{v.installedVersion}</span>
						{#if v.fixedVersion}
							<span style="color: var(--success);"> &rarr; {v.fixedVersion}</span>
						{/if}
					</p>
					<p class="nd-caption">
						SCORE: <span style="color: var(--nd-text-primary);">{v.score}</span>
					</p>
				</div>
				<div style="margin-top: auto;">
					<a
						href={v.primaryLink}
						target="_blank"
						rel="noopener noreferrer"
						class="nd-link"
						style="font-size: var(--caption); word-break: break-all;"
					>
						{v.primaryLink}
					</a>
				</div>
				<div style="display: flex; gap: var(--space-md);">
					<span class="nd-caption" style="color: var(--nd-text-disabled);"
						>Published: {new Date(v.publishedDate).toLocaleDateString()}</span
					>
					<span class="nd-caption" style="color: var(--nd-text-disabled);"
						>Modified: {new Date(v.lastModifiedDate).toLocaleDateString()}</span
					>
				</div>
			</div>
		{/each}
	</div>
</div>
