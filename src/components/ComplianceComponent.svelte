<script lang="ts">
	import {
		Table,
		TableHead,
		TableHeadCell,
		TableBody,
		TableBodyRow,
		TableBodyCell,
		Badge,
		Modal,
		Button,
		uiHelpers
	} from 'svelte-5-ui-lib';

	// Define TypeScript interfaces for the data structure
	interface Check {
		id: string;
		name: string;
		severity: string;
		description?: string;
		commands?: {
			id: string;
			description: string;
		}[];
	}

	interface Control {
		id: string;
		name: string;
		description: string;
		severity: string;
		checks?: Check[];
		status?: string; // Changed from union type to string to match return type from map
		totalFail?: number | null;
	}

	interface StatusControl {
		id: string;
		totalFail: number;
	}

	interface Props {
		data: {
			manifest: {
				spec?: {
					compliance?: {
						controls: Control[];
					};
				};
				status?: {
					summaryReport?: {
						controlCheck: StatusControl[];
					};
				};
			};
		};
	}

	let { data }: Props = $props();

	// Color mappings for badges
	const severityColors: Record<string, string> = {
		LOW: 'bg-green-500 text-white dark:bg-green-600 dark:text-white',
		MEDIUM: 'bg-yellow-400 text-gray-800 dark:bg-yellow-600 dark:text-gray-200',
		HIGH: 'bg-orange-500 text-white dark:bg-orange-600 dark:text-white',
		CRITICAL: 'bg-red-600 text-white dark:bg-red-700 dark:text-white',
		UNKNOWN: 'bg-gray-400 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
	};

	const statusColors: Record<string, string> = {
		Failed: 'bg-red-500 text-white dark:bg-red-600 dark:text-white',
		Passed: 'bg-green-500 text-white dark:bg-green-600 dark:text-white',
		Manual: 'bg-gray-400 text-white dark:bg-gray-500 dark:text-white'
	};

	// Ordering for sorting
	const severityOrder: Record<string, number> = {
		CRITICAL: 1,
		HIGH: 2,
		MEDIUM: 3,
		LOW: 4,
		UNKNOWN: 5
	};
	const statusOrder: Record<string, number> = { Failed: 1, Passed: 2, Manual: 3 };

	// Process and sort controls data
	let controls: Control[] = [];
	
	if (data?.manifest?.spec?.compliance?.controls && data?.manifest?.status?.summaryReport?.controlCheck) {
		controls = data.manifest.spec.compliance.controls
			.map((control: Control) => {
				const statusControl = data.manifest.status?.summaryReport?.controlCheck.find(
					(c: StatusControl) => c.id === control.id
				);
				// Handle the case where statusControl might be undefined
				const totalFail = statusControl?.totalFail;

				return {
					...control,
					status:
						totalFail !== undefined && totalFail > 0
							? 'Failed'
							: totalFail !== undefined && totalFail === 0
								? 'Passed'
								: 'Manual',
					totalFail: totalFail ?? null
				};
			})
			.sort((a, b) => {
				const statusDiff =
					statusOrder[a.status as keyof typeof statusOrder] -
					statusOrder[b.status as keyof typeof statusOrder];
				if (statusDiff !== 0) return statusDiff;
				return (
					(severityOrder[a.severity as keyof typeof severityOrder] || 5) -
					(severityOrder[b.severity as keyof typeof severityOrder] || 5)
				);
			});
	}

	// State for selected control and modal
	let selectedControl = $state<Control | null>(null);
	const modal = uiHelpers();
	let modalOpen = $state(false);
	$effect(() => {
		modalOpen = modal.isOpen;
	});

	function openModal(control: Control): void {
		selectedControl = control;
		modal.toggle();
	}

	function closeModalWrapper(): void {
		modal.close();
		selectedControl = null;
	}
</script>

<div class="container mx-auto space-y-4 p-4">
	{#if controls.length > 0}
		<!-- Compact Controls Table -->
		<Table hoverable={true}>
			<TableHead>
				<TableHeadCell class="!p-2 text-sm">ID</TableHeadCell>
				<TableHeadCell class="!p-2 text-sm">Name</TableHeadCell>
				<TableHeadCell class="!p-2 text-sm">Severity</TableHeadCell>
				<TableHeadCell class="!p-2 text-sm">Status</TableHeadCell>
				<TableHeadCell class="!p-2 text-sm">Total Failures</TableHeadCell>
				<TableHeadCell class="!p-2 text-sm">Actions</TableHeadCell>
			</TableHead>
			<TableBody class="divide-y">
				{#each controls as control}
					<TableBodyRow>
						<TableBodyCell class="!p-2 text-sm">{control.id}</TableBodyCell>
						<TableBodyCell class="!p-2 text-sm">{control.name}</TableBodyCell>
						<TableBodyCell class="!p-2">
							<Badge class={`${severityColors[control.severity] || severityColors.UNKNOWN} text-xs`}>
								{control.severity || 'UNKNOWN'}
							</Badge>
						</TableBodyCell>
						<TableBodyCell class="!p-2">
							<Badge class={`${statusColors[control.status as keyof typeof statusColors]} text-xs`}>
								{control.status}
							</Badge>
						</TableBodyCell>
						<TableBodyCell class="!p-2 text-sm">{control.totalFail ?? 'N/A'}</TableBodyCell>
						<TableBodyCell class="!p-2">
							<Button size="sm" onclick={() => openModal(control)}>Details</Button>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{:else}
		<div class="rounded-lg border border-gray-200 p-4 shadow-md dark:border-gray-700">
			<p class="text-center text-gray-700 dark:text-gray-300">
				No compliance controls found for this report.
			</p>
		</div>
	{/if}

	<!-- Modal for Control Details -->
	<Modal
		title={selectedControl?.name || 'Control Details'}
		modalStatus={modalOpen}
		closeModal={closeModalWrapper}
	>
		{#if selectedControl}
			<div class="text-sm text-gray-700 dark:text-gray-300">
				<p>{selectedControl.description}</p>
				{#if selectedControl.checks}
					<div class="mt-2">
						<p class="font-semibold">Checks:</p>
						<ul class="ml-4 list-disc">
							{#each selectedControl.checks as check}
								<li>
									<p><strong>{check.id}:</strong> {check.name} ({check.severity})</p>
									{#if check.description}
										<p class="text-xs">{check.description}</p>
									{/if}
									{#if check.commands}
										<div class="ml-2">
											<p class="text-xs font-semibold">Commands:</p>
											<ul class="ml-4 list-disc text-xs">
												{#each check.commands as cmd}
													<li><strong>{cmd.id}:</strong> {cmd.description}</li>
												{/each}
											</ul>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/if}
	</Modal>
</div>
