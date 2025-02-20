<script lang="ts">
  import ReportHeader from '../../components/ReportHeader.svelte';
  import ReportTable from '../../components/ReportTable.svelte';
  // import ReportDownload from '../../components/ReportDownload.svelte';

  export let data: {
    reports: any[];
    clusterName: string;
    columns: any[];
  };

  let summaryCounts = {
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    noneCount: 0,
    unknownCount: 0
  };

  for (const report of data.reports) {
    summaryCounts.criticalCount += report.report.summary.criticalCount;
    summaryCounts.highCount += report.report.summary.highCount;
    summaryCounts.mediumCount += report.report.summary.mediumCount;
    summaryCounts.lowCount += report.report.summary.lowCount;
    summaryCounts.noneCount += report.report.summary.noneCount;
    summaryCounts.unknownCount += report.report.summary.unknownCount;
  }
</script>
<!-- <ReportDownload data={data.reports} reportType="infraassessmentreports" /> -->
<ReportHeader title="Infra Assessment Reports" clusterName={data.clusterName} summaryCounts={summaryCounts} />
<ReportTable reports={data.reports} reportType="infraassessmentreports" columns={data.columns} />