<script lang="ts">
    import { Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Badge, Modal, Button, uiHelpers } from 'svelte-5-ui-lib';
    import ReportPage from '../../../../components/ReportPage.svelte';
    // Props to receive report data
    const { data } = $props();


</script>
<ReportPage data={data} />
