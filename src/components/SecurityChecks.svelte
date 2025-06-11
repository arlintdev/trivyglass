<script lang="ts">
	import { Card, Badge, Alert } from 'flowbite-svelte';

	// Define an interface for the security check objects
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

	// Severity color mapping (updated for new colors and dark mode compatibility)
	const severityColors = {
		LOW: 'bg-green-500 text-white dark:bg-green-600 dark:text-white',
		MEDIUM: 'bg-yellow-400 text-gray-800 dark:bg-yellow-600 dark:text-gray-200',
		HIGH: 'bg-orange-500 text-white dark:bg-orange-600 dark:text-white',
		CRITICAL: 'bg-red-600 text-white dark:bg-red-700 dark:text-white',
		UNKNOWN: 'bg-gray-400 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
	};

	// Severity order for sorting
	const severityOrder = {
		CRITICAL: 1,
		HIGH: 2,
		MEDIUM: 3,
		LOW: 4,
		UNKNOWN: 5
	};

	// Sort checks by severity
	const sortedChecks =
		checks.slice().sort((a: SecurityCheck, b: SecurityCheck) => {
			return (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
		}) ?? [];
</script>

<div class="col-span-1 md:col-span-2 lg:col-span-3">
	<h1 class="mb-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">Security Checks</h1>
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
		{#each sortedChecks as check}
			<Card
				class="max-w-full rounded-lg border border-gray-200 shadow-md transition-shadow duration-300 hover:shadow-lg dark:border-gray-700"
			>
				<div class="flex items-center justify-between rounded-t-lg bg-gray-50 p-4 dark:bg-gray-800">
					<h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
						{check.title ?? 'Untitled Check'}
					</h3>
					<Badge class={severityColors[check.severity] ?? severityColors.UNKNOWN}
						>{check.severity ?? 'UNKNOWN'}</Badge
					>
				</div>
				<div class="space-y-3 p-4 text-gray-700 dark:text-gray-300">
					<p class="break-words whitespace-normal"><strong>ID:</strong> {check.checkID ?? 'N/A'}</p>
					<p class="break-words whitespace-normal">
						<strong>Description:</strong>
						{check.description ?? 'No description available'}
					</p>
					<Alert color="red" class="mb-3">
						<strong>Issue:</strong>
						<span class="break-words whitespace-normal"
							>{check.messages?.[0] ?? 'No specific issue reported'}</span
						>
					</Alert>
					<div
						class="rounded-r-lg border-l-4 border-gray-300 bg-gray-100 p-3 dark:border-gray-500 dark:bg-gray-700"
					>
						<p class="break-words whitespace-normal text-gray-700 dark:text-gray-300">
							<strong>Remediation:</strong>
							{check.remediation ?? 'No remediation provided'}
						</p>
					</div>
				</div>
			</Card>
		{/each}
	</div>
</div>
