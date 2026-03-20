# Third Party Configurator Component

A Lightning Web Component (LWC) for the Salesforce Product Configurator that provides custom quote and quote line field updates within the Configurator UI. The component integrates with the Product Configurator Data Manager via Lightning Message Service (LMS).

## Overview

The **customProductHeader** component displays three configurable sections:

1. **Update Quote Fields** – Ready for Review checkbox, Fulfilled by picklist
2. **Update Quote Line Fields** – Special Note text field, Apply Contingency toggle
3. **Update Terms** – Term (year) slider (1–5 years)

Each section can be shown or hidden via Flow properties. Field changes are published to the Product Configurator Data Manager for persistence.

## Prerequisites

- Salesforce org with ARM enabled
- Salesforce CLI (SFDX)
- Node.js (for local development and testing)

## Deployment

```bash
# Deploy to default org
sf project deploy start

# Deploy specific component
sf project deploy start --source-dir force-app/main/default/lwc/customProductHeader
```

## Setting Properties in Salesforce Flow

The component is designed to run on a **Flow Screen** . Configure it from the Flow Builder as follows.

### 1. Add the Component to a Flow Screen

1. Open **Setup** → **Flows** → select your Product Configurator flow (e.g., RCA Custom Configuration Flow).
2. Edit the flow and open the screen that hosts the Product Configurator UI.
3. In the **Components** panel, search for **My Third Party Configurator Component**.
4. Drag the component onto the screen canvas (typically into the same screen as the Data Manager and Configurator UI).

### 2. Configure Input Properties

In the Flow Builder, select the component on the canvas. The **Properties** panel on the right shows all configurable properties.

#### Required Properties (Input Only)

| Property | Label | Type | Description |
|----------|-------|------|-------------|
| `transactionLineId` | Line Item ID | Text | ID of the transaction line being configured. Map from `configuratorContext.transactionLineId`. |
| `currentTransactionLineId` | Current Line Item ID | Text | ID of the transaction line that launched the configurator. Map from `configuratorContext.currentTransactionLineId`. |
| `salesTransactionItems` | Sales Transaction Items | Apex (ProductConfig.SalesTransactionItem[]) | Collection of sales transaction item records. Map from `configuratorContext.salesTransactionItems`. |

**How to set in Flow:**

1. Click the component on the canvas.
2. In the **Properties** panel, find each property.
3. For **Line Item ID**: click the field → **Resource** → choose `configuratorContext.transactionLineId` (or the variable that holds the line ID).
4. For **Current Line Item ID**: choose `configuratorContext.currentTransactionLineId`.
5. For **Sales Transaction Items**: choose `configuratorContext.salesTransactionItems`.

### 3. Configure Section Visibility Properties

| Property | Label | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `showQuoteSection` | Show Quote section | Boolean | true | When true, shows the Update Quote Fields section. |
| `showQuoteLineSection` | Show Quote Line section | Boolean | true | When true, shows the Update Quote Line Item Fields section. |
| `showTermSection` | Show Term section | Boolean | true | When true, shows the Update Terms section. |

**How to set in Flow:**

1. Select the component on the canvas.
2. In the **Properties** panel, locate **Show Quote section**, **Show Quote Line section**, and **Show Term section**.
3. For each property:
   - **Literal value**: Check or uncheck the box to set true/false.
   - **From resource**: Click the field → **Resource** → choose a flow variable or formula that returns a Boolean.
4. Leave checked (true) to show a section; uncheck (false) to hide it.

### 4. Property Panel Layout

In the Flow Builder Properties panel, properties typically appear in this order:

```
Component Properties
├── Line Item ID (required)          → configuratorContext.transactionLineId
├── Current Line Item ID (required)  → configuratorContext.currentTransactionLineId
├── Sales Transaction Items          → configuratorContext.salesTransactionItems
├── Show Quote section               → true / false
├── Show Quote Line section          → true / false
└── Show Term section                → true / false
```

### 5. Using Flow Variables for Dynamic Visibility

To control visibility from flow logic:

1. Create Boolean variables (e.g., `varShowQuoteSection`, `varShowQuoteLineSection`, `varShowTermSection`).
2. Set them in decisions or assignments earlier in the flow.
3. Map each variable to the corresponding component property (Show Quote section, etc.).

## Flow Context Requirements

The component expects to be used inside a Product Configurator flow. Ensure the flow provides:

- A **configuratorContext** (or equivalent) with:
  - `transactionLineId`
  - `currentTransactionLineId`
  - `salesTransactionItems`
- The component must be placed on the same screen as the Product Configurator UI so it can subscribe to the configurator message channel.

## Custom Fields

The component publishes to these custom fields (create them if they do not exist):

- **Quote**: `ReadyForReview__c`, `FulfilledBy__c`
- **Quote Line Item**: `SpecialNote__c`, `ApplyContingency__c`, `Term__c`

## Project Structure

```
force-app/main/default/
├── lwc/
│   └── customProductHeader/     # Main LWC component
├── flows/
│   └── RCA_Custom_Configuration_Flow.flow-meta.xml
└── objects/
    └── QuoteLineItem/
        └── fields/              # Custom fields for quote line
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm run test

# Lint
npm run lint

# Format code
npm run prettier
```

## References

- [Product Configurator Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.cpq_dev_guide.meta/cpq_dev_guide/)
- [Lightning Web Components](https://developer.salesforce.com/docs/component-library/documentation/en/lwc)
- [Flow Builder](https://help.salesforce.com/s/articleView?id=sf.flow.htm)
