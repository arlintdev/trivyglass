<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';

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

	interface DetailCheck {
		checkID?: string;
		severity?: string;
		success?: boolean;
	}

	interface DetailResult {
		id: string;
		name?: string;
		description?: string;
		severity?: string;
		checks?: DetailCheck[];
	}

	interface Props {
		data: {
			manifest: {
				metadata?: { annotations?: Record<string, string> };
				spec?: { compliance?: { controls: Control[] } };
				status?: {
					summaryReport?: { controlCheck: StatusControl[] };
					detailReport?: { results?: DetailResult[] };
				};
			};
		};
	}

	// Controls that the spec author has marked as Not Applicable for this
	// environment, surfaced via CR metadata annotation. The value is a
	// comma-separated list of control ids (e.g. "V-242379,V-242380,..."),
	// and an optional reason annotation explains why.
	const NA_ANNOTATION = 'stig.trivyglass.io/not-applicable';
	const NA_REASON_ANNOTATION = 'stig.trivyglass.io/not-applicable-reason';

	let { data }: Props = $props();

	// DISA XCCDF uses four statuses. `Open` and `NotAFinding` map to a scan that
	// actually ran; `Not_Reviewed` means no enforceable check executed against the
	// control (either the spec has no checks, or trivy-operator emitted results
	// with an empty checkID because no scanner produced a matching result — the
	// usual case on EKS where the control plane is AWS-managed and opaque to
	// trivy's `AVD-KCV-*` and `CMD-*` checks). `Not_Applicable` requires explicit
	// spec metadata and is not populated by trivy-operator today, but we reserve
	// the status value so the viewer can render it if a future spec sets it.
	type StigStatus = 'Open' | 'NotAFinding' | 'Not_Reviewed' | 'Not_Applicable';

	const severityOrder: Record<string, number> = {
		CRITICAL: 1,
		HIGH: 2,
		MEDIUM: 3,
		LOW: 4,
		UNKNOWN: 5
	};
	const statusOrder: Record<StigStatus, number> = {
		Open: 1,
		NotAFinding: 2,
		Not_Reviewed: 3,
		Not_Applicable: 4
	};

	function severityTag(s: string): string {
		switch (s) {
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

	function statusTag(s: string): string {
		switch (s) {
			case 'Open':
				return 'fail';
			case 'NotAFinding':
				return 'pass';
			case 'Not_Applicable':
				return 'info';
			case 'Not_Reviewed':
			default:
				return 'unknown';
		}
	}

	function statusLabel(s: string): string {
		switch (s) {
			case 'NotAFinding':
				return 'Not a Finding';
			case 'Not_Reviewed':
				return 'Not Reviewed';
			case 'Not_Applicable':
				return 'Not Applicable';
			default:
				return s;
		}
	}

	// trivy-operator populates either `status.summaryReport` (when spec.reportType
	// is "summary") or `status.detailReport` (when "all"). Support both and classify
	// each control into a DISA-standard status:
	//
	//   Open          — scanner ran, ≥1 failure
	//   NotAFinding   — scanner ran, 0 failures
	//   Not_Reviewed  — no scanner output bound to the control (spec has no checks,
	//                   or operator emitted checks with empty checkID because no
	//                   scanner produced a matching result)
	//
	// The empty-checkID case is the "defaulted to success" path — NOT an actual
	// pass. `.status.summary.passCount` from the operator collapses these into its
	// pass total; the detail table keeps them separate so reviewers can see how
	// much of the benchmark was actually evaluated vs. silently skipped.
	// Parsed once per render from the metadata annotation.
	const notApplicableSet = $derived.by(() => {
		const raw = data?.manifest?.metadata?.annotations?.[NA_ANNOTATION];
		if (!raw) return new Set<string>();
		return new Set(
			raw
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean)
		);
	});

	const notApplicableReason = $derived(
		data?.manifest?.metadata?.annotations?.[NA_REASON_ANNOTATION] ?? ''
	);

	let controls: Control[] = $derived.by(() => {
		const specControls = data?.manifest?.spec?.compliance?.controls;
		if (!specControls) return [];

		const summary = data.manifest.status?.summaryReport?.controlCheck;
		const detailResults = data.manifest.status?.detailReport?.results;
		const naIds = notApplicableSet;

		type Status = { totalFail: number | null; totalEvaluated: number; status: StigStatus };
		const statusById = new SvelteMap<string, Status>();

		if (detailResults && detailResults.length > 0) {
			for (const r of detailResults) {
				const checks = r.checks ?? [];
				const realChecks = checks.filter((c) => c.checkID && c.checkID.length > 0);
				if (realChecks.length === 0) {
					statusById.set(r.id, {
						totalFail: null,
						totalEvaluated: 0,
						status: 'Not_Reviewed'
					});
					continue;
				}
				const failCount = realChecks.filter((c) => c.success === false).length;
				statusById.set(r.id, {
					totalFail: failCount,
					totalEvaluated: realChecks.length,
					status: failCount > 0 ? 'Open' : 'NotAFinding'
				});
			}
		} else if (summary) {
			// summaryReport mode: any control id present in controlCheck was
			// evaluated. Controls absent from controlCheck are Not_Reviewed.
			for (const sc of summary) {
				statusById.set(sc.id, {
					totalFail: sc.totalFail,
					totalEvaluated: 1,
					status: sc.totalFail > 0 ? 'Open' : 'NotAFinding'
				});
			}
		} else {
			return [];
		}

		return specControls
			.map((control: Control) => {
				// Annotation-declared NA wins over any scanner output so operators can
				// flag entire swaths of a benchmark (e.g. control-plane flag rules on
				// a managed Kubernetes service) as out-of-scope without deleting them
				// from the spec.
				if (naIds.has(control.id)) {
					return { ...control, status: 'Not_Applicable' as StigStatus, totalFail: null };
				}
				const st = statusById.get(control.id);
				const status: StigStatus = st?.status ?? 'Not_Reviewed';
				return {
					...control,
					status,
					totalFail: st?.totalFail ?? null
				};
			})
			.sort((a, b) => {
				const statusDiff =
					(statusOrder[a.status as StigStatus] ?? 9) - (statusOrder[b.status as StigStatus] ?? 9);
				if (statusDiff !== 0) return statusDiff;
				return (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
			});
	});

	// Bucket counts the viewer computes itself — these are the STIG-honest
	// totals, distinct from `.status.summary.{passCount,failCount}` which the
	// operator reports on the CR (and which the /compliance list view shows).
	let statusTotals = $derived.by(() => {
		const totals: Record<StigStatus, number> = {
			Open: 0,
			NotAFinding: 0,
			Not_Reviewed: 0,
			Not_Applicable: 0
		};
		for (const c of controls) {
			const s = c.status as StigStatus;
			if (s in totals) totals[s]++;
		}
		return totals;
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
		<div
			style="display: flex; flex-wrap: wrap; gap: var(--space-md); margin-bottom: var(--space-md);"
		>
			<div class="nd-card" style="padding: var(--space-sm) var(--space-md);">
				<span class="nd-caption">Open</span><br />
				<span class="nd-tag nd-tag-fail" style="font-size: var(--body);">{statusTotals.Open}</span>
			</div>
			<div class="nd-card" style="padding: var(--space-sm) var(--space-md);">
				<span class="nd-caption">Not a Finding</span><br />
				<span class="nd-tag nd-tag-pass" style="font-size: var(--body);"
					>{statusTotals.NotAFinding}</span
				>
			</div>
			<div class="nd-card" style="padding: var(--space-sm) var(--space-md);">
				<span class="nd-caption">Not Reviewed</span><br />
				<span class="nd-tag nd-tag-unknown" style="font-size: var(--body);"
					>{statusTotals.Not_Reviewed}</span
				>
			</div>
			{#if statusTotals.Not_Applicable > 0}
				<div class="nd-card" style="padding: var(--space-sm) var(--space-md);">
					<span class="nd-caption">Not Applicable</span><br />
					<span class="nd-tag nd-tag-info" style="font-size: var(--body);"
						>{statusTotals.Not_Applicable}</span
					>
				</div>
			{/if}
		</div>
		{#if statusTotals.Not_Applicable > 0 && notApplicableReason}
			<p
				class="nd-caption"
				style="color: var(--nd-text-secondary); margin-bottom: var(--space-md);"
			>
				<strong>Not Applicable</strong> ({statusTotals.Not_Applicable}): {notApplicableReason}
			</p>
		{/if}
		{#if statusTotals.Not_Reviewed > 0}
			<p
				class="nd-caption"
				style="color: var(--nd-text-secondary); margin-bottom: var(--space-md);"
			>
				Note: controls in <strong>Not Reviewed</strong> had no scanner output bound to them — the
				spec references a check that produced no matching result, or the control is manual-only. The
				operator's <code>passCount</code> on the list view rolls these into its pass total; the detail
				table keeps them separate.
			</p>
		{/if}
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
						<td
							><span class="nd-tag nd-tag-{severityTag(control.severity)}"
								>{control.severity || 'UNKNOWN'}</span
							></td
						>
						<td
							><span class="nd-tag nd-tag-{statusTag(control.status || '')}"
								>{statusLabel(control.status || '')}</span
							></td
						>
						<td class="nd-mono-cell">{control.totalFail ?? 'N/A'}</td>
						<td
							><button class="nd-btn nd-btn-secondary nd-btn-xs" onclick={() => openModal(control)}
								>Details</button
							></td
						>
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
		<div
			class="nd-modal-backdrop"
			onclick={closeModal}
			onkeydown={(e) => e.key === 'Escape' && closeModal()}
			role="dialog"
			tabindex="-1"
		>
			<div class="nd-modal" onclick={(e) => e.stopPropagation()} role="document">
				<div class="nd-modal-header">
					<span class="nd-modal-title">{selectedControl.name}</span>
					<button class="nd-modal-close" onclick={closeModal}>[ X ]</button>
				</div>
				<p
					class="nd-body-sm"
					style="color: var(--nd-text-secondary); margin-bottom: var(--space-md);"
				>
					{selectedControl.description}
				</p>
				{#if selectedControl.checks}
					<div>
						<p class="nd-label" style="margin-bottom: var(--space-sm);">Checks</p>
						{#each selectedControl.checks as check}
							<div
								style="margin-bottom: var(--space-md); padding-left: var(--space-md); border-left: 1px solid var(--nd-border);"
							>
								<p class="nd-body-sm">
									<strong>{check.id}:</strong>
									{check.name}
									<span
										class="nd-tag nd-tag-{severityTag(check.severity)}"
										style="margin-left: var(--space-xs);">{check.severity}</span
									>
								</p>
								{#if check.description}
									<p class="nd-caption" style="margin-top: var(--space-xs);">{check.description}</p>
								{/if}
								{#if check.commands}
									<div style="margin-top: var(--space-xs);">
										<p class="nd-caption" style="font-weight: bold;">Commands:</p>
										{#each check.commands as cmd}
											<p class="nd-caption" style="margin-left: var(--space-md);">
												<strong>{cmd.id}:</strong>
												{cmd.description}
											</p>
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
