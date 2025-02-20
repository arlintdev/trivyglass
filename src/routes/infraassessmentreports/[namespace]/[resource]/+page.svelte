<script lang="ts">
	import { Card, Badge, Alert, Breadcrumb, BreadcrumbItem, Modal, Button, uiHelpers, modal } from 'svelte-5-ui-lib';
	
	const { data } = $props();
	let { report } = data;
	
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
  
	// Sort checks by severity
	const sortedChecks = report.report?.checks?.slice().sort((a, b) => {
	  return (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
	}) ?? [];
  
	// Modal state and helpers using svelte-5-ui-lib
	const modalExample = uiHelpers();
	let modalStatus = $state(false);
	const closeModal = modalExample.close;
	// Sync modal status with uiHelpers
	$effect(() => {
    modalStatus = modalExample.isOpen;
  });
  
  </script>
  
  <Breadcrumb>
	<BreadcrumbItem href="/" home>Home</BreadcrumbItem>
	<BreadcrumbItem href="/infraassessmentreports">Infra Assessment Reports</BreadcrumbItem>
	<BreadcrumbItem>{report.metadata.name}</BreadcrumbItem>
  </Breadcrumb>
  <div class="container mx-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
	<!-- Metadata Card -->
	<Card class="border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 dark:border-gray-700">
	  <div class="p-4 bg-gray-50 rounded-t-lg dark:bg-gray-800">
		<h2 class="text-xl font-bold text-gray-800 dark:text-gray-200">Report Metadata</h2>
	  </div>
	  <div class="p-4 space-y-2 text-gray-700 dark:text-gray-300">
		<p class="whitespace-normal break-words"><strong>Name:</strong> {report.metadata.name ?? 'N/A'}</p>
		<p class="whitespace-normal break-words"><strong>Namespace:</strong> {report.metadata.namespace ?? 'N/A'}</p>
		<p class="whitespace-normal break-words"><strong>Resource:</strong> {report.metadata.labels?.["trivy-operator.resource.kind"] ?? 'Unknown'} - {report.metadata.labels?.["trivy-operator.resource.name"] ?? 'N/A'}</p>
		<p class="whitespace-normal break-words"><strong>Created:</strong> {report.metadata.creationTimestamp ? new Date(report.metadata.creationTimestamp).toLocaleString() : 'N/A'}</p>
		<!-- Button to open modal -->
		<Button
		  onclick={modalExample.toggle}
		  class="mt-4 bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
		>
		  View Full Report
		</Button>
	  </div>
	</Card>
  
	<!-- Summary Card -->
	<Card class="border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 dark:border-gray-700">
	  <div class="p-4 bg-indigo-50 rounded-t-lg dark:bg-indigo-900">
		<h2 class="text-xl font-bold text-indigo-800 dark:text-indigo-200">Security Summary</h2>
	  </div>
	  <div class="p-4 flex flex-col gap-2 text-gray-700 dark:text-gray-300">
		<div class="flex items-center gap-2">
		  <Badge class={severityColors.CRITICAL}>Critical: {report.report?.summary?.criticalCount ?? 0}</Badge>
		  <Badge class={severityColors.HIGH}>High: {report.report?.summary?.highCount ?? 0}</Badge>
		</div>
		<div class="flex items-center gap-2">
		  <Badge class={severityColors.MEDIUM}>Medium: {report.report?.summary?.mediumCount ?? 0}</Badge>
		  <Badge class={severityColors.LOW}>Low: {report.report?.summary?.lowCount ?? 0}</Badge>
		</div>
	  </div>
	</Card>
  
	<!-- Scanner Card -->
	<Card class="border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 dark:border-gray-700">
	  <div class="p-4 bg-teal-50 rounded-t-lg dark:bg-teal-900">
		<h2 class="text-xl font-bold text-teal-800 dark:text-teal-200">Scanner Details</h2>
	  </div>
	  <div class="p-4 space-y-2 text-gray-700 dark:text-gray-300">
		<p class="whitespace-normal break-words"><strong>Name:</strong> {report.report?.scanner?.name ?? 'N/A'}</p>
		<p class="whitespace-normal break-words"><strong>Vendor:</strong> {report.report?.scanner?.vendor ?? 'N/A'}</p>
		<p class="whitespace-normal break-words"><strong>Version:</strong> {report.report?.scanner?.version ?? 'N/A'}</p>
	  </div>
	</Card>
  
	<!-- Security Checks Section -->
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
  
	<!-- Modal for Full Report -->
	<Modal title="Terms of Service" {modalStatus} {closeModal} >
	  <div  class="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
		<h2 class="text-xl font-bold text-gray-800 dark:text-gray-200">Full Report: {report.metadata.name ?? 'Report'}</h2>
	  </div>
	  <div  class="p-4 max-h-[80vh] overflow-y-auto text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-b-lg">
		<pre class="whitespace-pre-wrap break-words text-sm">
		  {JSON.stringify(report, null, 2)}
		</pre>
	  </div>
	  <div  class="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
		<Button
		  onclick={modalExample.close}
		  class="bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
		>
		  Close
		</Button>
	  </div>
	</Modal>
  </div>