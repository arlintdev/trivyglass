export interface ReportTypeConfig {
	label: string;
	cluster: string | null;
	namespace: string | null;
	icon: string;
}

export const REPORT_TYPES: Record<string, ReportTypeConfig> = {
	vulnerabilities: {
		label: 'Vulnerabilities',
		cluster: 'clustervulnerabilityreports',
		namespace: 'vulnerabilityreports',
		icon: 'alert-circle'
	},
	'config-audit': {
		label: 'Config Audit',
		cluster: 'clusterconfigauditreports',
		namespace: 'configauditreports',
		icon: 'settings'
	},
	compliance: {
		label: 'Compliance',
		cluster: 'clustercompliancereports',
		namespace: null,
		icon: 'shield'
	},
	sbom: {
		label: 'SBOM',
		cluster: 'clustersbomreports',
		namespace: 'sbomreports',
		icon: 'package'
	},
	secrets: {
		label: 'Exposed Secrets',
		cluster: null,
		namespace: 'exposedsecretreports',
		icon: 'lock'
	},
	rbac: {
		label: 'RBAC Assessment',
		cluster: 'clusterrbacassessmentreports',
		namespace: 'rbacassessmentreports',
		icon: 'lock'
	},
	infrastructure: {
		label: 'Infrastructure',
		cluster: 'clusterinfraassessmentreports',
		namespace: 'infraassessmentreports',
		icon: 'server'
	}
};

/** Look up the report type slug from a CRD plural name */
export function slugFromCrdPlural(crdPlural: string): string | undefined {
	for (const [slug, config] of Object.entries(REPORT_TYPES)) {
		if (config.cluster === crdPlural || config.namespace === crdPlural) {
			return slug;
		}
	}
	return undefined;
}
