<script lang="ts">
	import { Heading, P, Button, Card } from 'flowbite-svelte';
	import {
		GithubSolid,
		ShieldCheckSolid,
		ExclamationCircleSolid,
		LockSolid,
		FileSolid,
		ClipboardListSolid,
		ServerSolid
	} from 'flowbite-svelte-icons';
	import ErrorDemo from '../components/ErrorDemo.svelte';
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 text-center">
		<Heading tag="h1" class="mb-4 text-4xl font-extrabold md:text-5xl lg:text-6xl"
			>Trivy Glass</Heading
		>

		<P class="mb-4 text-lg lg:text-xl dark:text-gray-400">
			A comprehensive dashboard that consolidates all reports generated by trivy‑operator, offering
			a single pane of glass to monitor cluster vulnerabilities.
		</P>

		<P class="mb-6 text-lg lg:text-xl dark:text-gray-400">
			Streamline your vulnerability management by visualizing critical security insights and
			remediation steps in one centralized location.
		</P>

		<Button
			href="https://github.com/arlintdev/trivyglass"
			target="_blank"
			class="bg-primary-500 hover:bg-primary-600 text-white"
		>
			GitHub Repository
			<GithubSolid class="ms-2 h-5 w-5" />
		</Button>
	</div>

	<!-- Cluster Level Reports -->
	<div class="mb-8">
		<h2 class="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-200">Cluster Level Reports</h2>
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			<!-- Vulnerability Card -->
			<Card
				class="transform overflow-hidden rounded-xl border border-gray-200 shadow-md transition-all 
				duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700"
			>
				<div class="flex h-full flex-col">
					<div class="bg-red-100 p-4 dark:bg-red-900">
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold text-red-800 dark:text-red-200">Vulnerabilities</h3>
							<ExclamationCircleSolid class="h-8 w-8 text-red-800 dark:text-red-200" />
						</div>
					</div>
					<div class="flex-1 p-4">
						<p class="mb-4 text-gray-700 dark:text-gray-300">
							View detailed reports of vulnerabilities detected in your cluster resources. Track
							critical, high, medium, and low severity issues with comprehensive information about
							each vulnerability.
						</p>
						<div class="mt-auto">
							<Button
								href="/clustervulnerabilityreports"
								class="w-full bg-red-600 text-white hover:bg-red-700"
							>
								View Cluster Vulnerabilities
							</Button>
						</div>
					</div>
				</div>
			</Card>

			<!-- Config Audit Card -->
			<Card
				class="transform overflow-hidden rounded-xl border border-gray-200 shadow-md transition-all 
				duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700"
			>
				<div class="flex h-full flex-col">
					<div class="bg-blue-100 p-4 dark:bg-blue-900">
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold text-blue-800 dark:text-blue-200">Config Audit</h3>
							<ShieldCheckSolid class="h-8 w-8 text-blue-800 dark:text-blue-200" />
						</div>
					</div>
					<div class="flex-1 p-4">
						<p class="mb-4 text-gray-700 dark:text-gray-300">
							Review security checks performed on your cluster resources. Identify
							misconfigurations, policy violations, and security best practice recommendations with
							detailed remediation steps.
						</p>
						<div class="mt-auto">
							<Button
								href="/clusterconfigauditreports"
								class="w-full bg-blue-600 text-white hover:bg-blue-700"
							>
								View Cluster Config Audits
							</Button>
						</div>
					</div>
				</div>
			</Card>

			<!-- SBOM Card -->
			<Card
				class="transform overflow-hidden rounded-xl border border-gray-200 shadow-md transition-all 
				duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700"
			>
				<div class="flex h-full flex-col">
					<div class="bg-purple-100 p-4 dark:bg-purple-900">
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold text-purple-800 dark:text-purple-200">SBOM</h3>
							<FileSolid class="h-8 w-8 text-purple-800 dark:text-purple-200" />
						</div>
					</div>
					<div class="flex-1 p-4">
						<p class="mb-4 text-gray-700 dark:text-gray-300">
							Explore Software Bill of Materials (SBOM) for your cluster applications. Get a
							comprehensive inventory of all components, libraries, and dependencies with detailed
							version information.
						</p>
						<div class="mt-auto">
							<Button
								href="/clustersbomreports"
								class="w-full bg-purple-600 text-white hover:bg-purple-700"
							>
								View Cluster SBOM
							</Button>
						</div>
					</div>
				</div>
			</Card>

			<!-- Compliance Card -->
			<Card
				class="transform overflow-hidden rounded-xl border border-gray-200 shadow-md transition-all 
				duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700"
			>
				<div class="flex h-full flex-col">
					<div class="bg-green-100 p-4 dark:bg-green-900">
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold text-green-800 dark:text-green-200">Compliance</h3>
							<ClipboardListSolid class="h-8 w-8 text-green-800 dark:text-green-200" />
						</div>
					</div>
					<div class="flex-1 p-4">
						<p class="mb-4 text-gray-700 dark:text-gray-300">
							Monitor compliance status against industry standards and best practices at the cluster
							level. Track your progress towards meeting security requirements and identify areas
							for improvement.
						</p>
						<div class="mt-auto">
							<Button
								href="/clustercompliancereports"
								class="w-full bg-green-600 text-white hover:bg-green-700"
							>
								View Cluster Compliance
							</Button>
						</div>
					</div>
				</div>
			</Card>

			<!-- RBAC Assessment Card -->
			<Card
				class="transform overflow-hidden rounded-xl border border-gray-200 shadow-md transition-all 
				duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700"
			>
				<div class="flex h-full flex-col">
					<div class="bg-amber-100 p-4 dark:bg-amber-900">
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold text-amber-800 dark:text-amber-200">RBAC Assessment</h3>
							<LockSolid class="h-8 w-8 text-amber-800 dark:text-amber-200" />
						</div>
					</div>
					<div class="flex-1 p-4">
						<p class="mb-4 text-gray-700 dark:text-gray-300">
							Analyze Role-Based Access Control (RBAC) configurations at the cluster level. Identify
							potential security risks in your permission settings and access controls.
						</p>
						<div class="mt-auto">
							<Button
								href="/clusterrbacassessmentreports"
								class="w-full bg-amber-600 text-white hover:bg-amber-700"
							>
								View Cluster RBAC Assessment
							</Button>
						</div>
					</div>
				</div>
			</Card>

			<!-- Infrastructure Assessment Card -->
			<Card
				class="transform overflow-hidden rounded-xl border border-gray-200 shadow-md transition-all 
				duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700"
			>
				<div class="flex h-full flex-col">
					<div class="bg-indigo-100 p-4 dark:bg-indigo-900">
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold text-indigo-800 dark:text-indigo-200">Infrastructure</h3>
							<ServerSolid class="h-8 w-8 text-indigo-800 dark:text-indigo-200" />
						</div>
					</div>
					<div class="flex-1 p-4">
						<p class="mb-4 text-gray-700 dark:text-gray-300">
							Evaluate your cluster infrastructure for security vulnerabilities and configuration
							issues. Identify potential risks in your infrastructure setup and get recommendations
							for improvement.
						</p>
						<div class="mt-auto">
							<Button
								href="/clusterinfraassessmentreports"
								class="w-full bg-indigo-600 text-white hover:bg-indigo-700"
							>
								View Cluster Infrastructure
							</Button>
						</div>
					</div>
				</div>
			</Card>
		</div>
	</div>

	<!-- Namespace Level Reports -->
	<div>
		<h2 class="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
			Namespace Level Reports
		</h2>
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			<!-- Vulnerability Card -->
			<Card
				class="transform overflow-hidden rounded-xl border border-gray-200 shadow-md transition-all 
				duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700"
			>
				<div class="flex h-full flex-col">
					<div class="bg-red-100 p-4 dark:bg-red-900">
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold text-red-800 dark:text-red-200">Vulnerabilities</h3>
							<ExclamationCircleSolid class="h-8 w-8 text-red-800 dark:text-red-200" />
						</div>
					</div>
					<div class="flex-1 p-4">
						<p class="mb-4 text-gray-700 dark:text-gray-300">
							View detailed reports of vulnerabilities detected in your namespace resources. Track
							critical, high, medium, and low severity issues with comprehensive information about
							each vulnerability.
						</p>
						<div class="mt-auto">
							<Button
								href="/vulnerabilityreports"
								class="w-full bg-red-600 text-white hover:bg-red-700"
							>
								View Namespace Vulnerabilities
							</Button>
						</div>
					</div>
				</div>
			</Card>

			<!-- Config Audit Card -->
			<Card
				class="transform overflow-hidden rounded-xl border border-gray-200 shadow-md transition-all 
				duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700"
			>
				<div class="flex h-full flex-col">
					<div class="bg-blue-100 p-4 dark:bg-blue-900">
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold text-blue-800 dark:text-blue-200">Config Audit</h3>
							<ShieldCheckSolid class="h-8 w-8 text-blue-800 dark:text-blue-200" />
						</div>
					</div>
					<div class="flex-1 p-4">
						<p class="mb-4 text-gray-700 dark:text-gray-300">
							Review security checks performed on your namespace resources. Identify
							misconfigurations, policy violations, and security best practice recommendations with
							detailed remediation steps.
						</p>
						<div class="mt-auto">
							<Button
								href="/configauditreports"
								class="w-full bg-blue-600 text-white hover:bg-blue-700"
							>
								View Namespace Config Audits
							</Button>
						</div>
					</div>
				</div>
			</Card>

			<!-- SBOM Card -->
			<Card
				class="transform overflow-hidden rounded-xl border border-gray-200 shadow-md transition-all 
				duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700"
			>
				<div class="flex h-full flex-col">
					<div class="bg-purple-100 p-4 dark:bg-purple-900">
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold text-purple-800 dark:text-purple-200">SBOM</h3>
							<FileSolid class="h-8 w-8 text-purple-800 dark:text-purple-200" />
						</div>
					</div>
					<div class="flex-1 p-4">
						<p class="mb-4 text-gray-700 dark:text-gray-300">
							Explore Software Bill of Materials (SBOM) for your namespace applications. Get a
							comprehensive inventory of all components, libraries, and dependencies with detailed
							version information.
						</p>
						<div class="mt-auto">
							<Button
								href="/sbomreports"
								class="w-full bg-purple-600 text-white hover:bg-purple-700"
							>
								View Namespace SBOM
							</Button>
						</div>
					</div>
				</div>
			</Card>

			<!-- Exposed Secrets Card -->
			<Card
				class="transform overflow-hidden rounded-xl border border-gray-200 shadow-md transition-all 
				duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700"
			>
				<div class="flex h-full flex-col">
					<div class="bg-yellow-100 p-4 dark:bg-yellow-900">
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold text-yellow-800 dark:text-yellow-200">
								Exposed Secrets
							</h3>
							<LockSolid class="h-8 w-8 text-yellow-800 dark:text-yellow-200" />
						</div>
					</div>
					<div class="flex-1 p-4">
						<p class="mb-4 text-gray-700 dark:text-gray-300">
							Detect exposed secrets in your namespace resources. Identify API keys, tokens,
							credentials, and other sensitive information that might be accidentally exposed.
						</p>
						<div class="mt-auto">
							<Button
								href="/exposedsecretreports"
								class="w-full bg-yellow-600 text-white hover:bg-yellow-700"
							>
								View Exposed Secrets
							</Button>
						</div>
					</div>
				</div>
			</Card>

			<!-- RBAC Assessment Card -->
			<Card
				class="transform overflow-hidden rounded-xl border border-gray-200 shadow-md transition-all 
				duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700"
			>
				<div class="flex h-full flex-col">
					<div class="bg-amber-100 p-4 dark:bg-amber-900">
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold text-amber-800 dark:text-amber-200">RBAC Assessment</h3>
							<LockSolid class="h-8 w-8 text-amber-800 dark:text-amber-200" />
						</div>
					</div>
					<div class="flex-1 p-4">
						<p class="mb-4 text-gray-700 dark:text-gray-300">
							Analyze Role-Based Access Control (RBAC) configurations at the namespace level.
							Identify potential security risks in your permission settings and access controls.
						</p>
						<div class="mt-auto">
							<Button
								href="/rbacassessmentreports"
								class="w-full bg-amber-600 text-white hover:bg-amber-700"
							>
								View Namespace RBAC Assessment
							</Button>
						</div>
					</div>
				</div>
			</Card>

			<!-- Infrastructure Assessment Card -->
			<Card
				class="transform overflow-hidden rounded-xl border border-gray-200 shadow-md transition-all 
				duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700"
			>
				<div class="flex h-full flex-col">
					<div class="bg-indigo-100 p-4 dark:bg-indigo-900">
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold text-indigo-800 dark:text-indigo-200">Infrastructure</h3>
							<ServerSolid class="h-8 w-8 text-indigo-800 dark:text-indigo-200" />
						</div>
					</div>
					<div class="flex-1 p-4">
						<p class="mb-4 text-gray-700 dark:text-gray-300">
							Evaluate your namespace infrastructure for security vulnerabilities and configuration
							issues. Identify potential risks in your infrastructure setup and get recommendations
							for improvement.
						</p>
						<div class="mt-auto">
							<Button
								href="/infraassessmentreports"
								class="w-full bg-indigo-600 text-white hover:bg-indigo-700"
							>
								View Namespace Infrastructure
							</Button>
						</div>

						<!-- Error Demo Section -->
						<div class="mt-12 mb-8">
							<h2 class="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
								Error Notification Demo
							</h2>
							<div class="grid grid-cols-1">
								<ErrorDemo />
							</div>
						</div>
					</div>
				</div>
			</Card>
		</div>
	</div>
</div>
