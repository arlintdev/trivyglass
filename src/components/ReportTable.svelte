<script lang="ts">
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

  let {
    reports = [],
    reportType,
    showSummary = true,
    showNamespace = true,
    columns = [] // New CRD columns, e.g. { name, jsonPath, type, … }
  } = $props();

  // Map the CRD columns to the expected table column format
  const tableColumns = columns.map((col: any) => ({
    header: col.name,
    value: col.jsonPath,
    color:
      col.name.toLowerCase().includes('fail') ? 'red' :
      col.name.toLowerCase().includes('pass') ? 'green' :
      col.name.toLowerCase().includes('unknown') ? 'gray' :
      col.name.toLowerCase().includes('critical') ? 'red' :
      col.name.toLowerCase().includes('high') ? 'orange' :
      col.name.toLowerCase().includes('medium') ? 'yellow' :
      col.name.toLowerCase().includes('low') ? 'green' :
      col.name.toLowerCase().includes('none') ? 'gray' : undefined
  }));

  // Modal setup
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

  // Utility function to handle leading dots and undefined values
  function get(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    if (path.startsWith('.')) {
      path = path.slice(1);
    }
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
  let searchTerm = $state(''); // Simple state for search term

  // Sorting state
  let sortColumn = $state(''); // Column to sort by (e.g., 'Namespace / Name', or a column header)
  let sortDirection = $state('asc'); // 'asc' or 'desc'

  // Utility function to compare values for sorting, now handling numbers correctly
  function compareValues(a: any, b: any, column: string, direction: 'asc' | 'desc') {
    let valueA, valueB;

    if (column === 'Namespace / Name') {
      // Sort by namespace first, then name
      valueA = `${a.metadata?.namespace || ''}:${a.metadata?.name || ''}`;
      valueB = `${b.metadata?.namespace || ''}:${b.metadata?.name || ''}`;
    } else {
      // Find the column in tableColumns to get the value path
      const col = tableColumns.find((c) => c.header === column);
      if (col) {
        valueA = col.value.includes('.') ? get(a, col.value) : a[col.value];
        valueB = col.value.includes('.') ? get(b, col.value) : b[col.value];
      } else {
        return 0; // No sorting if column not found
      }
    }

    // Handle undefined or null values
    if (valueA === undefined || valueA === null) valueA = '';
    if (valueB === undefined || valueB === null) valueB = '';

    // Check if values are numeric (including integers and floats)
    const isNumericA = !isNaN(Number(valueA)) && typeof valueA !== 'boolean';
    const isNumericB = !isNaN(Number(valueB)) && typeof valueB !== 'boolean';

    if (isNumericA && isNumericB) {
      // Sort as numbers
      const numA = Number(valueA);
      const numB = Number(valueB);
      if (numA < numB) return direction === 'asc' ? -1 : 1;
      if (numA > numB) return direction === 'asc' ? 1 : -1;
      return 0;
    } else {
      // Sort as strings (for non-numeric values)
      valueA = String(valueA).toLowerCase();
      valueB = String(valueB).toLowerCase();

      if (valueA < valueB) return direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return direction === 'asc' ? 1 : -1;
      return 0;
    }
  }

  // Filtered and sorted reports
  let filteredReports = $derived(
    reports
      .filter((report) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        let values: any[] = [];
        
        if (showNamespace && report.metadata?.namespace) {
          values.push(report.metadata.namespace);
        }
        if (report.metadata?.name) {
          values.push(report.metadata.name);
        }
        
        tableColumns.forEach((column) => {
          const value = column.value.includes('.') 
            ? get(report, column.value) 
            : report[column.value];
          if (value !== undefined && value !== null) {
            values.push(value);
          }
        });
        
        return values.some((val) => 
          String(val).toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        if (!sortColumn) return 0;
        return compareValues(a, b, sortColumn, sortDirection);
      })
  );

  // Compute table headers with sorting
  let headItems = [];
  headItems.push('Namespace / Name');
  for (let column of tableColumns) {
    headItems.push(column.header);
  }
  headItems.push('Actions');

  // Function to toggle sorting
  function toggleSort(column: string) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
  }

  // Tight table styling
  const tightTableClasses = {
    wrapper: 'max-w-full overflow-x-auto',
    table: 'w-full table-compact',
    cell: 'px-2 py-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis',
    badge: 'py-0.5 px-1 text-xs',
    button: 'py-1 px-2 text-xs'
  };
</script>

{#if reports.length === 0}
  <P class="text-center">No {reportType} reports found.</P>
{:else}
  <div class={tightTableClasses.wrapper}> 
    <TableSearch 
      placeholder="Search reports" 
      hoverable={true} 
      bind:inputValue={searchTerm}>
      <TableHead>
        {#each headItems as header, index}
          <th 
            on:click={() => toggleSort(header)}
            class="px-2 py-1 text-sm cursor-pointer bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <div class="flex items-center gap-1">
              {header}
              {#if sortColumn === header}
                {sortDirection === 'asc' ? '▲' : '▼'}
              {:else}
                <!-- nothing -->
              {/if}
            </div>
          </th>
        {/each}
      </TableHead>
      <TableBody class={tightTableClasses.table}>
        {#if filteredReports.length === 0}
          <TableBodyRow>
            <TableBodyCell colspan={headItems.length} class={tightTableClasses.cell}>
              <P class="text-center">No matching {reportType} reports found.</P>
            </TableBodyCell>
          </TableBodyRow>
        {:else}
          {#each filteredReports as report (report.metadata.uid)}
            <TableBodyRow class="cursor-pointer">
              <TableBodyCell class={tightTableClasses.cell}>
                <span title={report.metadata.namespace}>
                  {report.metadata.namespace || 'N/A'}
                </span>
                <br />
                <span title={report.metadata.name}>
                  {report.metadata.name}
                </span>
              </TableBodyCell>
              {#each tableColumns as column}
                <TableBodyCell class={tightTableClasses.cell}>
                  {#if column.value.includes('.')}
                    {#if column.color}
                      <Badge color={column.color} class={tightTableClasses.badge}>
                        {get(report, column.value) ?? 'N/A'}
                      </Badge>
                    {:else}
                      <span title={get(report, column.value)}>
                        {get(report, column.value) ?? 'N/A'}
                      </span>
                    {/if}
                  {:else if column.color}
                    <Badge color={column.color} class={tightTableClasses.badge}>
                      {report[column.value] ?? 'N/A'}
                    </Badge>
                  {:else}
                    <span title={report[column.value]}>
                      {report[column.value] ?? 'N/A'}
                    </span>
                  {/if}
                </TableBodyCell>
              {/each}
              <TableBodyCell class={tightTableClasses.cell}>
                <div class="flex flex-wrap gap-1">
                  <Button
                    href={`/${reportType}/${report.metadata.namespace}/${report.metadata.name}`}
                    color="blue"
                    size="sm"
                    class={tightTableClasses.button}
                  >
                    Details
                  </Button>
                  <Button
                    color="gray"
                    size="sm"
                    class={tightTableClasses.button}
                    onclick={() => openJsonModal(report.status)}
                  >
                    Summary
                  </Button>
                  <Button
                    color="green"
                    size="sm"
                    class={tightTableClasses.button}
                    onclick={() => downloadReport(report)}
                  >
                    Download
                  </Button>
                </div>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        {/if}
      </TableBody>
    </TableSearch>
  </div>
{/if}

<Modal
  title="Report JSON"
  {modalStatus}
  {closeModal}
  size="xl"
  outsideClose={false}
  params={{ duration: 500 }}
>
  {#if selectedReport}
    <pre class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 max-h-[70vh] overflow-auto">
      {JSON.stringify(selectedReport, null, 2)}
    </pre>
  {/if}
</Modal>