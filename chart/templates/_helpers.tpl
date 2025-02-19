{{/*
Namespace
*/}}
{{- define "trivy-glass.namespace" -}}
{{- if eq .Release.Namespace "default" }}
{{- print "trivy-glass" }}
{{- else}}
{{- .Release.Namespace }}
{{- end }}
{{- end -}}

{{/*
Create a default fully qualified app name.
Truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec)
*/}}
{{- define "trivy-glass.fullname" -}}
{{- printf "%s" .Release.Name | trunc 63 }}
{{- end }}

{{/*
Expand the name of the chart.
*/}}
{{- define "trivy-glass.name" -}}
{{- .Chart.Name | trunc 63 }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "trivy-glass.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "trivy-glass.labels" -}}
helm.sh/chart: {{ include "trivy-glass.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "trivy-glass.selectorLabels" -}}
app.kubernetes.io/name: {{ include "trivy-glass.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
