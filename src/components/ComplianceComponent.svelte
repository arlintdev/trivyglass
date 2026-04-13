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
		// Per-finding fields populated when a real scanner check fired.
		title?: string;
		description?: string;
		category?: string;
		messages?: string[];
		remediation?: string;
		target?: string;
	}

	interface DetailResult {
		id: string;
		name?: string;
		description?: string;
		severity?: string;
		checks?: DetailCheck[];
		// Some controls (e.g. ones with defaultStatus: PASS|WARN) carry a
		// top-level status string instead of, or alongside, the empty-checkID
		// placeholder check. We surface this so the modal can explain why a
		// Not_Reviewed control is unreviewable vs. just unbound.
		status?: string;
	}

	interface EnrichedControl extends Control {
		status: StigStatus;
		totalFail: number | null;
		totalEvaluated: number;
		detail: DetailResult | null;
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

	let controls: EnrichedControl[] = $derived.by(() => {
		const specControls = data?.manifest?.spec?.compliance?.controls;
		if (!specControls) return [];

		const summary = data.manifest.status?.summaryReport?.controlCheck;
		const detailResults = data.manifest.status?.detailReport?.results;
		const naIds = notApplicableSet;

		type Status = { totalFail: number | null; totalEvaluated: number; status: StigStatus };
		const statusById = new SvelteMap<string, Status>();
		const detailById = new SvelteMap<string, DetailResult>();

		if (detailResults && detailResults.length > 0) {
			for (const r of detailResults) {
				detailById.set(r.id, r);
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
			.map((control: Control): EnrichedControl => {
				const detail = detailById.get(control.id) ?? null;
				// Annotation-declared NA wins over any scanner output so operators can
				// flag entire swaths of a benchmark (e.g. control-plane flag rules on
				// a managed Kubernetes service) as out-of-scope without deleting them
				// from the spec.
				if (naIds.has(control.id)) {
					return {
						...control,
						status: 'Not_Applicable',
						totalFail: null,
						totalEvaluated: 0,
						detail
					};
				}
				const st = statusById.get(control.id);
				return {
					...control,
					status: st?.status ?? 'Not_Reviewed',
					totalFail: st?.totalFail ?? null,
					totalEvaluated: st?.totalEvaluated ?? 0,
					detail
				};
			})
			.sort((a, b) => {
				const statusDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
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
			if (c.status in totals) totals[c.status]++;
		}
		return totals;
	});

	let selectedControl = $state<EnrichedControl | null>(null);
	let showModal = $state(false);

	function openModal(control: EnrichedControl): void {
		selectedControl = control;
		showModal = true;
	}

	// Group an Open control's failing detail checks by checkID so a single AVD-*
	// rule that hit N resources renders once with a list of targets, not N times.
	type FailingGroup = {
		checkID: string;
		title: string;
		description: string;
		remediation: string;
		severity: string;
		targets: string[];
	};
	function groupFailingChecks(detail: DetailResult | null): FailingGroup[] {
		if (!detail?.checks) return [];
		const byId = new SvelteMap<string, FailingGroup>();
		for (const c of detail.checks) {
			if (c.success !== false || !c.checkID) continue;
			const key = c.checkID;
			let g = byId.get(key);
			if (!g) {
				g = {
					checkID: c.checkID,
					title: c.title ?? '',
					description: c.description ?? '',
					remediation: c.remediation ?? '',
					severity: c.severity ?? '',
					targets: []
				};
				byId.set(key, g);
			}
			if (c.target) g.targets.push(c.target);
		}
		// Stable ordering: by check ID
		return Array.from(byId.values()).sort((a, b) => a.checkID.localeCompare(b.checkID));
	}

	// DISA-style explanation for the four statuses, used in the modal so a
	// reviewer doesn't have to guess what a tag means in the context of this
	// specific control. Tailored to whether the control had a real scanner
	// binding or was unreachable on this environment.
	function statusExplanation(c: EnrichedControl, naReason: string): string {
		switch (c.status) {
			case 'Open':
				return `Scanner evaluated this control and found ${c.totalFail} failing instance(s) across ${c.totalEvaluated} check result(s). Each instance is listed below with its target resource and remediation.`;
			case 'NotAFinding':
				if (c.detail?.status === 'PASS')
					return 'Control passes by spec default (defaultStatus: PASS). Add a real scanner check to the spec if you want active enforcement rather than a presumption of compliance.';
				return `Scanner evaluated ${c.totalEvaluated} check result(s) for this control and found no failures.`;
			case 'Not_Applicable':
				return naReason
					? `Marked Not Applicable for this environment. Reason: ${naReason}`
					: 'Marked Not Applicable for this environment via the stig.trivyglass.io/not-applicable annotation.';
			case 'Not_Reviewed':
			default: {
				const specHasChecks = (c.checks?.length ?? 0) > 0;
				if (!specHasChecks)
					return 'Spec defines no scanner check for this control — it requires manual review.';
				return 'Spec references one or more scanner checks, but no result was bound. The check either did not run on this cluster (e.g. control-plane flag inspection on a managed Kubernetes service) or produced no matching record.';
			}
		}
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
				</tr>
			</thead>
			<tbody>
				{#each controls as control}
					<tr
						style="cursor: pointer;"
						role="button"
						tabindex="0"
						onclick={() => openModal(control)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								openModal(control);
							}
						}}
					>
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
					<span class="nd-modal-title"
						><span class="nd-mono">{selectedControl.id}</span> — {selectedControl.name}</span
					>
					<button class="nd-modal-close" onclick={closeModal}>[ X ]</button>
				</div>

				<!-- Severity + status row -->
				<div
					style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-md); align-items: center;"
				>
					<span class="nd-caption">Severity:</span>
					<span class="nd-tag nd-tag-{severityTag(selectedControl.severity)}"
						>{selectedControl.severity || 'UNKNOWN'}</span
					>
					<span class="nd-caption" style="margin-left: var(--space-md);">Status:</span>
					<span class="nd-tag nd-tag-{statusTag(selectedControl.status)}"
						>{statusLabel(selectedControl.status)}</span
					>
					{#if selectedControl.totalEvaluated > 0}
						<span class="nd-caption" style="margin-left: var(--space-md);">
							{selectedControl.totalFail ?? 0} fail / {selectedControl.totalEvaluated} evaluated
						</span>
					{/if}
				</div>

				<!-- Status explanation -->
				<div
					class="nd-card"
					style="padding: var(--space-sm) var(--space-md); margin-bottom: var(--space-md); background: var(--nd-surface-subtle);"
				>
					<p class="nd-body-sm" style="color: var(--nd-text-secondary);">
						{statusExplanation(selectedControl, notApplicableReason)}
					</p>
				</div>

				<!-- STIG description (VulnDiscussion text) -->
				<div style="margin-bottom: var(--space-md);">
					<p class="nd-label" style="margin-bottom: var(--space-xs);">Discussion</p>
					<p class="nd-body-sm" style="color: var(--nd-text-secondary);">
						{selectedControl.description}
					</p>
				</div>

				<!-- Failing instances (Open only) -->
				{#if selectedControl.status === 'Open'}
					{@const groups = groupFailingChecks(selectedControl.detail)}
					{#if groups.length > 0}
						<div style="margin-bottom: var(--space-md);">
							<p class="nd-label" style="margin-bottom: var(--space-sm);">
								Failing instances ({selectedControl.totalFail})
							</p>
							{#each groups as g}
								<div
									style="margin-bottom: var(--space-md); padding: var(--space-sm) var(--space-md); border-left: 2px solid var(--accent); background: var(--nd-surface-subtle);"
								>
									<p class="nd-body-sm">
										<span class="nd-mono"><strong>{g.checkID}</strong></span>
										{#if g.title}— {g.title}{/if}
										{#if g.severity}
											<span
												class="nd-tag nd-tag-{severityTag(g.severity)}"
												style="margin-left: var(--space-xs);">{g.severity}</span
											>
										{/if}
									</p>
									{#if g.description}
										<p class="nd-caption" style="margin-top: var(--space-xs);">{g.description}</p>
									{/if}
									{#if g.remediation}
										<p class="nd-caption" style="margin-top: var(--space-xs);">
											<strong>Remediation:</strong>
											{g.remediation}
										</p>
									{/if}
									{#if g.targets.length > 0}
										<p class="nd-caption" style="margin-top: var(--space-sm); font-weight: bold;">
											Affected resources ({g.targets.length}):
										</p>
										<ul
											class="nd-body-sm"
											style="margin: var(--space-xs) 0 0 var(--space-md); padding: 0;"
										>
											{#each g.targets as t}
												<li class="nd-mono" style="font-size: var(--body-sm);">{t}</li>
											{/each}
										</ul>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				{/if}

				<!-- Spec-declared checks (always shown if present, useful context for any status) -->
				{#if selectedControl.checks && selectedControl.checks.length > 0}
					<div>
						<p class="nd-label" style="margin-bottom: var(--space-sm);">
							Spec references ({selectedControl.checks.length})
						</p>
						{#each selectedControl.checks as check}
							<div
								style="margin-bottom: var(--space-sm); padding-left: var(--space-md); border-left: 1px solid var(--nd-border);"
							>
								<p class="nd-body-sm">
									<span class="nd-mono"><strong>{check.id}</strong></span>
									{#if check.name}— {check.name}{/if}
									{#if check.severity}
										<span
											class="nd-tag nd-tag-{severityTag(check.severity)}"
											style="margin-left: var(--space-xs);">{check.severity}</span
										>
									{/if}
								</p>
								{#if check.description}
									<p class="nd-caption" style="margin-top: var(--space-xs);">{check.description}</p>
								{/if}
								{#if check.commands && check.commands.length > 0}
									<div style="margin-top: var(--space-xs);">
										<p class="nd-caption" style="font-weight: bold;">Commands:</p>
										{#each check.commands as cmd}
											<p class="nd-caption" style="margin-left: var(--space-md);">
												<span class="nd-mono"><strong>{cmd.id}</strong></span>: {cmd.description}
											</p>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else if selectedControl.status === 'Not_Reviewed'}
					<p class="nd-caption" style="color: var(--nd-text-secondary);">
						No spec checks declared — this control is manual-review only.
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
