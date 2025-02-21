<script lang="ts">
	  import { Card } from 'svelte-5-ui-lib';

    const { secrets } = $props();

  
  

</script>
 <!-- container grid div -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- card div -->
        <div class="p-4  rounded-lg ">
            <h2 class="text-xl font-bold text-indigo-800 dark:text-indigo-200">Secrets</h2>

  <Card class="border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 dark:border-gray-700">
      <div class="p-4 space-y-2 text-gray-700 dark:text-gray-300">
          {#each secrets as secret}
          <div class="p-4 bg-indigo-50 rounded-t-lg dark:bg-indigo-900">
            <h2 class="text-xl font-bold text-indigo-800 dark:text-indigo-200">{secret.title}</h2>
          </div>
        <p class="whitespace-normal break-words"><strong>Category:</strong> {secret.category}</p>
        <p class="whitespace-normal break-words"><strong>Match:</strong> {secret.match}</p>
        <p class="whitespace-normal break-words"><strong>Rule ID:</strong> {secret.ruleID}</p>
        <p class="whitespace-normal break-words"><strong>Severity:</strong> {secret.severity}</p>
        <p class="whitespace-normal break-words"><strong>Target:</strong> {secret.target}</p>
      {/each}
    </div>
  </Card>

        </div>
    </div>  
