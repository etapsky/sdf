# Government Permit Application Example

Construction or operating permit application submitted by a company to a
municipal or regulatory authority. B2G and G2G exchange scenario.

## Why SDF here

Permit applications today are submitted as PDF form bundles — application form,
site plan, floor plans, structural report, environmental assessment — often
delivered on paper or through slow government portals. The receiving authority
manually extracts applicant details, project specifics, and supporting
references to enter into their case management system. With SDF, `data.json`
feeds directly into the authority's intake pipeline: automatic case creation,
automatic completeness check, automatic routing to the relevant reviewer.

The `visual.pdf` layer is the official application document with legal standing.
The `data.json` layer drives the digital processing workflow.

## Fields

| Field | Description |
|---|---|
| `permit_type` | Type of permit — e.g. `construction_permit`, `operating_permit`, `environmental_permit` |
| `application_number` | Issuer or authority scoped application reference |
| `application_date` | Date of submission |
| `applicant` | Applying entity — name, company ID, legal form, address, contact |
| `architect` | Licensed architect or engineer responsible for the project |
| `authority` | Receiving authority — name, department, address |
| `project` | Title, description, location (including parcel ID and coordinates), zone, construction type, timeline, estimated cost, dimensions |
| `documents_ref` | References to supporting documents — site plan, floor plan, elevations, structural report, environmental assessment |
| `declaration` | Applicant declaration — signatory, role, and date |

## Supporting documents

The `documents_ref` array lists supporting documents by type and reference
number. In a full SDF implementation, each supporting document could itself
be an SDF file — allowing the authority to ingest and process all attachments
programmatically, not just the application form.

## G2G multi-authority workflow

Where multiple authorities must approve a single project (e.g. municipal
planning + cantonal environmental agency + utility provider), the SDF
application can be forwarded between authorities. Each authority appends its
review outcome to `data.json` under a `reviews` array — a sequential G2G
workflow in a single file format with full audit trail.

## Coordinates

The `project.location.coordinates` field carries WGS84 decimal latitude and
longitude as strings. This enables the authority's GIS system to automatically
plot the project site, check zoning compliance, and identify nearby
infrastructure — without a human reading the address and looking it up manually.