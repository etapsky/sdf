# Government Health Report Example

Mandatory health and epidemiological report submitted by a healthcare facility
(hospital, clinic, laboratory) to a public health authority. B2G and G2G
exchange scenario.

## Why SDF here

Health reports today travel as PDF forms, fax transmissions, or through
proprietary public health portal submissions. The receiving authority manually
enters data into disease surveillance systems — introducing delays that directly
affect outbreak response times.

With SDF, the `data.json` layer feeds directly into the authority's
epidemiological surveillance pipeline — automatic case registration, automatic
threshold alerting, zero transcription lag. The `visual.pdf` layer satisfies
the legal reporting obligation and serves as the archival record.

## G2G extension

In a G2G scenario, a national public health authority can aggregate SDF reports
from regional authorities and forward a consolidated SDF to an international
body (WHO, ECDC) — each layer of aggregation appending its own `meta.json`
provenance without modifying the original `data.json` records.

## Fields

| Field | Description |
|---|---|
| `report_type` | Type of health report — e.g. `notifiable_disease`, `outbreak`, `occupational_injury` |
| `reporting_period` | ISO 8601 date range covered by this report |
| `reporter` | Submitting healthcare facility or laboratory |
| `authority` | Receiving public health authority |
| `cases` | Individual or aggregated case records |
| `disease` | Disease or condition being reported |
| `laboratory` | Confirming laboratory details (if applicable) |
| `declaration` | Responsible clinician or officer declaration |

## Privacy note

Health reports contain sensitive personal data. Producers MUST transmit SDF
health report files over encrypted channels (TLS 1.2 or later). Access controls
on storage are mandatory. Refer to `SDF_FORMAT.md` Section 11.6.