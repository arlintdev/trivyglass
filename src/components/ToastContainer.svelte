<script lang="ts">
	import { onMount } from 'svelte';
	import { toastStore, type Toast } from '$lib/stores/toastStore';

	let toasts: Toast[] = $state([]);

	onMount(() => {
		const unsubscribe = toastStore.subscribe((value) => {
			toasts = value;
		});
		return unsubscribe;
	});
</script>

{#if toasts.length > 0}
	<div
		style="position: fixed; bottom: var(--space-md); right: var(--space-md); z-index: 200; display: flex; flex-direction: column; gap: var(--space-sm);"
	>
		{#each toasts as toast (toast.id)}
			<div
				class="nd-surface-raised"
				style="padding: var(--space-md); border-radius: 8px; max-width: 400px; border: 1px solid var(--nd-border-visible);"
			>
				<p class="nd-label" style="margin-bottom: var(--space-xs);">
					{toast.type === 'error'
						? '[ERROR]'
						: toast.type === 'warning'
							? '[WARNING]'
							: toast.type === 'success'
								? '[OK]'
								: '[INFO]'}
				</p>
				<p class="nd-body-sm">{toast.message}</p>
			</div>
		{/each}
	</div>
{/if}
