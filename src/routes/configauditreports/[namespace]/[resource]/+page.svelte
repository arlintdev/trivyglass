<script lang="ts">
	import {
		TableSearch,
		TableHead,
		TableBody,
		TableBodyRow,
		TableBodyCell,
		Badge,
		Breadcrumb,
		BreadcrumbItem,
		Button
	} from 'svelte-5-ui-lib';
	import { onMount } from 'svelte';

	export let data: {
		report: VulnerabilityReport;
		clusterName: string;
	};

	interface VulnerabilityReport {
		metadata: { uid: string; name: string; namespace: string };
		report: {
			checks: Check[];
			scanner: { name: string; vendor: string; version: string };
			summary: {
				criticalCount: number;
				highCount: number;
				mediumCount: number;
				lowCount: number;
			};
			updateTimestamp: string;
		};
	}

	interface Check {
		category: string;
		checkID: string;
		description: string;
		messages: string[];
		remediation: string;
		severity: string;
		success: boolean;
		title: string;
	}

	let searchTerm = '';
	let { report } = data;
	let filteredChecks = [];

	const severityOrder = {
		CRITICAL: 1,
		HIGH: 2,
		MEDIUM: 3,
		LOW: 4,
		UNKNOWN: 5,
		NONE: 6
	};

	$: filteredChecks = report.report.checks
		.filter(
			(check) =>
				check.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				check.checkID.toLowerCase().includes(searchTerm.toLowerCase())
		)
		.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

	import { Modal, uiHelpers } from 'svelte-5-ui-lib';
	const modalExample = uiHelpers();
	let modalStatus = $state(false);
	const closeModal = modalExample.close;
	$effect(() => {
		modalStatus = modalExample.isOpen;
	});
	let selectedCheck: Check | null = null;

	function openCheckModal(check: Check) {
		selectedCheck = check;
		modalExample.open();
	}

	$: modalStatus = modalExample.isOpen;
</script>

<div class="p-2 sm:p-6">
	<Breadcrumb>
		<BreadcrumbItem href="/" home>Home</BreadcrumbItem>
		<BreadcrumbItem href="/securitychecks">Security Checks</BreadcrumbItem>
		<BreadcrumbItem>{report.metadata.name}</BreadcrumbItem>
	</Breadcrumb>

	<div class="overflow-auto">
		<TableSearch
			class="table-full-width"
			placeholder="Search checks by title or ID"
			hoverable={true}
			bind:inputValue={searchTerm}
		>
			<TableHead items={['Title', 'ID', 'Category', 'Severity', 'Status', 'Action']} />
			<TableBody>
				<TableBodyRow>
					<TableBodyCell><strong>Title</strong></TableBodyCell>
					<TableBodyCell><strong>ID</strong></TableBodyCell>
					<TableBodyCell><strong>Category</strong></TableBodyCell>
					<TableBodyCell><strong>Severity</strong></TableBodyCell>
					<TableBodyCell><strong>Status</strong></TableBodyCell>
					<TableBodyCell><strong>Action</strong></TableBodyCell>
				</TableBodyRow>
				{#each filteredChecks as check}
					<TableBodyRow>
						<TableBodyCell>
							{check.title.length > 50 ? check.title.slice(0, 50) + '...' : check.title}
						</TableBodyCell>
						<TableBodyCell>{check.checkID}</TableBodyCell>
						<TableBodyCell>{check.category}</TableBodyCell>
						<TableBodyCell>
							<Badge
								color={check.severity === 'CRITICAL'
									? 'red'
									: check.severity === 'HIGH'
										? 'orange'
										: check.severity === 'MEDIUM'
											? 'yellow'
											: check.severity === 'LOW'
												? 'green'
												: 'gray'}
							>
								{check.severity}
							</Badge>
						</TableBodyCell>
						<TableBodyCell>{check.success ? 'Passed' : 'Failed'}</TableBodyCell>
						<TableBodyCell>
							<Button size="sm" onclick={() => openCheckModal(check)}>Details</Button>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</TableSearch>
	</div>
	<Modal title="Check Details" {modalStatus} {closeModal}>Modal content</Modal>
</div>
<Modal
	title="Check Details"
	{modalStatus}
	{closeModal}
	size="xl"
	outsideClose={false}
	params={{ duration: 500 }}
>
	{#if selectedCheck}
		<pre class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
			<strong>Title:</strong> {selectedCheck.title}
			<br />
			<strong>Description:</strong> {selectedCheck.description}
			<br />
			<strong>Remediation:</strong> {selectedCheck.remediation}
			<br />
			<strong>Messages:</strong> {selectedCheck.messages.join(', ')}
		</pre>
	{/if}
</Modal>

<style>
	.table-full-width {
		width: 100%;
	}
	.word-wrap {
		word-wrap: break-word;
	}
	.overflow-auto {
		overflow-x: auto;
	}
</style>
