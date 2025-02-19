<script lang="ts">
  export let compliance: any;
  import { Button, Modal } from "svelte-5-ui-lib";
  let modalStatus = false
    const closeModal = () => {
        modalStatus.set({ open: false });
    }

</script>

<div class="compliance-component">
    <Button variant="primary" size="sm" on:click={() => modalStatus = true}>
        Compliance
    </Button>
  <Modal title="Compliance JSON" {modalStatus} {closeModal} size="xl" outsideClose={false} params={{ duration: 500 }}>
    {#if compliance}
      <pre class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
        {JSON.stringify(compliance, null, 2)}
      </pre>
    {/if}
    </Modal>
</div>

<style>
  .compliance-component {
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 0.5rem;
    background-color: #f9f9f9;
  }
</style>
