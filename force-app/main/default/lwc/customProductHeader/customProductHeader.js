import {api, wire, LightningElement} from 'lwc';

import {MessageContext, publish, subscribe} from 'lightning/messageService';
// subscribe from the configuration channel
import CONFIGR_CHANNEL from "@salesforce/messageChannel/lightning__productConfigurator_notification";

import {getRecord, getFieldValue} from 'lightning/uiRecordApi';
import SPECIAL_NOTES_FIELD from '@salesforce/schema/QuoteLineItem.Special_Notes__c';
import APPLY_CONTINGENCY_FIELD from '@salesforce/schema/QuoteLineItem.Apply_Contingency__c';
import SUBSCRIPTION_TERM_FIELD from '@salesforce/schema/QuoteLineItem.SubscriptionTerm';
import TARGET_MARGIN_FIELD from '@salesforce/schema/QuoteLineItem.Target_Margin__c';
import TARGET_PRICE_FIELD from '@salesforce/schema/QuoteLineItem.Target_Price__c';
import ESTIMATED_DELIVERY_DATE_FIELD from '@salesforce/schema/QuoteLineItem.Estimated_Delivery_Date__c';
import HIERARCHY_LEVEL_FIELD from '@salesforce/schema/QuoteLineItem.Hierarchy_Level__c';
import PREFERRED_DELIVERY_HOUR_FIELD from '@salesforce/schema/QuoteLineItem.Preferred_Delivery_Hour__c';

const QLI_FIELDS = [
    SPECIAL_NOTES_FIELD,
    APPLY_CONTINGENCY_FIELD,
    SUBSCRIPTION_TERM_FIELD,
    TARGET_MARGIN_FIELD,
    TARGET_PRICE_FIELD,
    ESTIMATED_DELIVERY_DATE_FIELD,
    HIERARCHY_LEVEL_FIELD,
    PREFERRED_DELIVERY_HOUR_FIELD
];

const LMS_EVENTS = Object.freeze({
    //events used in this example
    VALUE_CHANGE: "valueChanged",
    NAVIGATE: "navigate"
    //other events that are avaialble
    //CLOSE_PREVIEW: "closePreview",
    //TOGGLE_INSTANT_PRICING: "toggleInstantPricing",
    //TOGGLE_RULES_VALIDATION: "toggleRulesValidation",
    //TOGGLE_COMPACT_LAYOUT: "toggleCompactLayout",
    //UPDATE_PRICES: "updatePrices",
    //VALIDATE_PRODUCT: "validateProduct",
    //CLONE_ITEMS: "cloneItems",
});

const STATE_FIELDS = Object.freeze({
    TERM: "SubscriptionTerm",
    SPECIALNOTE: "Special_Note__c",
    APPLYCONTINGENCY: "Apply_Contingency__c",
    TARGET_MARGIN: "Target_Margin__c",
    TARGET_PRICE: "Target_Price__c",
    ESTIMATED_DELIVERY_DATE: "Estimated_Delivery_Date__c",
    HIERARCHY_LEVEL: "Hierarchy_Level__c",
    PREFERRED_DELIVERY_HOUR: "Preferred_Delivery_Hour__c"
});

export default class MyComponent extends LightningElement {
    input1Value = '';
    input2Value = false;
    termValue;
    showTermSaveCancel = false;
    _termOriginalValue;

    //input from the flow
    @api transactionLineId;
    @api currentTransactionLineId;
    @api salesTransactionItems;
    //dynamically show and hide different sections from the flow
    @api showQuoteLineSection;
    @api showTermSection;
    @wire(MessageContext)
    messageContext;
    
    subscription = null;
    _input1UserModified = false;
    _input1OriginalValue = '';
    showInput1SaveCancel = false;
    _transactionLineIdOverride = '';
    _quoteLineRecordId = '';

    targetMarginValue = null;
    showTargetMarginSaveCancel = false;
    _targetMarginOriginalValue = null;

    targetPriceValue = null;
    showTargetPriceSaveCancel = false;
    _targetPriceOriginalValue = null;

    estDeliveryDateValue = '';
    showEstDeliveryDateSaveCancel = false;
    _estDeliveryDateOriginalValue = '';

    hierarchyLevelValue = null;
    showHierarchyLevelSaveCancel = false;
    _hierarchyLevelOriginalValue = null;

    prefDeliveryHourValue = '';
    showPrefDeliveryHourSaveCancel = false;
    _prefDeliveryHourOriginalValue = '';

    get prefDeliveryHourOptions() {
        return [
            { label: 'None', value: '' },
            { label: 'AM', value: 'AM' },
            { label: 'PM', value: 'PM' }
        ];
    }

    // ─── NOT WORKING — FOR REFERENCE ONLY ────────────────────────────────────
    // The intent of this wire is to fetch the current QuoteLineItem field values
    // from Salesforce and populate the inputs as initial values when the component
    // first loads and whenever the user navigates to a different line item.
    //
    // This wiring is NOT currently functional. Inputs will always start empty.
    // Before using in a production project, this block must be validated and fixed
    // so the component reflects the saved state of the record on load.
    // ─────────────────────────────────────────────────────────────────────────
    @wire(getRecord, { recordId: '$_quoteLineRecordId', fields: QLI_FIELDS })
    wiredQuoteLineItem({ data, error }) {
        if (data) {
            this.input1Value = getFieldValue(data, SPECIAL_NOTES_FIELD) ?? '';
            this.input2Value = getFieldValue(data, APPLY_CONTINGENCY_FIELD) ?? false;
            this.termValue = getFieldValue(data, SUBSCRIPTION_TERM_FIELD);
            this.targetMarginValue = getFieldValue(data, TARGET_MARGIN_FIELD);
            this.targetPriceValue = getFieldValue(data, TARGET_PRICE_FIELD);
            this.estDeliveryDateValue = getFieldValue(data, ESTIMATED_DELIVERY_DATE_FIELD) ?? '';
            this.hierarchyLevelValue = getFieldValue(data, HIERARCHY_LEVEL_FIELD);
            this.prefDeliveryHourValue = getFieldValue(data, PREFERRED_DELIVERY_HOUR_FIELD) ?? '';
            this._input1OriginalValue = this.input1Value;
            this._termOriginalValue = this.termValue;
            this._targetMarginOriginalValue = this.targetMarginValue;
            this._targetPriceOriginalValue = this.targetPriceValue;
            this._estDeliveryDateOriginalValue = this.estDeliveryDateValue;
            this._hierarchyLevelOriginalValue = this.hierarchyLevelValue;
            this._prefDeliveryHourOriginalValue = this.prefDeliveryHourValue;
            console.log('[customProductHeader] wiredQuoteLineItem data:', JSON.stringify(data, null, 2));
        } else if (error) {
            console.error('[customProductHeader] wiredQuoteLineItem error:', JSON.stringify(error));
        }
    }

    

    // Lifecycle hook that subscribes to the message channel when the component is initialized
    connectedCallback() {
       this.subscribeToMessageChannel();
       this._quoteLineRecordId = this.transactionLineIdForPublish;
    }


    // Subscribes to the Lightning Message Service channel to receive message
    subscribeToMessageChannel() {
       if (!this.subscription) {
           this.subscription = subscribe(
               this.messageContext,
               CONFIGR_CHANNEL,
               (message) => this.handleMessage(message)
           );
       }
    }
    
    handleMessage(message) {
        console.log('[customProductHeader] handleMessage payload:', JSON.stringify(message, null, 2));
        if (message?.action === LMS_EVENTS.NAVIGATE && message?.key?.length === 2 && message?.type === 'configure') {
            this._transactionLineIdOverride = message.key[1];
            this.input1Value = '';
            this.input2Value = false;
            this._input1UserModified = false;
            this._input1OriginalValue = '';
            this.showInput1SaveCancel = false;
            this.showTermSaveCancel = false;
            this.targetMarginValue = null;
            this.showTargetMarginSaveCancel = false;
            this.targetPriceValue = null;
            this.showTargetPriceSaveCancel = false;
            this.estDeliveryDateValue = '';
            this.showEstDeliveryDateSaveCancel = false;
            this.hierarchyLevelValue = null;
            this.showHierarchyLevelSaveCancel = false;
            this.prefDeliveryHourValue = '';
            this.showPrefDeliveryHourSaveCancel = false;
            // Re-trigger wire fetch for the newly navigated-to line item
            this._quoteLineRecordId = this.transactionLineIdForPublish;
        }
    }
/**
     * Resolves the transaction line ID for LMS publish. The Product Configurator Data Manager
     * expects the key to identify the quote line item being configured.
     * Sources (in order): _transactionLineIdOverride (from navigate message), currentTransactionLineId,
     * transactionLineId, or first salesTransactionItem id/key.
     */
get transactionLineIdForPublish() {
    if (this._transactionLineIdOverride) {
        return this._transactionLineIdOverride;
    }
    if (this.currentTransactionLineId) {
        return this.currentTransactionLineId;
    }
    if (this.transactionLineId) {
        console.log('[customProductHeader] transactionLineIdForPublish: using transactionLineId', this.transactionLineId);
        return this.transactionLineId;
    }
    const firstItem = this.salesTransactionItems?.[0];
    if (firstItem) {
        const resolved = firstItem.id ?? firstItem.key?.[0] ?? firstItem.Id;
        console.log('[customProductHeader] transactionLineIdForPublish: using first salesTransactionItem', { firstItem, resolved });
        return resolved;
    }
    return '';
}

    get isQuoteLineSectionVisible() {
        return this.showQuoteLineSection !== false;
    }

    get isTermSectionVisible() {
        return this.showTermSection !== false;
    }

    handleInput1Change(event) {
        if (!this.showInput1SaveCancel) {
            this._input1OriginalValue = this.input1Value;
        }
        this.input1Value = event.target.value;
        this.showInput1SaveCancel = true;
    }

    handleInput1Save() {
        this.sendQuoteLineFieldToDataManager(STATE_FIELDS.SPECIALNOTE, this.input1Value);
        this._input1OriginalValue = this.input1Value;
        this.showInput1SaveCancel = false;
        this._input1UserModified = true;
    }

    handleInput1Cancel() {
        this.input1Value = this._input1OriginalValue;
        this.showInput1SaveCancel = false;
        this._input1UserModified = false;
    }

    handleTargetMarginChange(event) {
        if (!this.showTargetMarginSaveCancel) {
            this._targetMarginOriginalValue = this.targetMarginValue;
        }
        this.targetMarginValue = event.target.value;
        this.showTargetMarginSaveCancel = true;
    }

    handleTargetMarginSave() {
        this.sendQuoteLineFieldToDataManager(STATE_FIELDS.TARGET_MARGIN, this.targetMarginValue);
        this._targetMarginOriginalValue = this.targetMarginValue;
        this.showTargetMarginSaveCancel = false;
    }

    handleTargetMarginCancel() {
        this.targetMarginValue = this._targetMarginOriginalValue;
        this.showTargetMarginSaveCancel = false;
    }

    handleTargetPriceChange(event) {
        if (!this.showTargetPriceSaveCancel) {
            this._targetPriceOriginalValue = this.targetPriceValue;
        }
        this.targetPriceValue = event.target.value;
        this.showTargetPriceSaveCancel = true;
    }

    handleTargetPriceSave() {
        this.sendQuoteLineFieldToDataManager(STATE_FIELDS.TARGET_PRICE, this.targetPriceValue);
        this._targetPriceOriginalValue = this.targetPriceValue;
        this.showTargetPriceSaveCancel = false;
    }

    handleTargetPriceCancel() {
        this.targetPriceValue = this._targetPriceOriginalValue;
        this.showTargetPriceSaveCancel = false;
    }

    handleEstDeliveryDateChange(event) {
        if (!this.showEstDeliveryDateSaveCancel) {
            this._estDeliveryDateOriginalValue = this.estDeliveryDateValue;
        }
        this.estDeliveryDateValue = event.target.value;
        this.showEstDeliveryDateSaveCancel = true;
    }

    handleEstDeliveryDateSave() {
        this.sendQuoteLineFieldToDataManager(STATE_FIELDS.ESTIMATED_DELIVERY_DATE, this.estDeliveryDateValue);
        this._estDeliveryDateOriginalValue = this.estDeliveryDateValue;
        this.showEstDeliveryDateSaveCancel = false;
    }

    handleEstDeliveryDateCancel() {
        this.estDeliveryDateValue = this._estDeliveryDateOriginalValue;
        this.showEstDeliveryDateSaveCancel = false;
    }

    handleHierarchyLevelChange(event) {
        if (!this.showHierarchyLevelSaveCancel) {
            this._hierarchyLevelOriginalValue = this.hierarchyLevelValue;
        }
        this.hierarchyLevelValue = event.target.value;
        this.showHierarchyLevelSaveCancel = true;
    }

    handleHierarchyLevelSave() {
        this.sendQuoteLineFieldToDataManager(STATE_FIELDS.HIERARCHY_LEVEL, this.hierarchyLevelValue);
        this._hierarchyLevelOriginalValue = this.hierarchyLevelValue;
        this.showHierarchyLevelSaveCancel = false;
    }

    handleHierarchyLevelCancel() {
        this.hierarchyLevelValue = this._hierarchyLevelOriginalValue;
        this.showHierarchyLevelSaveCancel = false;
    }

    handlePrefDeliveryHourChange(event) {
        if (!this.showPrefDeliveryHourSaveCancel) {
            this._prefDeliveryHourOriginalValue = this.prefDeliveryHourValue;
        }
        this.prefDeliveryHourValue = event.detail.value;
        this.showPrefDeliveryHourSaveCancel = true;
    }

    handlePrefDeliveryHourSave() {
        this.sendQuoteLineFieldToDataManager(STATE_FIELDS.PREFERRED_DELIVERY_HOUR, this.prefDeliveryHourValue);
        this._prefDeliveryHourOriginalValue = this.prefDeliveryHourValue;
        this.showPrefDeliveryHourSaveCancel = false;
    }

    handlePrefDeliveryHourCancel() {
        this.prefDeliveryHourValue = this._prefDeliveryHourOriginalValue;
        this.showPrefDeliveryHourSaveCancel = false;
    }

    handleInput2Change(event) {
        this.input2Value = event.target.checked;
        this.sendQuoteLineFieldToDataManager(STATE_FIELDS.APPLYCONTINGENCY, this.input2Value);
    }

    handleTermChange(event) {
        if (!this.showTermSaveCancel) {
            this._termOriginalValue = this.termValue;
        }
        this.termValue = event.detail.value;
        this.showTermSaveCancel = true;
    }

    handleTermSave() {
        this.sendQuoteLineFieldToDataManager(STATE_FIELDS.TERM, this.termValue);
        this._termOriginalValue = this.termValue;
        this.showTermSaveCancel = false;
    }

    handleTermCancel() {
        this.termValue = this._termOriginalValue;
        this.showTermSaveCancel = false;
    }

    /**
     * Reusable helper to publish a quote line field value to the Product Configurator Data Manager.
     * Use this for all quote line input fields (Special Note, Apply Contingency, etc.).
     * @param {string} field - The field API name (e.g. STATE_FIELDS.SPECIALNOTE)
     * @param {*} value - The field value
     */
    sendQuoteLineFieldToDataManager(field, value) {
        const lineId = this.transactionLineIdForPublish;
        if (!this.messageContext || !lineId) {
            return;
        }
        const bulkMessagePayload = {
            action: LMS_EVENTS.VALUE_CHANGE,
            data: [
                {
                    key: [lineId],
                    values: [{ field, value }]
                }
            ]
        };
        console.log('[customProductHeader] sendQuoteLineFieldToDataManager payload:', JSON.stringify(bulkMessagePayload, null, 2));
        publish(this.messageContext, CONFIGR_CHANNEL, bulkMessagePayload);
    }
}