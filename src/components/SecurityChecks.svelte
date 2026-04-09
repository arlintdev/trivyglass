<script lang="ts">
	interface SecurityCheck {
		severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
		title?: string;
		checkID?: string;
		description?: string;
		messages?: string[];
		remediation?: string;
	}

	interface Props {
		checks: SecurityCheck[];
	}

	let { checks }: Props = $props();

	function severityTag(s: string): string {
		switch (s) {
			case 'CRITICAL': return 'critical';
			case 'HIGH': return 'high';
			case 'MEDIUM': return 'medium';
			case 'LOW': return 'low';
			default: return 'unknown';
		}
	}

	const severityOrder: Record<string, number> = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4, UNKNOWN: 5 };

	const sortedChecks = $derived(
		checks.slice().sort((a, b) => (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5))
	);
</script>

<div>
	<h2 class="nd-heading" style="margin-bottom: var(--space-lg);">Security Checks</h2>
	<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-md);">
		{#each sortedChecks as check}
			<div class="nd-card" style="display: flex; flex-direction: column; gap: var(--space-sm);">
				<div style="display: flex; align-items: center; justify-content: space-between;">
					<span class="nd-subheading" style="color: var(--nd-text-display);">
						{check.title ?? 'Untitled Check'}
					</span>
					<span class="nd-tag nd-tag-{severityTag(check.severity)}">{check.severity ?? 'UNKNOWN'}</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--space-sm);">
					<p class="nd-body-sm"><span class="nd-caption">ID</span> {check.checkID ?? 'N/A'}</p>
					<p class="nd-body-sm" style="color: var(--nd-text-secondary);">{check.description ?? 'No description available'}</p>
					<div class="nd-alert nd-alert-error">
						<strong>[ISSUE]</strong> {check.messages?.[0] ?? 'No specific issue reported'}
					</div>
					<div style="border-left: 2px solid var(--nd-border-visible); padding-left: var(--space-md);">
						<p class="nd-caption" style="color: var(--nd-text-secondary);">
							<strong>REMEDIATION:</strong> {check.remediation ?? 'No remediation provided'}
						</p>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
