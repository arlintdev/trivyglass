<script lang="ts">
	import { Card } from 'svelte-5-ui-lib';

	const { secrets } = $props();
</script>

<!-- container grid div -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
	<!-- card div -->
	<div class="rounded-lg p-4">
		<h2 class="text-xl font-bold text-indigo-800 dark:text-indigo-200">Secrets</h2>

		<Card
			class="rounded-lg border border-gray-200 shadow-md transition-shadow duration-300 hover:shadow-lg dark:border-gray-700"
		>
			<div class="space-y-2 p-4 text-gray-700 dark:text-gray-300">
				{#each secrets as secret}
					<div class="rounded-t-lg bg-indigo-50 p-4 dark:bg-indigo-900">
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
