import {api, wire, LightningElement} from 'lwc';

import {MessageContext, publish, subscribe} from 'lightning/messageService';

import CONFIGR_CHANNEL from "@salesforce/messageChannel/lightning__productConfigurator_notification";

const LMS_EVENTS = Object.freeze({
    VALUE_CHANGE: "valueChanged",
    NAVIGATE: "navigate"
});

const STATE_FIELDS = Object.freeze({
    SPECIALNOTE: "SpecialNote__c",
    APPLYCONTINGENCY: "ApplyContingency__c"
});

export default class MyComponent extends LightningElement {
    input1Value = '';
    input2Value = false;

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
            this._input1UserModified = false;
            this._input1OriginalValue = '';
            this.showInput1SaveCancel = false;
        }
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
        const lineId = this.transactionLineIdForPublish;
        if (!this.messageContext || !lineId) {
            return;
        }
        const bulkMessagePayload = {
            action: LMS_EVENTS.VALUE_CHANGE,
            data: [
                {
                    key: [lineId],
                    values: [
                        {
                            field: STATE_FIELDS.APPLYCONTINGENCY,
                            value: this.input2Value
                        }
                    ]
                }
            ]
        };
        publish(this.messageContext, CONFIGR_CHANNEL, bulkMessagePayload);
    }
    sendInput1ToDataManager() {
        const lineId = this.transactionLineIdForPublish;
        if (!this.messageContext || !lineId) {
            return;
        }
        const bulkMessagePayload = {
            action: LMS_EVENTS.VALUE_CHANGE,
            data: [
                {
                    key: [lineId],
                    values: [
                        {
                            field: STATE_FIELDS.SPECIALNOTE,
                            value: this.input1Value
                        }
                    ]
                }
            ]
        };
        publish(this.messageContext, CONFIGR_CHANNEL, bulkMessagePayload);
    }
}