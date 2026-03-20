import {api, wire, LightningElement} from 'lwc';

import {MessageContext, publish, subscribe} from 'lightning/messageService';

import CONFIGR_CHANNEL from "@salesforce/messageChannel/lightning__productConfigurator_notification";

const LMS_EVENTS = Object.freeze({
    VALUE_CHANGE: "valueChanged",
    NAVIGATE: "navigate"
});

const STATE_FIELDS = Object.freeze({
    SPECIALNOTE: "SpecialNote__c",
    APPLYCONTINGENCY: "ApplyContingency__c",
    TERM: "SubscriptionTerm"
});

export default class MyComponent extends LightningElement {
    input1Value = '';
    input2Value = false;
    termValue = 1;
    showTermSaveCancel = false;
    _termOriginalValue = 1;

    @api transactionLineId;
    @api currentTransactionLineId;
    @api salesTransactionItems;
    @api showQuoteSection;
    @api showQuoteLineSection;
    @api showTermSection;
    @wire(MessageContext)
    messageContext;
    
    subscription = null;
    _input1UserModified = false;
    _input1OriginalValue = '';
    showInput1SaveCancel = false;
    _transactionLineIdOverride = '';

    

    // Lifecycle hook that subscribes to the message channel when the component is initialized
    connectedCallback() {
       this.subscribeToMessageChannel();
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
            this.termValue = 1;
            this._input1UserModified = false;
            this._input1OriginalValue = '';
            this.showInput1SaveCancel = false;
            this._termOriginalValue = 1;
            this.showTermSaveCancel = false;
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

    get isQuoteSectionVisible() {
        return this.showQuoteSection !== false;
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