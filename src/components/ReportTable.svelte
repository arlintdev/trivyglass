<script lang="ts">
  // Use $props() for runes mode
  let { reports = [], reportType, showSummary = true, showNamespace = true, columns = [] } = $props();

  import { Table, TableHead, TableBody, TableBodyRow, TableBodyCell, TableHeadCell } from 'svelte-5-ui-lib';
  import { Badge, Button } from 'svelte-5-ui-lib';
  import { P } from 'svelte-5-ui-lib';
  import { Modal, uiHelpers } from 'svelte-5-ui-lib';

  const modalExample = uiHelpers();
  let modalStatus = $state(false);
  const closeModal = modalExample.close;
  $effect(() => {
    modalStatus = modalExample.isOpen;
  });

  let selectedReport: any = null;

  function openJsonModal(report: any) {
    selectedReport = report;
    modalExample.toggle();
  }

  function getBadgeColor(key: string) {
    switch (key) {
      case 'criticalCount': return 'red';
      case 'highCount': return 'orange';
      case 'mediumCount': return 'yellow';
      case 'lowCount': return 'green';
      case 'noneCount': return 'gray';
      default: return 'blue';
    }
  }

  function get(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  function downloadReport(report: any) {
    const filename = `${report.metadata.namespace ? report.metadata.namespace + '-' : ''}${report.metadata.name}.json`;
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

{#if reports.length === 0}
  <P class="text-center">No {reportType} reports found.</P>
{:else}
  <Table>
    <TableHead>
      {#if showNamespace}
        <TableHeadCell>Namespace</TableHeadCell>
      {/if}
      <TableHeadCell>Name</TableHeadCell>
      {#each columns as column}
        <TableHeadCell>{column.header}</TableHeadCell>
      {/each}
      <TableHeadCell>Actions</TableHeadCell>
    </TableHead>
    <TableBody>
      {#each reports as report (report.metadata.uid)}
        <TableBodyRow>
          {#if showNamespace}
            <TableBodyCell>{report.metadata.namespace}</TableBodyCell>
          {/if}
          <TableBodyCell>{report.metadata.name}</TableBodyCell>
          {#each columns as column}
            <TableBodyCell>
              {#if column.value.includes('.')}
                {#if column.color}
                  <Badge color={column.color}>
                    {get(report, column.value)}
                  </Badge>
                {:else}
                  {get(report, column.value)}
                {/if}
              {:else}
                {#if column.color}
                  <Badge color={column.color}>
                    {report[column.value]}
                  </Badge>
                {:else}
                  {report[column.value]}
                {/if}
              {/if}
            </TableBodyCell>
          {/each}
          <TableBodyCell class="flex space-x-2">
            <Button href={`/${reportType}/${report.metadata.namespace}/${report.metadata.name}`} color="blue" size="sm">
              View Details
            </Button>
            <Button color="gray" size="sm" onclick={() => openJsonModal(report.status)}>
              View Summary
            </Button>
            <Button color="green" size="sm" onclick={() => downloadReport(report)}>
              Download Report
            </Button>
          </TableBodyCell>
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>
{/if}

<Modal title="Report JSON" {modalStatus} {closeModal}
size="xl"
outsideClose={false}
params={{duration:500}}
>
  {#if selectedReport}
    <pre class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
{JSON.stringify(selectedReport, null, 2)}
    </pre>
  {/if}
</Modal>