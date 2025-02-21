<script lang="ts">
	import { Card, Badge, Alert, Breadcrumb, BreadcrumbItem } from 'svelte-5-ui-lib';
    
	const { checks } = $props();
    
  
	// Severity color mapping (updated for new colors and dark mode compatibility)
	const severityColors = {
	  LOW: "bg-green-500 text-white dark:bg-green-600 dark:text-white",
	  MEDIUM: "bg-yellow-400 text-gray-800 dark:bg-yellow-600 dark:text-gray-200",
	  HIGH: "bg-orange-500 text-white dark:bg-orange-600 dark:text-white",
	  CRITICAL: "bg-red-600 text-white dark:bg-red-700 dark:text-white",
	  UNKNOWN: "bg-gray-400 text-gray-800 dark:bg-gray-600 dark:text-gray-200"
	};

	// Severity order for sorting
	const severityOrder = {
	  CRITICAL: 1,
	  HIGH: 2,
	  MEDIUM: 3,
	  LOW: 4,
	  UNKNOWN: 5
	};
	console.log(checks);
	// Sort checks by severity
	const sortedChecks = checks.slice().sort((a, b) => {
	  return (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
	}) ?? [];
  </script>

<div class="col-span-1 md:col-span-2 lg:col-span-3">
	  <h1 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Security Checks</h1>
	  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
		{#each sortedChecks as check}
		  <Card class="border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 max-w-full dark:border-gray-700">
			<div class="p-4 bg-gray-50 flex justify-between items-center rounded-t-lg dark:bg-gray-800">
			  <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">{check.title ?? 'Untitled Check'}</h3>
			  <Badge class={severityColors[check.severity] ?? severityColors.UNKNOWN}>{check.severity ?? 'UNKNOWN'}</Badge>
			</div>
			<div class="p-4 space-y-3 text-gray-700 dark:text-gray-300">
			  <p class="whitespace-normal break-words"><strong>ID:</strong> {check.checkID ?? 'N/A'}</p>
			  <p class="whitespace-normal break-words"><strong>Description:</strong> {check.description ?? 'No description available'}</p>
			  <Alert color="red" class="mb-3">
				<strong>Issue:</strong> <span class="whitespace-normal break-words">{check.messages?.[0] ?? 'No specific issue reported'}</span>
			  </Alert>
			  <div class="p-3 bg-gray-100 border-l-4 border-gray-300 rounded-r-lg dark:bg-gray-700 dark:border-gray-500">
				<p class="whitespace-normal break-words text-gray-700 dark:text-gray-300"><strong>Remediation:</strong> {check.remediation ?? 'No remediation provided'}</p>
			  </div>
			</div>
		  </Card>
		{/each}
	  </div>
	</div>

