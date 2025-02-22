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
    uiHelpers,
    ButtonGroup // Assuming this exists in svelte-5-ui-lib
  } from 'svelte-5-ui-lib';

  let {
    reports = [],
    reportType,
    showSummary = true,
    showNamespace = true,
    columns = [] // New CRD columns, e.g. { name, jsonPath, type, … }
  } = $props();

  // Define color logic function
  function getColor(header: string): string | undefined {
    const lowerHeader = header.toLowerCase();
    if (lowerHeader.includes('fail')) return 'red';
    if (lowerHeader.includes('pass')) return 'green';
    if (lowerHeader.includes('unknown')) return 'gray';
    if (lowerHeader.includes('critical')) return 'red';
    if (lowerHeader.includes('high')) return 'orange';
    if (lowerHeader.includes('medium')) return 'yellow';
    if (lowerHeader.includes('low')) return 'green';
    if (lowerHeader.includes('none')) return 'gray';
    return undefined;
  }

  // Define table columns
  let tableColumns = $state([]);
  if (columns.length > 0) {
    // Use provided columns
    tableColumns = columns.map((col: any) => ({
      header: col.name,
      value: col.jsonPath,
      color: getColor(col.name)
    }));
  } else {
    // Dynamically determine columns from report data
    const allKeys = new Set<string>();
    reports.forEach((report: any) => {
      Object.keys(report).forEach((key: string) => {
        if (key !== 'metadata') {
          allKeys.add(key);
        }
      });
    });
    tableColumns = Array.from(allKeys).map((key: string) => ({
      header: key,
      value: key,
      color: getColor(key)
    }));
  }

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
      valueA = `${a.metadata?.namespace || ''}:${a.metadata?.name || ''}`;
      valueB = `${b.metadata?.namespace || ''}:${b.metadata?.name || ''}`;
    } else {
      const col = tableColumns.find((c) => c.header === column);
      if (col) {
        valueA = col.value.includes('.') ? get(a, col.value) : a[col.value];
        valueB = col.value.includes('.') ? get(b, col.value) : b[col.value];
      } else {
        return 0;
      }
    }

    if (valueA === undefined || valueA === null) valueA = '';
    if (valueB === undefined || valueB === null) valueB = '';

    const isNumericA = !isNaN(Number(valueA)) && typeof valueA !== 'boolean';
    const isNumericB = !isNaN(Number(valueB)) && typeof valueB !== 'boolean';

    if (isNumericA && isNumericB) {
      const numA = Number(valueA);
      const numB = Number(valueB);
      return direction === 'asc' ? numA - numB : numB - numA;
    } else {
      valueA = String(valueA).toLowerCase();
      valueB = String(valueB).toLowerCase();
      return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
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

  // Export functions
  function escapeCsvValue(value: any): string {
    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return String(value);
  }

  function generateCsv(): string {
    const headers = ['Namespace', 'Name', ...tableColumns.map(col => col.header)];
    const rows = filteredReports.map(report => [
      report.metadata.namespace || '',
      report.metadata.name,
      ...tableColumns.map(col => get(report, col.value) || '')
    ]);
    return [
      headers.map(escapeCsvValue).join(','),
      ...rows.map(row => row.map(escapeCsvValue).join(','))
    ].join('\n');
  }

  function generateMarkdown(): string {
    const headers = ['Namespace', 'Name', ...tableColumns.map(col => col.header)];
    const rows = filteredReports.map(report => [
      report.metadata.namespace || '',
      report.metadata.name,
      ...tableColumns.map(col => get(report, col.value) || '')
    ]);
    return [
      '| ' + headers.join(' | ') + ' |',
      '| ' + headers.map(() => '---').join(' | ') + ' |',
      ...rows.map(row => '| ' + row.join(' | ') + ' |')
    ].join('\n');
  }

  function generateJson(): string {
    const data = filteredReports.map(report => ({
      Namespace: report.metadata.namespace || '',
      Name: report.metadata.name,
      ...Object.fromEntries(tableColumns.map(col => [col.header, get(report, col.value) || '']))
    }));
    return JSON.stringify(data, null, 2);
  }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportData(format: string) {
    let content: string, filename: string, mimeType: string;
    switch (format) {
      case 'csv':
        content = generateCsv();
        filename = 'reports.csv';
        mimeType = 'text/csv';
        break;
      case 'markdown':
        content = generateMarkdown();
        filename = 'reports.md';
        mimeType = 'text/markdown';
        break;
      case 'json':
        content = generateJson();
        filename = 'reports.json';
        mimeType = 'application/json';
        break;
      default:
        return;
    }
    downloadFile(content, filename, mimeType);
  }

  function generateLink(report: any) {
    if (report.metadata.namespace) {
      return `/${reportType}/namespace/${report.metadata.namespace}/${report.metadata.name}`;
    } else {
      return `/${reportType}/cluster/${report.metadata.name}`;
    }
  }
</script>

{#if reports.length === 0}
  <P class="text-center">No {reportType} reports found.</P>
{:else}
  <div class={tightTableClasses.wrapper}>
    
    <div class="mb-4 flex justify">
      
      <ButtonGroup>
        <Button onclick={() => exportData('csv')}>CSV</Button>
        <Button onclick={() => exportData('markdown')}>Markdown</Button>
        <Button onclick={() => exportData('json')}>JSON</Button>
      </ButtonGroup>
    </div>
    <TableSearch 
      placeholder="Search reports" 
      hoverable={true} 
      bind:inputValue={searchTerm}>
      <TableHead>
        {#each headItems as header}
          <th 
            on:click={() => toggleSort(header)}
            class="px-2 py-1 text-sm cursor-pointer bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <div class="flex items-center gap-1">
              {header}
              {#if sortColumn === header}
                {sortDirection === 'asc' ? '▲' : '▼'}
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
                <span>
                  {report?.metadata?.namespace || 'N/A'}
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
                    href={generateLink(report)}
                    color="blue"
                    size="sm"
                    class={tightTableClasses.button}
                  >
                    Details
                  </Button>
                  <!-- <Button
                    color="gray"
                    size="sm"
                    class={tightTableClasses.button}
                    onclick={() => openJsonModal(report.status)}
                  >
                    Summary
                  </Button> -->
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