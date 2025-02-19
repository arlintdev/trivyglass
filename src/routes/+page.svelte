<script lang="ts">
  import { Heading, P, Button } from 'svelte-5-ui-lib';
  import {  GithubSolid } from "flowbite-svelte-icons";
</script>

<Heading tag="h1" class="mb-4 text-4xl font-extrabold  md:text-5xl lg:text-6xl">Trivy Glass</Heading>
<P class="mb-6 text-lg sm:px-16 lg:text-xl xl:px-48 dark:text-gray-400">It's never been easier to view your clusters vulnerabilities in a single pane of glass.</P>
<Button href="https://github.com/aarlint/trivy-glass" target="_blank" class="bg-primary-500 text-white hover:bg-primary-600">
  Git
  <GithubSolid class="ms-2 h-5 w-5" />
</Button>

