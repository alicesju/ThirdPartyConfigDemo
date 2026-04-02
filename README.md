# Third Party Configurator Component

A Lightning Web Component (LWC) for the Salesforce Revenue Cloud Advanced (RCA) Product Configurator that enables custom Quote Line Item field updates directly within the Configurator UI. The component integrates with the Product Configurator Data Manager via the `lightning__productConfigurator_notification` Lightning Message Service (LMS) channel.

---

## Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Custom Fields](#custom-fields)
- [LWC: customProductHeader](#lwc-customproductheader)
- [Apex Class: GetTransactionLineIdFromContext](#apex-class-gettransactionlineidfromcontext)
- [Flow: RCA Custom Configuration Flow](#flow-rca-custom-configuration-flow)
- [Deployment](#deployment)
- [Development](#development)
- [References](#references)

---

## Overview

The **customProductHeader** LWC displays two configurable accordion sections inside a Product Configurator flow screen:

| # | Section | Fields |
|---|---------|--------|
| 1 | **Update Quote Line Item Fields** | Special Note, Apply Contingency, Target Margin, Target Price, Estimated Delivery Date, Hierarchy Level, Preferred Delivery Hour |
| 2 | **Update Terms** | Term (year) slider — 1 to 5 years |

Each section can be independently shown or hidden via Flow input properties. When a user edits a field and clicks **Save**, the new value is published to the Product Configurator Data Manager via LMS so it is persisted to the Quote Line Item record. **Cancel** reverts the field to its last saved value. Apply Contingency publishes immediately on toggle (no Save/Cancel step).

On first load and on every `navigate` LMS event (i.e. when the user moves to a different line item), the component re-fetches the Quote Line Item record via `getRecord` (UIRecordAPI wire) to populate all fields with their current values from Salesforce.

---

## Project Structure

```
force-app/main/default/
├── lwc/
│   └── customProductHeader/
│       ├── customProductHeader.html          # UI template — 2 accordion sections
│       ├── customProductHeader.js            # Component logic, LMS pub/sub, wire
│       └── customProductHeader.js-meta.xml  # Flow screen target config & input properties
├── flows/
│   └── RCA_Custom_Configuration_Flow.flow-meta.xml
├── objects/
│   └── QuoteLineItem/
│       ├── QuoteLineItem.object-meta.xml
│       └── fields/
│           ├── Special_Notes__c.field-meta.xml
│           ├── Apply_Contingency__c.field-meta.xml
│           ├── Target_Margin__c.field-meta.xml
│           ├── Target_Price__c.field-meta.xml
│           ├── Estimated_Delivery_Date__c.field-meta.xml
│           ├── Hierarchy_Level__c.field-meta.xml
│           └── PreferredDeliveryHour__c.field-meta.xml
├── profiles/
│   └── Admin.profile-meta.xml               # Read + edit permissions for all custom fields
└── manifest/
    ├── lwc.xml                               # Full deployment manifest
    ├── customField.xml                       # Custom fields only manifest
    └── retrieve-sysadmin-profile.xml         # Admin profile retrieval manifest
```

---

## Custom Fields

All fields are on the **QuoteLineItem** object. The Admin profile has read and edit access to all of them.

| API Name | Label | Type | Details |
|----------|-------|------|---------|
| `Special_Notes__c` | Special Notes | Text | Length 100 |
| `Apply_Contingency__c` | Apply Contingency | Checkbox | Default: false |
| `Target_Margin__c` | Target Margin | Percent | Precision 18, Scale 2 |
| `Target_Price__c` | Target Price | Currency | Precision 18, Scale 2 |
| `Estimated_Delivery_Date__c` | Estimated Delivery Date | Date | — |
| `Hierarchy_Level__c` | Hierarchy Level | Number | Precision 18, Scale 0 (integer) |
| `PreferredDeliveryHour__c` | Preferred Delivery Hour | Picklist | Values: None, AM, PM |
| `SubscriptionTerm` | Subscription Term | Number (standard) | Standard field — not deployable as CustomField metadata |

---

## LWC: customProductHeader

### Flow Input Properties

Configured in `customProductHeader.js-meta.xml` and visible in the Flow Builder Properties panel.

#### Identity Properties (required)

| Property | Type | Description |
|----------|------|-------------|
| `transactionLineId` | String | ID of the transaction line being configured. Map from `configuratorContext.transactionLineId`. |
| `currentTransactionLineId` | String | ID of the transaction line that launched the configurator. Map from `configuratorContext.currentTransactionLineId`. |
| `salesTransactionItems` | `apex://ProductConfig.SalesTransactionItem[]` | Collection of sales transaction items. Map from `configuratorContext.salesTransactionItems`. |

#### Visibility Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `showQuoteLineSection` | Boolean | true | Show/hide the **Update Quote Line Item Fields** accordion section. |
| `showTermSection` | Boolean | true | Show/hide the **Update Terms** accordion section. |

### Adding the Component to a Flow Screen

1. Open **Setup → Flows** and open your Product Configurator flow (e.g. `RCA Custom Configuration Flow`).
2. Edit the flow and open the screen that hosts the Product Configurator UI.
3. In the **Components** panel search for **Custom UI Component** and drag it onto the screen.
4. In the **Properties** panel on the right, map the input properties:

```
Component Properties
├── Line Item ID (required)          → configuratorContext.transactionLineId
├── Current Line Item ID (required)  → configuratorContext.currentTransactionLineId
├── Sales Transaction Items          → configuratorContext.salesTransactionItems
├── Show Quote Line section          → true / false  (or a Boolean flow variable)
└── Show Term section                → true / false  (or a Boolean flow variable)
```

### LMS Integration

The component subscribes to `lightning__productConfigurator_notification` on `connectedCallback`. On each field **Save**, it publishes a `valueChanged` action payload:

```json
{
  "action": "valueChanged",
  "data": [
    {
      "key": ["<transactionLineId>"],
      "values": [{ "field": "<FieldApiName>", "value": "<newValue>" }]
    }
  ]
}
```

On receipt of a `navigate` message from the Data Manager (user switches line item), all field values are reset and `getRecord` is re-triggered to load the new line item's data.

### Wire — Initial Field Values

On component load and after every navigate event the component fires `@wire(getRecord, ...)` for the resolved `transactionLineIdForPublish`. The following fields are fetched and used as initial values:

| Field | Bound to |
|-------|----------|
| `Special_Notes__c` | Special Note text input |
| `Apply_Contingency__c` | Apply Contingency toggle |
| `SubscriptionTerm` | Term slider |
| `Target_Margin__c` | Target Margin number input |
| `Target_Price__c` | Target Price currency input |
| `Estimated_Delivery_Date__c` | Estimated Delivery Date date input |
| `Hierarchy_Level__c` | Hierarchy Level number input |
| `PreferredDeliveryHour__c` | Preferred Delivery Hour picklist |

### Transaction Line ID Resolution

`transactionLineIdForPublish` (used for both LMS publish and `getRecord`) resolves in this priority order:

1. `_transactionLineIdOverride` — set from an incoming `navigate` LMS message
2. `currentTransactionLineId` — flow `@api` input
3. `transactionLineId` — flow `@api` input
4. First item in `salesTransactionItems` — flow `@api` input

---

## Apex Class: GetTransactionLineIdFromContext

**File:** `force-app/main/default/classes/GetTransactionLineIdFromContext.cls`

An `@InvocableMethod` action that parses a JSON string representation of `ProductConfig__ConfiguratorContext` and returns the key ID fields as individual String outputs.

> **Background:** `@InvocableVariable` does not support Apex-defined types from managed packages (such as `ProductConfig__ConfiguratorContext`), so the context must be passed as a serialized JSON string.

### Input

| Variable | Type | Description |
|----------|------|-------------|
| `configuratorContextJson` | String (required) | The configuratorContext serialized as JSON |

### Output

| Variable | Type | Description |
|----------|------|-------------|
| `transactionLineId` | String | The `transactionLineId` from the context |
| `transactionId` | String | The `transactionId` from the context |
| `currentTransactionLineId` | String | The `currentTransactionLineId` from the context |

### Expected JSON Shape

```json
{
  "transactionLineId"        : "0QLXX...",
  "transactionId"            : "0Q0XX...",
  "currentTransactionLineId" : "0QLXX...",
  "parentName"               : "Test Quote",
  "origin"                   : "Quote",
  "explainabilityEnabled"    : false,
  "addedNodes"               : []
}
```


---

## Flow: RCA Custom Configuration Flow

**File:** `force-app/main/default/flows/RCA_Custom_Configuration_Flow.flow-meta.xml`

A Screen Flow that hosts the Revenue Cloud Product Configurator UI. Key components on the screen:

- `runtime_industries_cfg:dataManager` — bridges the configurator UI with the underlying data
- `customProductHeader` — this project's custom LWC

---

## Deployment

### Deploy Everything

```bash
sf project deploy start --manifest manifest/lwc.xml
```

The `lwc.xml` manifest includes: the LWC, all 7 custom fields, the Admin profile (with field permissions), the flow, and the Apex class.

### Deploy Individual Pieces

```bash
# LWC only
sf project deploy start --source-dir force-app/main/default/lwc/customProductHeader

# Custom fields only
sf project deploy start --manifest manifest/customField.xml

# Apex class only
sf project deploy start --manifest manifest/apex.xml
```

### Retrieve the Admin Profile

```bash
sf project retrieve start --manifest manifest/retrieve-sysadmin-profile.xml
```

---

## Development

```bash
# Install dependencies
npm install

# Run Jest unit tests
npm run test

# Lint
npm run lint

# Format code
npm run prettier
```

---

## References

- [Salesforce Revenue Cloud Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.revenue_lifecycle_management_dev_guide.meta/revenue_lifecycle_management_dev_guide/)
- [Product Configurator Flow — Trailhead](https://trailhead.salesforce.com/content/learn/modules/product-configuration-with-revenue-cloud/create-and-configure-a-product-configurator-flow)
- [Lightning Message Service](https://developer.salesforce.com/docs/component-library/documentation/en/lwc/lwc.use_message_channel)
- [getRecord — UI API Wire Adapter](https://developer.salesforce.com/docs/component-library/documentation/en/lwc/lwc.reference_wire_adapters_record)
- [Lightning Web Components Developer Guide](https://developer.salesforce.com/docs/component-library/documentation/en/lwc)
- [Flow Builder Reference](https://help.salesforce.com/s/articleView?id=sf.flow.htm)
