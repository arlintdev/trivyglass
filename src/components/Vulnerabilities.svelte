<script lang="ts">
  import { Card } from 'svelte-5-ui-lib';

  // Props to receive an array of vulnerabilities
  const { vulnerabilities } = $props();

  // Severity order for sorting
  const severityOrder = {
    'CRITICAL': 4,
    'HIGH': 3,
    'MEDIUM': 2,
    'LOW': 1
  };

  // Sort vulnerabilities by severity
  const sortedVulnerabilities = vulnerabilities.sort((a, b) => 
    severityOrder[b.severity.toUpperCase()] - severityOrder[a.severity.toUpperCase()]
  );

  // Severity color mapping
  const severityColors = {
    'CRITICAL': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'HIGH': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'MEDIUM': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'LOW': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  };
</script>

<div class="p-6  min-h-screen">
  <h2 class="text-2xl font-bold text-indigo-800 dark:text-indigo-200 mb-6">
    Vulnerabilities
    <span class="text-sm font-normal text-gray-500 dark:text-gray-400">
      ({vulnerabilities.length} found)
    </span>
  </h2>

  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {#each sortedVulnerabilities as vulnerability}
      <Card
        class="border border-gray-200 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 
               dark:border-gray-700 overflow-hidden transform hover:-translate-y-1"
      >
        <div class="flex flex-col h-full">
          <!-- Header with severity color -->
          <div class="{severityColors[vulnerability.severity.toUpperCase()]} p-4">
            <h3 class="text-lg font-semibold truncate" title={vulnerability.title}>
              {vulnerability.title}
            </h3>
          </div>

          <!-- Content -->
          <div class="p-4 space-y-3 text-gray-700 dark:text-gray-300 flex-1">
            <div class="space-y-2 text-sm">
              <p><strong>ID:</strong> {vulnerability.vulnerabilityID}</p>
              <p>
                <strong>Severity:</strong>
                <span class="inline-block px-2 py-1 rounded-full text-xs font-medium 
                            {severityColors[vulnerability.severity.toUpperCase()]}">
                  {vulnerability.severity}
                </span>
              </p>
              <p><strong>Resource:</strong> {vulnerability.resource}</p>
              <p>
                <strong>Version:</strong> {vulnerability.installedVersion}
                {#if vulnerability.fixedVersion}
                  → <span class="text-green-600 dark:text-green-400">{vulnerability.fixedVersion}</span>
                {/if}
              </p>
              <p><strong>Score:</strong> {vulnerability.score}</p>
            </div>

            <!-- Links -->
            <div class="space-y-1">
              <p>
                <strong>Primary:</strong>
                <a
                  href={vulnerability.primaryLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:underline dark:text-blue-400 truncate block"
                >
                  {vulnerability.primaryLink}
                </a>
              </p>
              {#if vulnerability.links?.length}
                <p>
                  <strong>Links:</strong>
                  {#each vulnerability.links as link}
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-600 hover:underline dark:text-blue-400 block truncate"
                    >
                      {link}
                    </a>
                  {/each}
                </p>
              {/if}
            </div>

            <!-- Dates -->
            <div class="space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <p><strong>Published:</strong> {new Date(vulnerability.publishedDate).toLocaleString()}</p>
              <p><strong>Modified:</strong> {new Date(vulnerability.lastModifiedDate).toLocaleString()}</p>
            </div>

            <!-- Additional Info -->
            <div class="space-y-1 text-sm">
              <p><strong>PURL:</strong> {vulnerability.packagePURL}</p>
              <p><strong>Target:</strong> {vulnerability.target || 'N/A'}</p>
            </div>
          </div>
        </div>
      </Card>
    {/each}
  </div>
</div>