<script lang="ts">
    import { Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Badge, Modal, Button, uiHelpers } from 'svelte-5-ui-lib';


    // Props to receive report data
    const { data } = $props();


    // Color mappings for badges
    const severityColors = {
        LOW: "bg-green-500 text-white dark:bg-green-600 dark:text-white",
        MEDIUM: "bg-yellow-400 text-gray-800 dark:bg-yellow-600 dark:text-gray-200",
        HIGH: "bg-orange-500 text-white dark:bg-orange-600 dark:text-white",
        CRITICAL: "bg-red-600 text-white dark:bg-red-700 dark:text-white",
        UNKNOWN: "bg-gray-400 text-gray-800 dark:bg-gray-600 dark:text-gray-200"
    };

    const statusColors = {
        Failed: "bg-red-500 text-white dark:bg-red-600 dark:text-white",
        Passed: "bg-green-500 text-white dark:bg-green-600 dark:text-white",
        Manual: "bg-gray-400 text-white dark:bg-gray-500 dark:text-white"
    };

    // Ordering for sorting
    const severityOrder = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4, UNKNOWN: 5 };
    const statusOrder = { Failed: 1, Passed: 2, Manual: 3 };

    // Process and sort controls data
    let controls = data.manifest.spec.compliance.controls
        .map(control => {
            const statusControl = data.manifest.status.summaryReport.controlCheck.find(c => c.id === control.id);
            return {
                ...control,
                status: statusControl?.totalFail > 0 ? 'Failed' : statusControl?.totalFail === 0 ? 'Passed' : 'Manual',
                totalFail: statusControl?.totalFail ?? null
            };
        })
        .sort((a, b) => {
            const statusDiff = statusOrder[a.status] - statusOrder[b.status];
            if (statusDiff !== 0) return statusDiff;
            return (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
        });

    // State for selected control and modal
    let selectedControl = null;
    const modal = uiHelpers();
    let modalOpen = $state(false);
    $effect(() => {
        modalOpen = modal.isOpen;
    });

    function openModal(control) {
        selectedControl = control;
        modal.toggle();
    }

    function closeModalWrapper() {
        modal.close();
        selectedControl = null;
    }
</script>
<div class="container mx-auto p-4 space-y-4">


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
                        <Badge class={`${statusColors[control.status]} text-xs`}>
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

    <!-- Modal for Control Details -->
    <Modal title={selectedControl?.name || 'Control Details'} modalStatus={modalOpen} closeModal={closeModalWrapper}>
        {#if selectedControl}
            <div class="text-sm text-gray-700 dark:text-gray-300">
                <p>{selectedControl.description}</p>
                {#if selectedControl.checks}
                    <div class="mt-2">
                        <p class="font-semibold">Checks:</p>
                        <ul class="list-disc ml-4">
                            {#each selectedControl.checks as check}
                                <li>
                                    <p><strong>{check.id}:</strong> {check.name} ({check.severity})</p>
                                    {#if check.description}
                                        <p class="text-xs">{check.description}</p>
                                    {/if}
                                    {#if check.commands}
                                        <div class="ml-2">
                                            <p class="font-semibold text-xs">Commands:</p>
                                            <ul class="list-disc ml-4 text-xs">
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