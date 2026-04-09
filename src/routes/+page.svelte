<script lang="ts">
	import ErrorDemo from '../components/ErrorDemo.svelte';

	const reportSections = [
		{
			title: 'Cluster Level Reports',
			reports: [
				{ name: 'Vulnerabilities', href: '/clustervulnerabilityreports', tag: 'critical' },
				{ name: 'Config Audit', href: '/clusterconfigauditreports', tag: 'info' },
				{ name: 'SBOM', href: '/clustersbomreports', tag: 'info' },
				{ name: 'Compliance', href: '/clustercompliancereports', tag: 'pass' },
				{ name: 'RBAC Assessment', href: '/clusterrbacassessmentreports', tag: 'medium' },
				{ name: 'Infrastructure', href: '/clusterinfraassessmentreports', tag: 'info' }
			]
		},
		{
			title: 'Namespace Level Reports',
			reports: [
				{ name: 'Vulnerabilities', href: '/vulnerabilityreports', tag: 'critical' },
				{ name: 'Config Audit', href: '/configauditreports', tag: 'info' },
				{ name: 'SBOM', href: '/sbomreports', tag: 'info' },
				{ name: 'Exposed Secrets', href: '/exposedsecretreports', tag: 'high' },
				{ name: 'RBAC Assessment', href: '/rbacassessmentreports', tag: 'medium' },
				{ name: 'Infrastructure', href: '/infraassessmentreports', tag: 'info' }
			]
		}
	];

	const descriptions: Record<string, string> = {
		'Vulnerabilities': 'Track critical, high, medium, and low severity issues across resources.',
		'Config Audit': 'Identify misconfigurations and policy violations with remediation steps.',
		'SBOM': 'Comprehensive inventory of components, libraries, and dependencies.',
		'Compliance': 'Monitor compliance against industry standards and best practices.',
		'RBAC Assessment': 'Analyze RBAC configurations and identify permission risks.',
		'Infrastructure': 'Evaluate infrastructure for security vulnerabilities.',
		'Exposed Secrets': 'Detect exposed API keys, tokens, and credentials.'
	};
</script>

<div style="max-width: 1200px; margin: 0 auto; padding: var(--space-2xl) var(--space-md);">
	<!-- Hero -->
	<div style="text-align: center; margin-bottom: var(--space-3xl);">
		<h1 class="nd-display" style="font-size: var(--display-lg); margin-bottom: var(--space-md);">
			Trivy Glass
		</h1>
		<p class="nd-body" style="color: var(--nd-text-secondary); max-width: 640px; margin: 0 auto var(--space-lg);">
			A single pane of glass for all trivy-operator reports. Monitor cluster
			vulnerabilities, compliance, and security posture.
		</p>
		<a
			href="https://github.com/arlintdev/trivyglass"
			target="_blank"
			rel="noopener noreferrer"
			class="nd-btn nd-btn-secondary"
		>
			<!-- GitHub icon -->
			<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
			</svg>
			GitHub Repository
		</a>
	</div>

	<!-- Report Sections -->
	{#each reportSections as section}
		<div style="margin-bottom: var(--space-2xl);">
			<h2 class="nd-label" style="font-size: var(--caption); margin-bottom: var(--space-lg);">
				{section.title}
			</h2>
			<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-md);">
				{#each section.reports as report}
					<a href={report.href} class="nd-card" style="text-decoration: none; display: flex; flex-direction: column; gap: var(--space-sm);">
						<div style="display: flex; align-items: center; justify-content: space-between;">
							<span class="nd-subheading" style="color: var(--nd-text-display);">{report.name}</span>
							<span class="nd-tag nd-tag-{report.tag}">{report.tag}</span>
						</div>
						<p style="color: var(--nd-text-secondary); font-size: var(--body-sm); margin: 0;">
							{descriptions[report.name]}
						</p>
					</a>
				{/each}
			</div>
		</div>
	{/each}

	<!-- Error Demo -->
	<div style="margin-top: var(--space-2xl);">
		<h2 class="nd-label" style="font-size: var(--caption); margin-bottom: var(--space-lg);">
			Error Notification Demo
		</h2>
		<ErrorDemo />
	</div>
</div>
