import { describe, it, expect } from 'vitest';
import { REPORT_TYPES, slugFromCrdPlural } from './reportTypes';

describe('reportTypes', () => {
	describe('REPORT_TYPES', () => {
		it('contains all 7 report types', () => {
			expect(Object.keys(REPORT_TYPES)).toHaveLength(7);
		});

		it('has correct slugs', () => {
			const slugs = Object.keys(REPORT_TYPES);
			expect(slugs).toContain('vulnerabilities');
			expect(slugs).toContain('config-audit');
			expect(slugs).toContain('compliance');
			expect(slugs).toContain('sbom');
			expect(slugs).toContain('secrets');
			expect(slugs).toContain('rbac');
			expect(slugs).toContain('infrastructure');
		});

		it('maps vulnerabilities to correct CRD plurals', () => {
			expect(REPORT_TYPES.vulnerabilities.cluster).toBe('clustervulnerabilityreports');
			expect(REPORT_TYPES.vulnerabilities.namespace).toBe('vulnerabilityreports');
			expect(REPORT_TYPES.vulnerabilities.label).toBe('Vulnerabilities');
		});

		it('compliance is cluster-only', () => {
			expect(REPORT_TYPES.compliance.cluster).toBe('clustercompliancereports');
			expect(REPORT_TYPES.compliance.namespace).toBeNull();
		});

		it('secrets is namespace-only', () => {
			expect(REPORT_TYPES.secrets.cluster).toBeNull();
			expect(REPORT_TYPES.secrets.namespace).toBe('exposedsecretreports');
		});

		it('each type has a label and icon', () => {
			for (const [slug, config] of Object.entries(REPORT_TYPES)) {
				expect(config.label, `${slug} should have a label`).toBeTruthy();
				expect(config.icon, `${slug} should have an icon`).toBeTruthy();
			}
		});

		it('each type has at least one scope', () => {
			for (const [slug, config] of Object.entries(REPORT_TYPES)) {
				expect(
					config.cluster || config.namespace,
					`${slug} should have at least one CRD`
				).toBeTruthy();
			}
		});
	});

	describe('slugFromCrdPlural', () => {
		it('resolves cluster CRD plurals to slugs', () => {
			expect(slugFromCrdPlural('clustervulnerabilityreports')).toBe('vulnerabilities');
			expect(slugFromCrdPlural('clusterconfigauditreports')).toBe('config-audit');
			expect(slugFromCrdPlural('clustercompliancereports')).toBe('compliance');
			expect(slugFromCrdPlural('clustersbomreports')).toBe('sbom');
			expect(slugFromCrdPlural('clusterrbacassessmentreports')).toBe('rbac');
			expect(slugFromCrdPlural('clusterinfraassessmentreports')).toBe('infrastructure');
		});

		it('resolves namespace CRD plurals to slugs', () => {
			expect(slugFromCrdPlural('vulnerabilityreports')).toBe('vulnerabilities');
			expect(slugFromCrdPlural('configauditreports')).toBe('config-audit');
			expect(slugFromCrdPlural('sbomreports')).toBe('sbom');
			expect(slugFromCrdPlural('exposedsecretreports')).toBe('secrets');
			expect(slugFromCrdPlural('rbacassessmentreports')).toBe('rbac');
			expect(slugFromCrdPlural('infraassessmentreports')).toBe('infrastructure');
		});

		it('returns undefined for unknown CRD plurals', () => {
			expect(slugFromCrdPlural('unknownreports')).toBeUndefined();
			expect(slugFromCrdPlural('')).toBeUndefined();
		});
	});
});
