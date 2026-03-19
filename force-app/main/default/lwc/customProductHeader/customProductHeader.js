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
    READYFORREVIEW: "ReadyForReview__c",
    FULFILLEDBY: "FulfilledBy__c"
});

const FULFILLED_BY_OPTIONS = [
    { label: "Internal", value: "Internal" },
    { label: "Third Party", value: "Third Party" }
];

export default class MyComponent extends LightningElement {
    input1Value = '';
    input2Value = false;
    readyForReviewValue = false;
    fulfilledByValue = '';
    showQuoteFieldsSave = false;

    fulfilledByOptions = FULFILLED_BY_OPTIONS;

    @api quoteId;
    @api transactionLineId;
    @api currentTransactionLineId;
    @api salesTransactionItems;
    @wire(MessageContext)
    messageContext;
    
    subscription = null;
    _input1UserModified = false;
    _input1OriginalValue = '';
    showInput1SaveCancel = false;
    _transactionLineIdOverride = '';

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

    // Lifecycle hook that subscribes to the message channel when the component is initialized
    connectedCallback() {
       this.subscribeToMessageChannel();
    }


    // Subscribes to the Lightning Message Service channel to receive message
    subscribeToMessageChannel() {
       if (!this.subscription) {
        console.log('[customProductHeader] subscribeToMessageChannel: subscribing to message channel'+ this.subscription);
           this.subscription = subscribe(
               this.messageContext,
               CONFIGR_CHANNEL,
               (message) => this.handleMessage(message)
           );
       }
    }
    
    handleMessage(message) {
        if (message?.action === LMS_EVENTS.NAVIGATE && message?.key?.length === 2 && message?.type === 'configure') {
            this._transactionLineIdOverride = message.key[1];
            this.input1Value = '';
            this.input2Value = false;
            this.readyForReviewValue = false;
            this.fulfilledByValue = '';
            this.showQuoteFieldsSave = false;
            this._input1UserModified = false;
            this._input1OriginalValue = '';
            this.showInput1SaveCancel = false;
        }
    }

    handleReadyForReviewChange(event) {
        this.readyForReviewValue = event.target.checked;
        this.showQuoteFieldsSave = true;
    }

    handleFulfilledByChange(event) {
        this.fulfilledByValue = event.detail.value;
        this.showQuoteFieldsSave = true;
    }

    handleQuoteFieldsSave() {
        this.publishFieldValue(this.quoteId, STATE_FIELDS.READYFORREVIEW, this.readyForReviewValue);
        this.publishFieldValue(this.quoteId, STATE_FIELDS.FULFILLEDBY, this.fulfilledByValue);
        this.showQuoteFieldsSave = false;
    }

    /**
     * Reusable helper to publish a single field value to the Product Configurator Data Manager.
     * @param {string} key - The entity key as a single string (e.g. quoteId or lineId)
     * @param {string} field - The field API name
     * @param {*} value - The field value
     */
    publishFieldValue(key, field, value) {
        const keyString = typeof key === 'string' ? key : (Array.isArray(key) ? key[0] : String(key ?? ''));
        if (!this.messageContext || !keyString) {
            return;
        }
        const bulkMessagePayload = {
            action: LMS_EVENTS.VALUE_CHANGE,
            data: [
                {
                    key: keyString,
                    values: [{ field, value }]
                }
            ]
        };
        console.log('[customProductHeader] publishFieldValue payload:', JSON.stringify(bulkMessagePayload, null, 2));
        publish(this.messageContext, CONFIGR_CHANNEL, bulkMessagePayload);
    }

    handleInput1Change(event) {
        if (!this.showInput1SaveCancel) {
            this._input1OriginalValue = this.input1Value;
        }
        this.input1Value = event.target.value;
        this.showInput1SaveCancel = true;
    }

    handleInput1Save() {
        this.sendInput1ToDataManager();
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
        this.sendInput2ToDataManager();
    }

    sendInput2ToDataManager() {
        this.publishFieldValue(this.transactionLineIdForPublish, STATE_FIELDS.APPLYCONTINGENCY, this.input2Value);
    }

    sendInput1ToDataManager() {
        this.publishFieldValue(this.transactionLineIdForPublish, STATE_FIELDS.SPECIALNOTE, this.input1Value);
    }
}