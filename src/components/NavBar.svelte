<script lang="ts">
  import { Navbar, NavBrand, NavUl, NavLi, uiHelpers, NavHamburger, Dropdown, DropdownHeader, DropdownUl, DropdownLi, Avatar, DropdownFooter } from 'svelte-5-ui-lib';
  import { page } from "$app/stores";
  let activeUrl = $state($page.url.pathname);
  import { sineIn } from "svelte/easing";
  let nav = uiHelpers();
  let navStatus = $state(false);
  let toggleNav = nav.toggle;
  let dropdownUser = uiHelpers();
  let dropdownUserStatus = $state(false);
  let closeDropdownUser = dropdownUser.close;
  import { Darkmode } from 'svelte-5-ui-lib';
  $effect(() => {
    dropdownUserStatus = dropdownUser.isOpen;
    navStatus = nav.isOpen;
    activeUrl = $page.url.pathname;
  });
</script>

<div class="h-16">
  <Navbar {navStatus} hamburgerMenu={false}>
    {#snippet brand()}
      <NavBrand siteName="Trivy Glass">
        <img width="30" src="/trivyglass.png" alt="svelte icon" />
      </NavBrand>
    {/snippet}
    {#snippet navSlotBlock()}
      <div class="flex items-center space-x-1 md:order-2">
        <Darkmode />
        <Avatar onclick={dropdownUser.toggle} src="/images/profile-picture-3.webp" dot={{ color: "green" }} />
        <div class="relative">
          <Dropdown dropdownStatus={dropdownUserStatus} closeDropdown={closeDropdownUser} params={{ y: 0, duration: 200, easing: sineIn }} class="absolute -left-[110px] top-[14px] md:-left-[160px] ">
            <DropdownHeader class="px-4 py-2">
              <span class="block text-sm text-gray-900 dark:text-white">Bonnie Green</span>
              <span class="block truncate text-sm font-medium">name@flowbite.com</span>
            </DropdownHeader>
            <DropdownUl>
              <DropdownLi href="/">Dashboard</DropdownLi>
              <DropdownLi href="/vulnerabilityreports">Vulnerability</DropdownLi>
              <DropdownLi href="/configauditreports">Config Audit</DropdownLi>
              <DropdownLi href="/sbomreports">SBOM</DropdownLi>
              <DropdownLi href="/infraassessmentreports">Infra Assessment</DropdownLi>
              <DropdownLi href="/rbacassessmentreports">RBAC Assessment</DropdownLi>
            </DropdownUl>
            <DropdownFooter class="px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600">Sign out</DropdownFooter>
          </Dropdown>
        </div>
        <NavHamburger {toggleNav} />
      </div>
    {/snippet}
    <NavUl class="order-1" {activeUrl}>
      <NavLi href="/">Dashboard</NavLi>
      <NavLi href="/vulnerabilityreports">Vulnerability</NavLi>
      <NavLi href="/configauditreports">Config Audit</NavLi>
      <NavLi href="/sbomreports">SBOM</NavLi>
      <NavLi href="/infraassessmentreports">Infra Assessment</NavLi>
      <NavLi href="/rbacassessmentreports">RBAC Assessment</NavLi>
    </NavUl>
  </Navbar>
</div>
