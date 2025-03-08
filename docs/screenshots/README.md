# Trivy Glass Screenshots

This directory is intended to store screenshots of the Trivy Glass application for documentation purposes. The main README.md file references these screenshots to provide visual examples of the application's features.

## Adding Screenshots

To add the screenshots to the documentation:

1. Run the Trivy Glass application in a Kubernetes cluster with trivy-operator installed and some security reports available.

2. Take screenshots of the following views in the application:

   | View                  | Description                                   | Filename to Use             |
   | --------------------- | --------------------------------------------- | --------------------------- |
   | Dashboard Overview    | The main dashboard showing summary statistics | `dashboard-overview.png`    |
   | Vulnerability Reports | The page showing vulnerability reports        | `vulnerability-reports.png` |
   | Security Checks       | The page showing security check results       | `security-checks.png`       |
   | SBOM View             | The Software Bill of Materials view           | `sbom-view.png`             |
   | Compliance Dashboard  | The compliance status dashboard               | `compliance-dashboard.png`  |
   | Report Details        | A detailed view of a specific report          | `report-details.png`        |

3. Save the screenshots with the exact filenames specified above.

4. Place the screenshots in this directory (`/docs/screenshots/`).

5. Update the main README.md file to uncomment the image references for each screenshot.

## Screenshot Guidelines

- Use a resolution of at least 1280x720 pixels for clarity
- Ensure the application is displaying realistic data that demonstrates its capabilities
- Use dark mode or light mode consistently across all screenshots
- Capture the entire application window, including the navigation bar
- Ensure no sensitive information is visible in the screenshots
- Optimize the images for web viewing (compress if necessary)

## Example Screenshot Locations in the Application

- **Dashboard Overview**: The main page when you first open the application
- **Vulnerability Reports**: Navigate to a resource with vulnerabilities and view the Vulnerabilities tab
- **Security Checks**: Navigate to a resource with security checks and view the Security Checks tab
- **SBOM View**: Navigate to a resource with SBOM data and view the SBOM tab
- **Compliance Dashboard**: Navigate to a resource with compliance data and view the Compliance tab
- **Report Details**: Click on the "Details" button for any report to see the detailed view
