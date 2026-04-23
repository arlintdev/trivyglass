import { json } from '@sveltejs/kit';
import {
	getAttestations,
	putAttestations,
	ATTESTATIONS_NAMESPACE,
	type Attestation,
	type AttestationMap
} from '$lib/kubeUtil';
import { handleConnectionError } from '$lib/errorHandler';

const VALID_STATUSES: ReadonlySet<Attestation['status']> = new Set([
	'manual-pass',
	'manual-fail',
	'not-applicable'
]);

function normalize(input: unknown): AttestationMap {
	if (!input || typeof input !== 'object') return {};
	const out: AttestationMap = {};
	const nowIso = new Date().toISOString();
	for (const [vId, raw] of Object.entries(input as Record<string, unknown>)) {
		if (!raw || typeof raw !== 'object') continue;
		const r = raw as Record<string, unknown>;
		const status = typeof r.status === 'string' ? (r.status as Attestation['status']) : null;
		if (!status || !VALID_STATUSES.has(status)) continue;
		const reviewedBy = typeof r.reviewedBy === 'string' ? r.reviewedBy.trim() : '';
		if (!reviewedBy) continue;
		const reviewedAt =
			typeof r.reviewedAt === 'string' && r.reviewedAt.length > 0 ? r.reviewedAt : nowIso;
		out[vId] = {
			status,
			reviewedBy,
			reviewedAt,
			evidence: typeof r.evidence === 'string' ? r.evidence : undefined,
			reason: typeof r.reason === 'string' ? r.reason : undefined
		};
	}
	return out;
}

export async function GET({ params }: { params: { name: string } }) {
	try {
		const attestations = await getAttestations(params.name);
		return json({ namespace: ATTESTATIONS_NAMESPACE, attestations });
	} catch (error) {
		console.error('Error reading attestations:', error);
		handleConnectionError(error);
		return json(
			{ error: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
}

export async function PUT({ params, request }: { params: { name: string }; request: Request }) {
	try {
		const body = await request.json();
		const cleaned = normalize(body?.attestations ?? body);
		const saved = await putAttestations(params.name, cleaned);
		return json({ namespace: ATTESTATIONS_NAMESPACE, attestations: saved });
	} catch (error) {
		console.error('Error writing attestations:', error);
		handleConnectionError(error);
		return json(
			{ error: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
}
