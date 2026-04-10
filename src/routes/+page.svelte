<script lang="ts">
	import { REPORT_TYPES } from '$lib/reportTypes';

	interface VulnerableWorkload {
		name: string;
		namespace: string;
		critical: number;
		high: number;
		medium: number;
		low: number;
	}

	interface Data {
		vulnerabilities: { critical: number; high: number; medium: number; low: number };
		configAudit: { pass: number; fail: number };
		compliance: { pass: number; fail: number; score: number | null };
		secrets: { critical: number; high: number; medium: number; low: number };
		secretsTotal: number;
		topVulnerableWorkloads: VulnerableWorkload[];
		reportCounts: Record<string, number>;
		clusterName: string;
	}

	let { data }: { data: Data } = $props();

	const vulnTotal = $derived(
		data.vulnerabilities.critical +
			data.vulnerabilities.high +
			data.vulnerabilities.medium +
			data.vulnerabilities.low
	);

	const auditTotal = $derived(data.configAudit.pass + data.configAudit.fail);
	const auditScore = $derived(
		auditTotal > 0 ? Math.round((data.configAudit.pass / auditTotal) * 100) : null
	);

	// Max severity total across top workloads (for scaling inline bars)
	const maxWorkloadTotal = $derived(
		data.topVulnerableWorkloads.reduce(
			(max, w) => Math.max(max, w.critical + w.high + w.medium + w.low),
			0
		)
	);

	// SVG arc helper for pass-rate rings
	function describeArc(
		cx: number,
		cy: number,
		r: number,
		startAngle: number,
		endAngle: number
	): string {
		const start = polarToCartesian(cx, cy, r, endAngle);
		const end = polarToCartesian(cx, cy, r, startAngle);
		const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
		return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
	}

	function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
		const rad = ((angleDeg - 90) * Math.PI) / 180;
		return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
	}
</script>

<div style="max-width: 1200px; margin: 0 auto; padding: var(--space-xl) var(--space-md);">
	<!-- Primary: Section label -->
	<span
		class="nd-label"
		style="font-size: var(--caption); color: var(--nd-text-disabled); letter-spacing: 0.1em;"
	>
		SECURITY POSTURE
	</span>

	<!-- Row 1: Vulnerability severity cards with distribution bar -->
	<div
		class="nd-grid-4"
		style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-md); margin-top: var(--space-lg);"
	>
		<a
			href="/vulnerabilities"
			class="nd-card"
			style="text-decoration: none; text-align: center; padding: var(--space-lg) var(--space-md);"
		>
			<span
				class="nd-hero-number"
				style="font-family: var(--font-mono); font-size: var(--display-lg); color: var(--accent); line-height: 1;"
			>
				{data.vulnerabilities.critical}
			</span>
			<span
				class="nd-label"
				style="display: block; margin-top: var(--space-sm); font-size: var(--caption); color: var(--nd-text-secondary);"
			>
				CRITICAL
			</span>
		</a>

		<a
			href="/vulnerabilities"
			class="nd-card"
			style="text-decoration: none; text-align: center; padding: var(--space-lg) var(--space-md);"
		>
			<span
				class="nd-hero-number"
				style="font-family: var(--font-mono); font-size: var(--display-lg); color: var(--warning); line-height: 1;"
			>
				{data.vulnerabilities.high}
			</span>
			<span
				class="nd-label"
				style="display: block; margin-top: var(--space-sm); font-size: var(--caption); color: var(--nd-text-secondary);"
			>
				HIGH
			</span>
		</a>

		<a
			href="/vulnerabilities"
			class="nd-card"
			style="text-decoration: none; text-align: center; padding: var(--space-lg) var(--space-md);"
		>
			<span
				class="nd-hero-number"
				style="font-family: var(--font-mono); font-size: var(--display-lg); color: var(--nd-text-secondary); line-height: 1;"
			>
				{data.vulnerabilities.medium}
			</span>
			<span
				class="nd-label"
				style="display: block; margin-top: var(--space-sm); font-size: var(--caption); color: var(--nd-text-secondary);"
			>
				MEDIUM
			</span>
		</a>

		<a
			href="/vulnerabilities"
			class="nd-card"
			style="text-decoration: none; text-align: center; padding: var(--space-lg) var(--space-md);"
		>
			<span
				class="nd-hero-number"
				style="font-family: var(--font-mono); font-size: var(--display-lg); color: var(--success); line-height: 1;"
			>
				{data.vulnerabilities.low}
			</span>
			<span
				class="nd-label"
				style="display: block; margin-top: var(--space-sm); font-size: var(--caption); color: var(--nd-text-secondary);"
			>
				LOW
			</span>
		</a>
	</div>

	<!-- Severity distribution bar -->
	{#if vulnTotal > 0}
		<div style="margin-top: var(--space-md); margin-bottom: var(--space-xl);">
			<div style="display: flex; height: 6px; border-radius: 3px; overflow: hidden; gap: 2px;">
				{#if data.vulnerabilities.critical > 0}
					<div
						style="flex: {data.vulnerabilities
							.critical}; background: var(--accent); transition: flex var(--duration-transition) var(--ease-out);"
					></div>
				{/if}
				{#if data.vulnerabilities.high > 0}
					<div
						style="flex: {data.vulnerabilities
							.high}; background: var(--warning); transition: flex var(--duration-transition) var(--ease-out);"
					></div>
				{/if}
				{#if data.vulnerabilities.medium > 0}
					<div
						style="flex: {data.vulnerabilities
							.medium}; background: var(--nd-text-disabled); transition: flex var(--duration-transition) var(--ease-out);"
					></div>
				{/if}
				{#if data.vulnerabilities.low > 0}
					<div
						style="flex: {data.vulnerabilities
							.low}; background: var(--success); transition: flex var(--duration-transition) var(--ease-out);"
					></div>
				{/if}
			</div>
			<div style="display: flex; justify-content: space-between; margin-top: var(--space-xs);">
				<span class="nd-caption" style="color: var(--nd-text-disabled);"
					>{vulnTotal} total vulnerabilities</span
				>
			</div>
		</div>
	{:else}
		<div style="margin-bottom: var(--space-xl);"></div>
	{/if}

	<!-- Row 2: Compliance + Config Audit + Secrets — with arcs -->
	<div
		class="nd-grid-3"
		style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md); margin-bottom: var(--space-xl);"
	>
		<!-- Compliance Score with arc -->
		<a
			href="/compliance"
			class="nd-card"
			style="text-decoration: none; padding: var(--space-lg); display: flex; align-items: center; gap: var(--space-lg);"
		>
			{#if data.compliance.score !== null}
				<!-- SVG arc ring -->
				<div style="flex-shrink: 0;">
					<svg width="80" height="80" viewBox="0 0 80 80">
						<!-- Track -->
						<circle
							cx="40"
							cy="40"
							r="32"
							fill="none"
							stroke="var(--nd-border-visible)"
							stroke-width="4"
							opacity="0.4"
						/>
						<!-- Arc -->
						{#if data.compliance.score > 0}
							<path
								d={describeArc(40, 40, 32, 0, Math.min(data.compliance.score * 3.6, 359.9))}
								fill="none"
								stroke={data.compliance.score >= 80
									? 'var(--success)'
									: data.compliance.score >= 50
										? 'var(--warning)'
										: 'var(--accent)'}
								stroke-width="4"
								stroke-linecap="round"
							/>
						{/if}
						<!-- Center text -->
						<text
							x="40"
							y="36"
							text-anchor="middle"
							fill="var(--nd-text-display)"
							font-family="var(--font-mono)"
							font-size="18"
							font-weight="400"
						>
							{data.compliance.score}
						</text>
						<text
							x="40"
							y="50"
							text-anchor="middle"
							fill="var(--nd-text-disabled)"
							font-family="var(--font-mono)"
							font-size="10"
						>
							%
						</text>
					</svg>
				</div>
				<div>
					<span class="nd-label" style="font-size: var(--caption); color: var(--nd-text-disabled);"
						>COMPLIANCE</span
					>
					<span
						class="nd-caption"
						style="color: var(--nd-text-secondary); margin-top: var(--space-xs); display: block;"
					>
						{data.compliance.pass} pass / {data.compliance.fail} fail
					</span>
				</div>
			{:else}
				<div>
					<span class="nd-label" style="font-size: var(--caption); color: var(--nd-text-disabled);"
						>COMPLIANCE</span
					>
					<div style="margin-top: var(--space-sm);">
						<span
							style="font-family: var(--font-mono); font-size: var(--heading); color: var(--nd-text-disabled);"
						>
							No data
						</span>
					</div>
				</div>
			{/if}
		</a>

		<!-- Config Audit with arc -->
		<a
			href="/config-audit"
			class="nd-card"
			style="text-decoration: none; padding: var(--space-lg); display: flex; align-items: center; gap: var(--space-lg);"
		>
			{#if auditScore !== null}
				<div style="flex-shrink: 0;">
					<svg width="80" height="80" viewBox="0 0 80 80">
						<circle
							cx="40"
							cy="40"
							r="32"
							fill="none"
							stroke="var(--nd-border-visible)"
							stroke-width="4"
							opacity="0.4"
						/>
						{#if auditScore > 0}
							<path
								d={describeArc(40, 40, 32, 0, Math.min(auditScore * 3.6, 359.9))}
								fill="none"
								stroke={auditScore >= 80
									? 'var(--success)'
									: auditScore >= 50
										? 'var(--warning)'
										: 'var(--accent)'}
								stroke-width="4"
								stroke-linecap="round"
							/>
						{/if}
						<text
							x="40"
							y="36"
							text-anchor="middle"
							fill="var(--nd-text-display)"
							font-family="var(--font-mono)"
							font-size="18"
							font-weight="400"
						>
							{auditScore}
						</text>
						<text
							x="40"
							y="50"
							text-anchor="middle"
							fill="var(--nd-text-disabled)"
							font-family="var(--font-mono)"
							font-size="10"
						>
							%
						</text>
					</svg>
				</div>
				<div>
					<span class="nd-label" style="font-size: var(--caption); color: var(--nd-text-disabled);"
						>CONFIG AUDIT</span
					>
					<span
						class="nd-caption"
						style="color: var(--nd-text-secondary); margin-top: var(--space-xs); display: block;"
					>
						{data.configAudit.pass} pass / {data.configAudit.fail} fail
					</span>
				</div>
			{:else}
				<div>
					<span class="nd-label" style="font-size: var(--caption); color: var(--nd-text-disabled);"
						>CONFIG AUDIT</span
					>
					<div style="margin-top: var(--space-sm);">
						<span
							style="font-family: var(--font-mono); font-size: var(--heading); color: var(--nd-text-disabled);"
						>
							No data
						</span>
					</div>
				</div>
			{/if}
		</a>

		<!-- Exposed Secrets with severity bar -->
		<a href="/secrets" class="nd-card" style="text-decoration: none; padding: var(--space-lg);">
			<span class="nd-label" style="font-size: var(--caption); color: var(--nd-text-disabled);"
				>EXPOSED SECRETS</span
			>
			<div style="margin-top: var(--space-sm);">
				<span
					style="font-family: var(--font-mono); font-size: var(--display-md); line-height: 1;"
					style:color={data.secretsTotal > 0 ? 'var(--accent)' : 'var(--success)'}
				>
					{data.secretsTotal}
				</span>
			</div>
			{#if data.secretsTotal > 0}
				<!-- Mini severity bar for secrets -->
				<div
					style="display: flex; height: 4px; border-radius: 2px; overflow: hidden; gap: 1px; margin-top: var(--space-sm);"
				>
					{#if data.secrets.critical > 0}
						<div style="flex: {data.secrets.critical}; background: var(--accent);"></div>
					{/if}
					{#if data.secrets.high > 0}
						<div style="flex: {data.secrets.high}; background: var(--warning);"></div>
					{/if}
					{#if data.secrets.medium > 0}
						<div style="flex: {data.secrets.medium}; background: var(--nd-text-disabled);"></div>
					{/if}
					{#if data.secrets.low > 0}
						<div style="flex: {data.secrets.low}; background: var(--success);"></div>
					{/if}
				</div>
				<span
					class="nd-caption"
					style="color: var(--nd-text-secondary); margin-top: var(--space-xs); display: block;"
				>
					{data.secrets.critical} critical / {data.secrets.high} high / {data.secrets.medium} med / {data
						.secrets.low} low
				</span>
			{:else}
				<span
					class="nd-caption"
					style="color: var(--nd-text-secondary); margin-top: var(--space-xs); display: block;"
				>
					no findings
				</span>
			{/if}
		</a>
	</div>

	<!-- Row 3: Top Vulnerable Workloads with inline bars -->
	{#if data.topVulnerableWorkloads.length > 0}
		<div style="margin-bottom: var(--space-xl);">
			<span
				class="nd-label"
				style="font-size: var(--caption); color: var(--nd-text-disabled); letter-spacing: 0.1em;"
			>
				TOP VULNERABLE WORKLOADS
			</span>

			<!-- Desktop table -->
			<div class="nd-table-desktop" style="overflow-x: auto;">
				<table class="nd-table" style="margin-top: var(--space-md);">
					<thead>
						<tr>
							<th>Namespace / Name</th>
							<th>Critical</th>
							<th>High</th>
							<th>Medium</th>
							<th>Low</th>
							<th style="min-width: 120px;">Distribution</th>
						</tr>
					</thead>
					<tbody>
						{#each data.topVulnerableWorkloads as workload}
							{@const total = workload.critical + workload.high + workload.medium + workload.low}
							<tr>
								<td>
									<span class="nd-caption">{workload.namespace}</span>
									<br />
									<a
										href="/vulnerabilities/namespace/{workload.namespace}/{workload.name}"
										style="color: var(--nd-interactive); text-decoration: none; font-size: var(--body-sm);"
									>
										{workload.name}
									</a>
								</td>
								<td><span class="nd-tag nd-tag-critical">{workload.critical}</span></td>
								<td><span class="nd-tag nd-tag-high">{workload.high}</span></td>
								<td><span class="nd-tag nd-tag-medium">{workload.medium}</span></td>
								<td><span class="nd-tag nd-tag-low">{workload.low}</span></td>
								<td>
									{#if maxWorkloadTotal > 0}
										<div
											style="display: flex; height: 8px; border-radius: 4px; overflow: hidden; gap: 1px; width: {Math.round(
												(total / maxWorkloadTotal) * 100
											)}%;"
										>
											{#if workload.critical > 0}
												<div style="flex: {workload.critical}; background: var(--accent);"></div>
											{/if}
											{#if workload.high > 0}
												<div style="flex: {workload.high}; background: var(--warning);"></div>
											{/if}
											{#if workload.medium > 0}
												<div
													style="flex: {workload.medium}; background: var(--nd-text-disabled);"
												></div>
											{/if}
											{#if workload.low > 0}
												<div style="flex: {workload.low}; background: var(--success);"></div>
											{/if}
										</div>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile cards -->
			<div class="nd-report-card" style="margin-top: var(--space-md);">
				<div style="display: flex; flex-direction: column; gap: var(--space-sm);">
					{#each data.topVulnerableWorkloads as workload}
						{@const total = workload.critical + workload.high + workload.medium + workload.low}
						<a
							href="/vulnerabilities/namespace/{workload.namespace}/{workload.name}"
							class="nd-card"
							style="text-decoration: none; display: block;"
						>
							<div style="margin-bottom: var(--space-xs);">
								<span class="nd-caption" style="color: var(--nd-text-disabled);"
									>{workload.namespace}</span
								>
								<div
									style="font-size: var(--body-sm); color: var(--nd-text-primary); word-break: break-all;"
								>
									{workload.name}
								</div>
							</div>
							<div
								style="display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-bottom: var(--space-sm);"
							>
								<span class="nd-tag nd-tag-critical" style="font-size: var(--caption);"
									>C: {workload.critical}</span
								>
								<span class="nd-tag nd-tag-high" style="font-size: var(--caption);"
									>H: {workload.high}</span
								>
								<span class="nd-tag nd-tag-medium" style="font-size: var(--caption);"
									>M: {workload.medium}</span
								>
								<span class="nd-tag nd-tag-low" style="font-size: var(--caption);"
									>L: {workload.low}</span
								>
							</div>
							{#if maxWorkloadTotal > 0}
								<div
									style="display: flex; height: 6px; border-radius: 3px; overflow: hidden; gap: 1px; width: {Math.round(
										(total / maxWorkloadTotal) * 100
									)}%;"
								>
									{#if workload.critical > 0}
										<div style="flex: {workload.critical}; background: var(--accent);"></div>
									{/if}
									{#if workload.high > 0}
										<div style="flex: {workload.high}; background: var(--warning);"></div>
									{/if}
									{#if workload.medium > 0}
										<div
											style="flex: {workload.medium}; background: var(--nd-text-disabled);"
										></div>
									{/if}
									{#if workload.low > 0}
										<div style="flex: {workload.low}; background: var(--success);"></div>
									{/if}
								</div>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Row 4: Report type quick links with counts -->
	<div style="margin-bottom: var(--space-xl);">
		<span
			class="nd-label"
			style="font-size: var(--caption); color: var(--nd-text-disabled); letter-spacing: 0.1em;"
		>
			ALL REPORTS
		</span>
		<div
			style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-md); margin-top: var(--space-md);"
		>
			{#each Object.entries(REPORT_TYPES) as [slug, config]}
				<a
					href="/{slug}"
					class="nd-card"
					style="text-decoration: none; display: flex; justify-content: space-between; align-items: center;"
				>
					<span style="color: var(--nd-text-primary);">{config.label}</span>
					<span style="font-family: var(--font-mono); color: var(--nd-text-secondary);">
						{data.reportCounts[slug] ?? 0}
					</span>
				</a>
			{/each}
		</div>
	</div>
</div>
