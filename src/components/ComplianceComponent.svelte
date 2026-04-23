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

	interface Attestation {
		status: 'manual-pass' | 'manual-fail' | 'not-applicable';
		reviewedBy: string;
		reviewedAt: string;
		evidence?: string;
		reason?: string;
	}
	type AttestationMap = Record<string, Attestation>;

	interface KubeBenchResult {
		status: 'PASS' | 'FAIL' | 'WARN' | 'INFO';
		testDesc: string;
		audit: string;
		remediation: string;
		actualValue: string;
		benchmark: string;
		section: string;
		scannedAt: string;
	}

	interface KubeBenchSummary {
		benchmark: string;
		scannedAt: string;
		totals: { pass: number; fail: number; warn: number; info: number };
		results: Record<string, Omit<KubeBenchResult, 'scannedAt'>>;
	}

	type OverlaySource = 'kubebench' | 'attestation';

	interface EnrichedControl extends Control {
		status: StigStatus;
		totalFail: number | null;
		totalEvaluated: number;
		detail: DetailResult | null;
		attestation: Attestation | null;
		kubebench: KubeBenchResult | null;
		// Non-null when the displayed status comes from an overlay rather than
		// the scanner. Scanner results always win; kube-bench PASS/FAIL beats
		// attestations (automated > manual); kube-bench WARN/INFO leaves a note
		// and attestation can still fill in.
		overlay: OverlaySource | null;
	}

	interface DriftEntry {
		id: string;
		title: string;
		cat: string;
	}

	interface Props {
		data: {
			name: string;
			manifest: {
				metadata?: { annotations?: Record<string, string> };
				spec?: { compliance?: { controls: Control[] } };
				status?: {
					summaryReport?: { controlCheck: StatusControl[] };
					detailReport?: { results?: DetailResult[] };
				};
			};
			attestations?: AttestationMap;
			attestationNamespace?: string;
			attestationError?: string;
			kubebench?: KubeBenchSummary[];
			kubebenchError?: string;
			stig?: {
				source: {
					filename: string;
					date: string;
					count: number;
					cat1: number;
					cat2: number;
					cat3: number;
				};
				drift: {
					missingFromSpec: DriftEntry[];
					extraInSpec: string[];
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

	// Attestations are mutable — the form writes via the API and we mirror the
	// server response here so the table updates without a page reload. The
	// initial seed is a snapshot from the loader; after mount, this state is
	// owned by the client and re-seeding from data would stomp local edits.
	// svelte-ignore state_referenced_locally
	let attestations = $state<AttestationMap>(data.attestations ? { ...data.attestations } : {});

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

	// Flatten all kube-bench summaries into a single V-ID → result lookup.
	// When multiple benchmarks report on the same V-ID (unusual but possible),
	// the most recently-scanned result wins — fresher data beats older data.
	const kubeBenchByVid = $derived.by(() => {
		const out = new SvelteMap<string, KubeBenchResult>();
		const summaries = data.kubebench ?? [];
		const sorted = [...summaries].sort((a, b) => (a.scannedAt < b.scannedAt ? 1 : -1));
		for (const s of sorted) {
			for (const [vId, r] of Object.entries(s.results)) {
				if (out.has(vId)) continue;
				out.set(vId, { ...r, scannedAt: s.scannedAt });
			}
		}
		return out;
	});

	const kubeBenchTotals = $derived.by(() => {
		const summaries = data.kubebench ?? [];
		const acc = { pass: 0, fail: 0, warn: 0, info: 0 };
		for (const s of summaries) {
			acc.pass += s.totals.pass;
			acc.fail += s.totals.fail;
			acc.warn += s.totals.warn;
			acc.info += s.totals.info;
		}
		return acc;
	});

	const kubeBenchSources = $derived(
		(data.kubebench ?? []).map((s) => ({ benchmark: s.benchmark, scannedAt: s.scannedAt }))
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
				const attestation = attestations[control.id] ?? null;
				const kubebench = kubeBenchByVid.get(control.id) ?? null;
				// Annotation-declared NA wins over any scanner/overlay output so
				// operators can flag entire swaths of a benchmark (e.g. control-plane
				// flag rules on a managed Kubernetes service) as out-of-scope without
				// deleting them from the spec.
				if (naIds.has(control.id)) {
					return {
						...control,
						status: 'Not_Applicable',
						totalFail: null,
						totalEvaluated: 0,
						detail,
						attestation,
						kubebench,
						overlay: null
					};
				}
				const st = statusById.get(control.id);
				const scannerStatus = st?.status ?? 'Not_Reviewed';
				// Overlays only fire when the scanner didn't bind a result. A real
				// scanner fail/pass is authoritative — operators must remediate or
				// use the NA annotation, not hide findings via automation or manual
				// attestation.
				if (scannerStatus !== 'Not_Reviewed') {
					return {
						...control,
						status: scannerStatus,
						totalFail: st?.totalFail ?? null,
						totalEvaluated: st?.totalEvaluated ?? 0,
						detail,
						attestation,
						kubebench,
						overlay: null
					};
				}
				// kube-bench PASS/FAIL outranks manual attestation — an automated
				// result is higher-trust than a signed-off assertion. WARN/INFO is
				// not actionable on its own and falls through to attestation.
				if (kubebench && (kubebench.status === 'PASS' || kubebench.status === 'FAIL')) {
					return {
						...control,
						status: kubebench.status === 'FAIL' ? 'Open' : 'NotAFinding',
						totalFail: kubebench.status === 'FAIL' ? 1 : null,
						totalEvaluated: 1,
						detail,
						attestation,
						kubebench,
						overlay: 'kubebench'
					};
				}
				if (attestation) {
					const attestedStatus: StigStatus =
						attestation.status === 'manual-pass'
							? 'NotAFinding'
							: attestation.status === 'manual-fail'
								? 'Open'
								: 'Not_Applicable';
					return {
						...control,
						status: attestedStatus,
						totalFail: attestation.status === 'manual-fail' ? 1 : null,
						totalEvaluated: 0,
						detail,
						attestation,
						kubebench,
						overlay: 'attestation'
					};
				}
				// Nothing overlaid — stays Not_Reviewed. If kube-bench left a
				// WARN/INFO, the detail modal will surface it so a reviewer has
				// context; it just doesn't move the status.
				return {
					...control,
					status: 'Not_Reviewed',
					totalFail: null,
					totalEvaluated: 0,
					detail,
					attestation,
					kubebench,
					overlay: null
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
		if (c.overlay === 'kubebench' && c.kubebench) {
			const when = c.kubebench.scannedAt
				? ` at ${new Date(c.kubebench.scannedAt).toLocaleString()}`
				: '';
			return `Marked ${statusLabel(c.status)} by kube-bench (${c.kubebench.benchmark}, section ${c.kubebench.section || 'n/a'})${when}. kube-bench result overrides because no trivy-operator check was bound to this control; a scanner fail/pass would still win.`;
		}
		if (c.overlay === 'attestation' && c.attestation) {
			const who = c.attestation.reviewedBy || 'unknown reviewer';
			const when = c.attestation.reviewedAt || '';
			const base = `Marked ${statusLabel(c.status)} via manual attestation by ${who}${when ? ` on ${when}` : ''}.`;
			const reason = c.attestation.reason ? ` Reason: ${c.attestation.reason}` : '';
			return `${base}${reason} Attestation applies because no scanner check and no kube-bench PASS/FAIL was bound to this control.`;
		}
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
		formStatus = '';
		formReviewedBy = '';
		formEvidence = '';
		formReason = '';
		saveError = '';
	}

	// Attestation form state. Rebuilt from the selected control each time the
	// modal opens so the form pre-fills with the existing attestation (if any)
	// rather than confusing the reviewer with a blank slate they'd have to
	// re-type.
	let formStatus = $state<'' | Attestation['status']>('');
	let formReviewedBy = $state('');
	let formEvidence = $state('');
	let formReason = $state('');
	let saving = $state(false);
	let saveError = $state('');

	$effect(() => {
		if (!selectedControl) return;
		const a = selectedControl.attestation;
		formStatus = a?.status ?? '';
		formReviewedBy = a?.reviewedBy ?? '';
		formEvidence = a?.evidence ?? '';
		formReason = a?.reason ?? '';
		saveError = '';
	});

	// Attestation is permitted when nothing definitive has fired: Not_Reviewed
	// without a kube-bench PASS/FAIL, or an existing attestation that the
	// reviewer wants to edit/clear. Scanner and kube-bench definitive results
	// lock out manual attestation so an operator can't paper over automation.
	function canAttest(c: EnrichedControl | null): boolean {
		if (!c) return false;
		if (c.overlay === 'attestation') return true;
		if (c.overlay === 'kubebench') return false;
		return c.status === 'Not_Reviewed';
	}

	async function saveAttestation(action: 'save' | 'clear'): Promise<void> {
		if (!selectedControl) return;
		saving = true;
		saveError = '';
		try {
			const next: AttestationMap = { ...attestations };
			if (action === 'clear') {
				delete next[selectedControl.id];
			} else {
				if (!formStatus) {
					saveError = 'Pick a status.';
					saving = false;
					return;
				}
				if (!formReviewedBy.trim()) {
					saveError = 'Reviewer is required.';
					saving = false;
					return;
				}
				next[selectedControl.id] = {
					status: formStatus,
					reviewedBy: formReviewedBy.trim(),
					reviewedAt: new Date().toISOString(),
					evidence: formEvidence.trim() || undefined,
					reason: formReason.trim() || undefined
				};
			}
			const res = await fetch(`/api/attestations/cluster/${encodeURIComponent(data.name)}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ attestations: next })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || `HTTP ${res.status}`);
			}
			const body = await res.json();
			attestations = body.attestations ?? {};
			closeModal();
		} catch (err) {
			saveError = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}

	let driftOpen = $state(false);
</script>

<div style="padding: var(--space-md);">
	{#if data.attestationError}
		<div class="nd-alert nd-alert-error" style="margin-bottom: var(--space-md);">
			Attestation store unavailable: {data.attestationError}. Namespace
			<code>{data.attestationNamespace}</code> must exist and the controller's service account must have
			get/create/patch on configmaps in it.
		</div>
	{/if}

	{#if data.kubebenchError}
		<div class="nd-alert nd-alert-error" style="margin-bottom: var(--space-md);">
			kube-bench results unavailable: {data.kubebenchError}.
		</div>
	{/if}

	{#if kubeBenchSources.length > 0}
		<div
			class="nd-card"
			style="margin-bottom: var(--space-md); display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: center;"
		>
			<div>
				<span class="nd-label">kube-bench</span>
				<span class="nd-caption" style="margin-left: var(--space-sm);">
					{#each kubeBenchSources as s, i}
						<span class="nd-mono">{s.benchmark}</span>{#if s.scannedAt}
							<span class="nd-caption"> ({new Date(s.scannedAt).toLocaleString()})</span>
						{/if}{#if i < kubeBenchSources.length - 1},
						{/if}
					{/each}
				</span>
			</div>
			<div style="display: flex; gap: var(--space-sm);">
				<span class="nd-tag nd-tag-pass">PASS {kubeBenchTotals.pass}</span>
				<span class="nd-tag nd-tag-fail">FAIL {kubeBenchTotals.fail}</span>
				<span class="nd-tag nd-tag-unknown">WARN {kubeBenchTotals.warn}</span>
				{#if kubeBenchTotals.info > 0}
					<span class="nd-tag nd-tag-info">INFO {kubeBenchTotals.info}</span>
				{/if}
			</div>
		</div>
	{/if}

	{#if data.stig}
		{@const src = data.stig.source}
		{@const miss = data.stig.drift.missingFromSpec}
		{@const extra = data.stig.drift.extraInSpec}
		{@const dateStr = src.date ? new Date(src.date).toISOString().slice(0, 10) : ''}
		<div class="nd-card" style="margin-bottom: var(--space-md);">
			<button
				type="button"
				class="nd-btn nd-btn-plain"
				style="width: 100%; text-align: left; display: flex; justify-content: space-between; align-items: center; background: none; border: none; padding: var(--space-sm) 0;"
				onclick={() => (driftOpen = !driftOpen)}
				aria-expanded={driftOpen}
			>
				<span>
					<span class="nd-label">DISA STIG drift</span>
					<span class="nd-caption" style="margin-left: var(--space-sm);">
						source {src.filename}{dateStr ? ` (${dateStr})` : ''} · {src.count} controls ({src.cat1}
						CAT I / {src.cat2} CAT II{src.cat3 ? ` / ${src.cat3} CAT III` : ''})
					</span>
				</span>
				<span class="nd-caption">
					{#if miss.length === 0 && extra.length === 0}
						in sync
					{:else}
						{miss.length} missing · {extra.length} extra {driftOpen ? '▾' : '▸'}
					{/if}
				</span>
			</button>
			{#if driftOpen}
				<div style="margin-top: var(--space-sm);">
					{#if miss.length > 0}
						<p class="nd-label" style="margin-bottom: var(--space-xs);">
							In STIG, missing from this spec ({miss.length})
						</p>
						<p class="nd-caption" style="margin-bottom: var(--space-sm);">
							These DISA controls are in the bundled CSV but no control with that id exists in
							<code>spec.compliance.controls</code>, so trivy-operator cannot evaluate them.
						</p>
						<ul class="nd-body-sm" style="margin: 0 0 var(--space-md) var(--space-md); padding: 0;">
							{#each miss as m}
								<li>
									<span class="nd-mono"><strong>{m.id}</strong></span>
									<span
										class="nd-tag nd-tag-{m.cat === 'CAT 1' ? 'critical' : 'medium'}"
										style="margin: 0 var(--space-xs);">{m.cat}</span
									>
									{m.title}
								</li>
							{/each}
						</ul>
					{/if}
					{#if extra.length > 0}
						<p class="nd-label" style="margin-bottom: var(--space-xs);">
							In spec, not in current STIG ({extra.length})
						</p>
						<p class="nd-caption" style="margin-bottom: var(--space-sm);">
							These ids appear in the ClusterComplianceReport spec but not in the bundled CSV —
							either the STIG dropped them, the CSV is stale, or the spec uses non-DISA ids.
						</p>
						<ul class="nd-body-sm" style="margin: 0 0 0 var(--space-md); padding: 0;">
							{#each extra as id}
								<li><span class="nd-mono">{id}</span></li>
							{/each}
						</ul>
					{/if}
					{#if miss.length === 0 && extra.length === 0}
						<p class="nd-caption">
							The spec covers every V-ID in the bundled STIG — evaluation scope matches the
							benchmark.
						</p>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

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
						<td>
							<span class="nd-tag nd-tag-{statusTag(control.status || '')}"
								>{statusLabel(control.status || '')}</span
							>
							{#if control.overlay === 'kubebench'}
								<span
									class="nd-tag nd-tag-info"
									style="margin-left: var(--space-xs); font-size: var(--caption);"
									title="Status from kube-bench — no trivy-operator binding"
								>
									KUBE-BENCH
								</span>
							{:else if control.overlay === 'attestation'}
								<span
									class="nd-tag nd-tag-info"
									style="margin-left: var(--space-xs); font-size: var(--caption);"
									title="Manually attested — no scanner or kube-bench binding"
								>
									ATTESTED
								</span>
							{:else if control.kubebench && (control.kubebench.status === 'WARN' || control.kubebench.status === 'INFO')}
								<span
									class="nd-tag nd-tag-unknown"
									style="margin-left: var(--space-xs); font-size: var(--caption);"
									title="kube-bench {control.kubebench.status} — needs review"
								>
									KB-{control.kubebench.status}
								</span>
							{/if}
						</td>
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
			onclick={(e) => e.target === e.currentTarget && closeModal()}
			onkeydown={(e) => e.key === 'Escape' && closeModal()}
			role="dialog"
			tabindex="-1"
		>
			<div class="nd-modal" role="document">
				<div class="nd-modal-header">
					<span class="nd-modal-title"
						><span class="nd-mono">{selectedControl.id}</span> — {selectedControl.name}</span
					>
					<button class="nd-modal-close" onclick={closeModal}>[ X ]</button>
				</div>

				<!-- Severity + status row -->
				<div
					style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-md); align-items: center; flex-wrap: wrap;"
				>
					<span class="nd-caption">Severity:</span>
					<span class="nd-tag nd-tag-{severityTag(selectedControl.severity)}"
						>{selectedControl.severity || 'UNKNOWN'}</span
					>
					<span class="nd-caption" style="margin-left: var(--space-md);">Status:</span>
					<span class="nd-tag nd-tag-{statusTag(selectedControl.status)}"
						>{statusLabel(selectedControl.status)}</span
					>
					{#if selectedControl.overlay === 'kubebench'}
						<span class="nd-tag nd-tag-info" style="margin-left: var(--space-xs);">KUBE-BENCH</span>
					{:else if selectedControl.overlay === 'attestation'}
						<span class="nd-tag nd-tag-info" style="margin-left: var(--space-xs);">ATTESTED</span>
					{/if}
					{#if selectedControl.kubebench && selectedControl.overlay !== 'kubebench' && (selectedControl.kubebench.status === 'WARN' || selectedControl.kubebench.status === 'INFO')}
						<span class="nd-tag nd-tag-unknown" style="margin-left: var(--space-xs);">
							KB-{selectedControl.kubebench.status}
						</span>
					{/if}
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
				{:else if selectedControl.status === 'Not_Reviewed' && !selectedControl.overlay}
					<p class="nd-caption" style="color: var(--nd-text-secondary);">
						No spec checks declared — this control is manual-review only.
					</p>
				{/if}

				<!-- kube-bench details. Shown whenever kube-bench produced a result,
				  regardless of whether it drove the status (PASS/FAIL) or just left a
				  WARN/INFO note. Distinct from the spec-check section above. -->
				{#if selectedControl.kubebench}
					{@const kb = selectedControl.kubebench}
					<div
						style="margin-top: var(--space-lg); padding: var(--space-md); border-left: 2px solid var(--accent); background: var(--nd-surface-subtle);"
					>
						<p class="nd-label" style="margin-bottom: var(--space-xs);">
							kube-bench — <span class="nd-mono">{kb.benchmark}</span>
							{#if kb.section}<span class="nd-caption"> · §{kb.section}</span>{/if}
							<span
								class="nd-tag nd-tag-{kb.status === 'PASS'
									? 'pass'
									: kb.status === 'FAIL'
										? 'fail'
										: 'unknown'}"
								style="margin-left: var(--space-sm);">{kb.status}</span
							>
						</p>
						{#if kb.scannedAt}
							<p class="nd-caption" style="margin-bottom: var(--space-sm);">
								Scanned {new Date(kb.scannedAt).toLocaleString()}
							</p>
						{/if}
						{#if kb.testDesc}
							<p class="nd-body-sm" style="margin-bottom: var(--space-sm);">{kb.testDesc}</p>
						{/if}
						{#if kb.audit}
							<p class="nd-caption" style="font-weight: bold;">Audit command</p>
							<pre
								class="nd-code"
								style="max-height: 160px; overflow: auto; font-size: var(--caption);">{kb.audit}</pre>
						{/if}
						{#if kb.actualValue}
							<p class="nd-caption" style="font-weight: bold; margin-top: var(--space-xs);">
								Actual value
							</p>
							<pre
								class="nd-code"
								style="max-height: 120px; overflow: auto; font-size: var(--caption);">{kb.actualValue}</pre>
						{/if}
						{#if kb.remediation && kb.status !== 'PASS'}
							<p class="nd-caption" style="font-weight: bold; margin-top: var(--space-xs);">
								Remediation
							</p>
							<p class="nd-caption">{kb.remediation}</p>
						{/if}
					</div>
				{/if}

				<!-- Manual attestation. Only available when no scanner or kube-bench
				  PASS/FAIL is bound (or the control is already attested, so it can be
				  edited/cleared). -->
				{#if canAttest(selectedControl)}
					<div
						style="margin-top: var(--space-lg); padding: var(--space-md); border: 1px solid var(--nd-border); border-radius: 4px;"
					>
						<p class="nd-label" style="margin-bottom: var(--space-sm);">Manual attestation</p>
						{#if selectedControl.attestation}
							<p class="nd-caption" style="margin-bottom: var(--space-sm);">
								Current: <strong>{statusLabel(selectedControl.status)}</strong> — {selectedControl
									.attestation.reviewedBy}
								{#if selectedControl.attestation.reviewedAt}
									on {new Date(selectedControl.attestation.reviewedAt).toLocaleString()}
								{/if}
							</p>
						{/if}
						<p class="nd-caption" style="margin-bottom: var(--space-sm);">
							Persisted to ConfigMap <code>trivyglass-attestations-{data.name}</code> in namespace
							<code>{data.attestationNamespace}</code>.
						</p>

						<div
							style="display: grid; grid-template-columns: 160px 1fr; gap: var(--space-sm) var(--space-md); align-items: center;"
						>
							<label class="nd-label" for="attest-status">Status</label>
							<select
								id="attest-status"
								class="nd-input-bordered"
								bind:value={formStatus}
								disabled={saving}
							>
								<option value="">— pick —</option>
								<option value="manual-pass">Not a Finding (manual-pass)</option>
								<option value="manual-fail">Open (manual-fail)</option>
								<option value="not-applicable">Not Applicable</option>
							</select>

							<label class="nd-label" for="attest-reviewer">Reviewer</label>
							<input
								id="attest-reviewer"
								class="nd-input-bordered"
								type="text"
								placeholder="e.g. patrick@radiusmethod.com"
								bind:value={formReviewedBy}
								disabled={saving}
							/>

							<label class="nd-label" for="attest-evidence">Evidence</label>
							<textarea
								id="attest-evidence"
								class="nd-textarea"
								rows="2"
								placeholder="Ticket, screenshot URL, output of a manual check…"
								bind:value={formEvidence}
								disabled={saving}
							></textarea>

							<label class="nd-label" for="attest-reason">Reason</label>
							<textarea
								id="attest-reason"
								class="nd-textarea"
								rows="2"
								placeholder="Why this status applies"
								bind:value={formReason}
								disabled={saving}
							></textarea>
						</div>

						{#if saveError}
							<p
								class="nd-alert nd-alert-error"
								style="margin-top: var(--space-sm); padding: var(--space-xs) var(--space-sm);"
							>
								{saveError}
							</p>
						{/if}

						<div
							style="margin-top: var(--space-md); display: flex; gap: var(--space-sm); justify-content: flex-end;"
						>
							{#if selectedControl.attestation}
								<button
									type="button"
									class="nd-btn nd-btn-destructive nd-btn-sm"
									onclick={() => saveAttestation('clear')}
									disabled={saving}>Clear attestation</button
								>
							{/if}
							<button
								type="button"
								class="nd-btn nd-btn-primary nd-btn-sm"
								onclick={() => saveAttestation('save')}
								disabled={saving}
							>
								{saving ? 'Saving…' : 'Save attestation'}
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
