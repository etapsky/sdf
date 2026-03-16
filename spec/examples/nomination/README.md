# Nomination Example

Cargo nomination document sent from a cargo owner to a shipping agent or
terminal operator. B2B exchange scenario common in energy, bulk commodities,
and logistics.

## Why SDF here

Nominations today travel as emails or PDF attachments. Shipping agents and
terminal operators manually transcribe vessel names, laycan windows, quantities,
and port details into their voyage management systems — a process prone to
transcription errors that can cause costly commercial disputes. With SDF, the
`data.json` layer feeds directly into the agent's system. The `visual.pdf`
layer serves as the formal nomination document with legal standing.

## Fields

| Field | Description |
|---|---|
| `nomination_number` | Issuer-scoped nomination identifier |
| `issue_date` | Date the nomination was issued |
| `contract_ref` | Underlying contract or charter party reference |
| `cargo_owner` | Nominating party — name, ID, address, contact |
| `agent` | Receiving shipping agent — name, ID, address, contact |
| `vessel` | Nominated vessel — name, IMO number, flag, DWT, ETA |
| `laycan` | Laycan window — earliest and latest arrival dates |
| `port_of_loading` | Loading port, UN/LOCODE, and terminal |
| `port_of_discharge` | Discharge port, UN/LOCODE, and terminal |
| `cargo` | Cargo description, quantity, unit, tolerance, quality reference |
| `freight` | Freight rate, unit, and delivery terms |

## Matching

On the receiving side, `nomination_number` and `contract_ref` allow automated
matching against internal voyage records — no manual transcription of vessel
names, quantities, or dates. Laycan conflicts and quantity mismatches are
detected at ingestion time, not discovered during vessel arrival.

## IMO number

The `vessel.imo` field carries the IMO ship identification number — a globally
unique 7-digit identifier that does not change with flag, name, or ownership.
It is the preferred vessel identity anchor for automated matching.