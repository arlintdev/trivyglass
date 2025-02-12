<script lang="ts">
  import { CloseButton, Sidebar, SidebarGroup, SidebarItem, SidebarButton, uiHelpers } from 'svelte-5-ui-lib';
  import { ChartOutline, GridSolid, MailBoxSolid, UserSolid } from "flowbite-svelte-icons";
  import { page } from "$app/stores";
  let activeUrl = $state($page.url.pathname);

  const spanClass = "flex-1 ms-3 whitespace-nowrap";
  const demoSidebarUi = uiHelpers();
  let isDemoOpen = $state(false);
  const closeDemoSidebar = demoSidebarUi.close;
  $effect(() => {
    isDemoOpen = demoSidebarUi.isOpen;
    activeUrl = $page.url.pathname;
  });

  let { children } = $props();
  import '../app.css';
  import NavBar from '../components/NavBar.svelte';
</script>

<div class="flex flex-col h-screen">
	<NavBar ></NavBar>
	<SidebarButton onclick={demoSidebarUi.toggle} class="mb-2" />
	<div class="relative">
	  <Sidebar {activeUrl} backdrop={false} isOpen={isDemoOpen} closeSidebar={closeDemoSidebar} params={{ x: -50, duration: 50 }} class="z-50 h-full pt-6" position="absolute" activeClass="p-2" nonActiveClass="p-2">
	    <CloseButton onclick={closeDemoSidebar} color="gray" class="absolute right-2 top-2 p-2 md:hidden" />
	    <SidebarGroup>
	      <SidebarItem label="Dashboard" href="/">
	        {#snippet iconSlot()}
	          <ChartOutline class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white" />
	        {/snippet}
	      </SidebarItem>
	      <SidebarItem label="Vulnerability" href="/vulnerabilityreports">
	        {#snippet iconSlot()}
	          <MailBoxSolid class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white" />
	        {/snippet}
	      </SidebarItem>
	      <SidebarItem label="Config Audit" href="/configauditreports">
	        {#snippet iconSlot()}
	          <GridSolid class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white" />
	        {/snippet}
	      </SidebarItem>
	      <SidebarItem label="SBOM" href="/sbomreports">
	        {#snippet iconSlot()}
	          <UserSolid class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white" />
	        {/snippet}
	      </SidebarItem>
	      <SidebarItem label="Infra Assessment" href="/infraassessmentreports">
	        {#snippet iconSlot()}
	          <ChartOutline class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white" />
	        {/snippet}
	      </SidebarItem>
	      <SidebarItem label="RBAC Assessment" href="/rbacassessmentreports">
	        {#snippet iconSlot()}
	          <GridSolid class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white" />
	        {/snippet}
	      </SidebarItem>
	    </SidebarGroup>
	  </Sidebar>
	  <div class="h-96 overflow-auto px-4 md:ml-64">
	    <div class="rounded-lg border-2 border-dashed border-gray-200 p-4 dark:border-gray-700">
			{@render children()}

	    </div>
	  </div>
	</div>
</div>
