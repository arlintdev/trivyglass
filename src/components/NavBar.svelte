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
        
        <NavHamburger {toggleNav} />
      </div>
    {/snippet}
    <NavUl class="order-1" {activeUrl}>
      <NavLi href="/">Dashboard</NavLi>

    </NavUl>
  </Navbar>
</div>
