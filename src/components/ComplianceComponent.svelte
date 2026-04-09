<script lang="ts">
	interface Check {
		id: string;
		name: string;
		severity: string;
		description?: string;
		commands?: { id: string; description: string }[];
	}

	interface Control {
		id: string;
		name: string;
		description: string;
		severity: string;
		checks?: Check[];
		status?: string;
		totalFail?: number | null;
	}

	interface StatusControl {
		id: string;
		totalFail: number;
	}

	interface Props {
		data: {
			manifest: {
				spec?: { compliance?: { controls: Control[] } };
				status?: { summaryReport?: { controlCheck: StatusControl[] } };
			};
		};
	}

	let { data }: Props = $props();

	const severityOrder: Record<string, number> = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4, UNKNOWN: 5 };
	const statusOrder: Record<string, number> = { Failed: 1, Passed: 2, Manual: 3 };

	function severityTag(s: string): string {
		switch (s) {
			case 'CRITICAL': return 'critical';
			case 'HIGH': return 'high';
			case 'MEDIUM': return 'medium';
			case 'LOW': return 'low';
			default: return 'unknown';
		}
	}

	function statusTag(s: string): string {
		switch (s) {
			case 'Failed': return 'fail';
			case 'Passed': return 'pass';
			default: return 'unknown';
		}
	}

	let controls: Control[] = $derived.by(() => {
		if (!data?.manifest?.spec?.compliance?.controls || !data?.manifest?.status?.summaryReport?.controlCheck) return [];
		return data.manifest.spec.compliance.controls
			.map((control: Control) => {
				const statusControl = data.manifest.status?.summaryReport?.controlCheck.find((c: StatusControl) => c.id === control.id);
				const totalFail = statusControl?.totalFail;
				return {
					...control,
					status: totalFail !== undefined && totalFail > 0 ? 'Failed' : totalFail !== undefined && totalFail === 0 ? 'Passed' : 'Manual',
					totalFail: totalFail ?? null
				};
			})
			.sort((a, b) => {
				const statusDiff = statusOrder[a.status as string] - statusOrder[b.status as string];
				if (statusDiff !== 0) return statusDiff;
				return (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
			});
	});

	let selectedControl = $state<Control | null>(null);
	let showModal = $state(false);

	function openModal(control: Control): void {
		selectedControl = control;
		showModal = true;
	}

	function closeModal(): void {
		selectedControl = null;
		showModal = false;
	}
</script>

<div style="padding: var(--space-md);">
	{#if controls.length > 0}
		<table class="nd-table">
			<thead>
				<tr>
					<th>ID</th>
					<th>Name</th>
					<th>Severity</th>
					<th>Status</th>
					<th>Failures</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each controls as control}
					<tr>
						<td class="nd-mono-cell">{control.id}</td>
						<td>{control.name}</td>
						<td><span class="nd-tag nd-tag-{severityTag(control.severity)}">{control.severity || 'UNKNOWN'}</span></td>
						<td><span class="nd-tag nd-tag-{statusTag(control.status || '')}">{control.status}</span></td>
						<td class="nd-mono-cell">{control.totalFail ?? 'N/A'}</td>
						<td><button class="nd-btn nd-btn-secondary nd-btn-xs" onclick={() => openModal(control)}>Details</button></td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<div class="nd-card" style="text-align: center;">
			<p style="color: var(--nd-text-secondary);">No compliance controls found for this report.</p>
		</div>
	{/if}

	{#if showModal && selectedControl}
		<div class="nd-modal-backdrop" onclick={closeModal} onkeydown={(e) => e.key === 'Escape' && closeModal()} role="dialog" tabindex="-1">
			<div class="nd-modal" onclick={(e) => e.stopPropagation()} role="document">
				<div class="nd-modal-header">
					<span class="nd-modal-title">{selectedControl.name}</span>
					<button class="nd-modal-close" onclick={closeModal}>[ X ]</button>
				</div>
				<p class="nd-body-sm" style="color: var(--nd-text-secondary); margin-bottom: var(--space-md);">{selectedControl.description}</p>
				{#if selectedControl.checks}
					<div>
						<p class="nd-label" style="margin-bottom: var(--space-sm);">Checks</p>
						{#each selectedControl.checks as check}
							<div style="margin-bottom: var(--space-md); padding-left: var(--space-md); border-left: 1px solid var(--nd-border);">
								<p class="nd-body-sm"><strong>{check.id}:</strong> {check.name}
									<span class="nd-tag nd-tag-{severityTag(check.severity)}" style="margin-left: var(--space-xs);">{check.severity}</span>
								</p>
								{#if check.description}
									<p class="nd-caption" style="margin-top: var(--space-xs);">{check.description}</p>
								{/if}
								{#if check.commands}
									<div style="margin-top: var(--space-xs);">
										<p class="nd-caption" style="font-weight: bold;">Commands:</p>
										{#each check.commands as cmd}
											<p class="nd-caption" style="margin-left: var(--space-md);"><strong>{cmd.id}:</strong> {cmd.description}</p>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
