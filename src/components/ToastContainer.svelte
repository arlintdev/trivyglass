<script lang="ts">
  import { onMount } from 'svelte';
  import { toastStore, type Toast } from '$lib/stores/toastStore';
  import { Toast as ToastComponent } from 'svelte-5-ui-lib';
  import { fly } from 'svelte/transition';

  let toasts: Toast[] = [];
  
  // Subscribe to the toast store
  onMount(() => {
    const unsubscribe = toastStore.subscribe(value => {
      toasts = value;
    });
    
    return unsubscribe;
  });
  
  // Function to handle manual toast dismissal
  function dismissToast(id: string) {
    toastStore.removeToast(id);
  }
</script>

{#if toasts.length > 0}
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    {#each toasts as toast (toast.id)}
      <div 
        transition:fly={{ y: 20, duration: 300 }}
        class="max-w-md"
      >
        <div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4">
          <ToastComponent
            align={false}
            dismissable={true}
          >
            <span class="font-semibold text-gray-900 dark:text-white">Notification</span>
            <div class="mt-2 text-sm">
              {toast.message}
            </div>
          </ToastComponent>
        </div>
      </div>
    {/each}
  </div>
{/if}