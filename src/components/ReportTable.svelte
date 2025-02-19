<script lang="ts">
  let { reports = [], reportType, showSummary = true, showNamespace = true, columns = [] } = $props();

  import {
    TableSearch,
    TableHead,
    TableBody,
    TableBodyRow,
    TableBodyCell,
    Badge,
    Button,
    P,
    Modal,
    uiHelpers
  } from 'svelte-5-ui-lib';

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

  // Search functionality
  let searchTerm = $state("");
  let filteredReports = $derived(
    reports.filter(report => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      let values = [];
      if (showNamespace) values.push(report.metadata.namespace);
      values.push(report.metadata.name);
      columns.forEach(column => {
        const value = column.value.includes('.')
          ? get(report, column.value)
          : report[column.value];
        values.push(value);
      });
      return values.some(val => String(val).toLowerCase().includes(term));
    })
  );

  // Compute table headers
  let headItems = [];
  if (showNamespace) headItems.push("Namespace");
  headItems.push("Name");
  for (let column of columns) {
    headItems.push(column.header);
  }
  headItems.push("Actions");
</script>

{#if reports.length === 0}
  <P class="text-center">No {reportType} reports found.</P>
{:else if filteredReports.length === 0}
  <P class="text-center">No matching {reportType} reports found.</P>
{:else}
  <TableSearch placeholder="Search reports" hoverable={true} bind:inputValue={searchTerm}>
    <TableHead {headItems} />
    <TableBody>
      {#each filteredReports as report (report.metadata.uid)}
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
          <TableBodyCell>
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
  </TableSearch>
{/if}

<Modal title="Report JSON" {modalStatus} {closeModal}
  size="xl"
  outsideClose={false}
  params={{ duration: 500 }}
>
  {#if selectedReport}
    <pre class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
{JSON.stringify(selectedReport, null, 2)}
    </pre>
  {/if}
</Modal>