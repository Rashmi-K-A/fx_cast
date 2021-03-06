/* tslint:disable:max-line-length */
"use strict";

import React, { Component } from "react";
import ReactDOM from "react-dom";

import defaultOptions from "../../defaultOptions";

import About from "./About";
import Bridge from "./Bridge";
import EditableList from "./EditableList";

import bridge, { BridgeInfo, BridgeTimedOutError } from "../../lib/bridge";
import logger from "../../lib/logger";
import options, { Options } from "../../lib/options";
import { REMOTE_MATCH_PATTERN_REGEX } from "../../lib/utils";

import { ReceiverSelectorType } from "../../background/receiverSelector";


const _ = browser.i18n.getMessage;


// macOS styles
browser.runtime.getPlatformInfo()
    .then(platformInfo => {
        const link = document.createElement("link");
        link.rel = "stylesheet";

        switch (platformInfo.os) {
            case "mac": {
                link.href = "styles/mac.css";
                break;
            }

            // Fix issue with input[type="number"] height
            case "linux": {
                link.href = "styles/linux.css";

                const input = document.createElement("input");
                const inputWrapper = document.createElement("div");

                inputWrapper.append(input);
                document.documentElement.append(inputWrapper);

                input.type = "text";
                const textInputHeight = window.getComputedStyle(input).height;
                input.type = "number";
                const numberInputHeight = window.getComputedStyle(input).height;

                inputWrapper.remove();

                if (numberInputHeight !== textInputHeight) {
                    const style = document.createElement("style");
                    style.textContent = `
                        input[type="number"] {
                            height: ${textInputHeight};
                        }
                    `;

                    document.body.append(style);
                }

                break;
            }
        }

        if (link.href) {
            document.head.appendChild(link);
        }
    });


function getInputValue (input: HTMLInputElement) {
    switch (input.type) {
        case "checkbox":
            return input.checked;
        case "number":
            return parseFloat(input.value);

        default:
            return input.value;
    }
}


interface OptionsAppState {
    hasLoaded: boolean;
    bridgeLoading: boolean;
    bridgeLoadingTimedOut: boolean;
    isFormValid: boolean;
    hasSaved: boolean;

    options?: Options;
    bridgeInfo?: BridgeInfo;
    platform?: string;
}

class OptionsApp extends Component<{}, OptionsAppState> {
    private form: (HTMLFormElement | null) = null;

    constructor (props: {}) {
        super(props);

        this.state = {
            hasLoaded: false
          , bridgeLoading: true
          , bridgeLoadingTimedOut: false
          , isFormValid: true
          , hasSaved: false
        };

        this.handleReset = this.handleReset.bind(this);
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.handleFormChange = this.handleFormChange.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleWhitelistChange = this.handleWhitelistChange.bind(this);

        this.handleReceiverSelectorTypeChange =
                this.handleReceiverSelectorTypeChange.bind(this);

        this.getWhitelistItemPatternError =
                this.getWhitelistItemPatternError.bind(this);
    }

    public async componentDidMount () {
        this.setState({
            hasLoaded: true
          , options: await options.getAll()
          , platform: (await browser.runtime.getPlatformInfo()).os
        });

        try {
            const bridgeInfo = await bridge.getInfo();

            this.setState({
                bridgeInfo
              , bridgeLoading: false
            });
        } catch (err) {
            logger.error("Failed to fetch bridge/platform info.");

            if (err instanceof BridgeTimedOutError) {
                this.setState({
                    bridgeLoading: false
                  , bridgeLoadingTimedOut: true
                });
            } else {
                this.setState({
                    bridgeLoading: false
                });
            }
        }
    }

    public render () {
        if (!this.state.hasLoaded) {
            return;
        }

        return (
            <div>
                <About />
                <form id="form" ref={ form => { this.form = form; }}
                        onSubmit={ this.handleFormSubmit }
                        onChange={ this.handleFormChange }>

                    <Bridge info={ this.state.bridgeInfo }
                            loading={ this.state.bridgeLoading }
                            loadingTimedOut={ this.state.bridgeLoadingTimedOut }
                            options={ this.state.options }
                            onChange={ this.handleInputChange } />

                    <fieldset className="category">
                        <legend className="category__name">
                            <h2>{ _("optionsMediaCategoryName") }</h2>
                        </legend>
                        <p className="category__description">
                            { _("optionsMediaCategoryDescription") }
                        </p>

                        <label className="option option--inline">
                            <div className="option__control">
                                <input name="mediaEnabled"
                                       type="checkbox"
                                       checked={ this.state.options?.mediaEnabled }
                                       onChange={ this.handleInputChange } />
                            </div>
                            <div className="option__label">
                                { _("optionsMediaEnabled") }
                            </div>
                        </label>

                        <label className="option option--inline">
                            <div className="option__control">
                                <input name="mediaSyncElement"
                                       type="checkbox"
                                       checked={ this.state.options?.mediaSyncElement }
                                       onChange={ this.handleInputChange } />
                            </div>
                            <div className="option__label">
                                { _("optionsMediaSyncElement") }
                            </div>
                            <div className="option__description">
                                { _("optionsMediaSyncElementDescription") }
                            </div>
                        </label>

                        <label className="option option--inline">
                            <div className="option__control">
                                <input name="mediaStopOnUnload"
                                       type="checkbox"
                                       checked={ this.state.options?.mediaStopOnUnload }
                                       onChange={ this.handleInputChange } />
                            </div>
                            <div className="option__label">
                                { _("optionsMediaStopOnUnload") }
                            </div>
                        </label>

                        <label className="option option--inline">
                            <div className="option__control">
                                <input name="mediaOverlayEnabled"
                                       type="checkbox"
                                       checked={ this.state.options?.mediaOverlayEnabled }
                                       onChange={ this.handleInputChange } />
                            </div>
                            <div className="option__label">
                                { _("optionsMediaOverlayEnabledTemp") }
                            </div>
                            <div className="option__description">
                                { _("optionsMediaOverlayEnabledDescription") }
                            </div>
                        </label>

                        <hr />

                        <label className="option option--inline">
                            <div className="option__control">
                                <input name="localMediaEnabled"
                                       type="checkbox"
                                       checked={ this.state.options?.localMediaEnabled }
                                       onChange={ this.handleInputChange } />
                            </div>
                            <div className="option__label">
                                { _("optionsLocalMediaEnabled") }
                            </div>
                            <div className="option__description">
                                { _("optionsLocalMediaCategoryDescription") }
                            </div>
                        </label>

                        <label className="option">
                            <div className="option__label">
                                { _("optionsLocalMediaServerPort") }
                            </div>
                            <div className="option__control">
                                <input name="localMediaServerPort"
                                       type="number"
                                       required
                                       min="1025"
                                       max="65535"
                                       value={ this.state.options?.localMediaServerPort }
                                       onChange={ this.handleInputChange } />
                            </div>
                        </label>
                    </fieldset>

                    <fieldset className="category">
                        <legend className="category__name">
                            <h2>{ _("optionsMirroringCategoryName") }</h2>
                        </legend>
                        <p className="category__description">
                            { _("optionsMirroringCategoryDescription") }
                        </p>

                        <label className="option option--inline">
                            <div className="option__control">
                                <input name="mirroringEnabled"
                                       type="checkbox"
                                       checked={ this.state.options?.mirroringEnabled }
                                       onChange={ this.handleInputChange } />
                            </div>
                            <div className="option__label">
                                { _("optionsMirroringEnabled") }
                            </div>
                        </label>

                        <label className="option">
                            <div className="option__label">
                                { _("optionsMirroringAppId") }
                            </div>
                            <div className="option__control">
                                <input name="mirroringAppId"
                                       type="text"
                                       required
                                       value={ this.state.options?.mirroringAppId }
                                       onChange={ this.handleInputChange } />
                                <div className="option__description">
                                    { _("optionsMirroringAppIdDescription") }
                                </div>
                            </div>
                        </label>
                    </fieldset>

                    <fieldset className="category">
                        <legend className="category__name">
                            <h2>{ _("optionsReceiverSelectorCategoryName") }</h2>
                        </legend>
                        <p className="category__description">
                            { _("optionsReceiverSelectorCategoryDescription") }
                        </p>

                        { this.state.platform === "mac" &&
                            <label className="option">
                                <div className="option__label">
                                    { _("optionsReceiverSelectorType") }
                                </div>
                                <div className="option__control">
                                    <div className="select-wrapper">
                                        <select name="receiverSelectorType"
                                                value={ this.state.options?.receiverSelectorType }
                                                onChange={ this.handleReceiverSelectorTypeChange }>
                                            <option value={ ReceiverSelectorType.Popup }>
                                                { _("optionsReceiverSelectorTypeBrowser") }
                                            </option>
                                            <option value={ ReceiverSelectorType.Native }>
                                                { _("optionsReceiverSelectorTypeNative") }
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            </label> }

                        <label className="option option--inline">
                            <div className="option__control">
                                <input name="receiverSelectorWaitForConnection"
                                       type="checkbox"
                                       checked={ this.state.options?.receiverSelectorWaitForConnection }
                                       onChange={ this.handleInputChange } />
                            </div>
                            <div className="option__label">
                                { _("optionsReceiverSelectorWaitForConnection") }
                            </div>
                            <div className="option__description">
                                { _("optionsReceiverSelectorWaitForConnectionDescription") }
                            </div>
                        </label>

                        <label className="option option--inline">
                            <div className="option__control">
                                <input name="receiverSelectorCloseIfFocusLost"
                                       type="checkbox"
                                       checked={ this.state.options?.receiverSelectorCloseIfFocusLost }
                                       onChange={ this.handleInputChange } />
                            </div>
                            <div className="option__label">
                                { _("optionsReceiverSelectorCloseIfFocusLost") }
                            </div>
                        </label>
                    </fieldset>

                    <fieldset className="category">
                        <legend className="category__name">
                            <h2>{ _("optionsUserAgentWhitelistCategoryName") }</h2>
                        </legend>
                        <p className="category__description">
                            { _("optionsUserAgentWhitelistCategoryDescription") }
                        </p>

                        <label className="option option--inline">
                            <div className="option__control">
                                <input name="userAgentWhitelistEnabled"
                                       type="checkbox"
                                       checked={ this.state.options?.userAgentWhitelistEnabled }
                                       onChange={ this.handleInputChange } />
                            </div>
                            <div className="option__label">
                                { _("optionsUserAgentWhitelistEnabled") }
                                <span className="option__recommended">
                                    { _("optionsOptionRecommended") }
                                </span>
                            </div>
                        </label>

                        <label className="option option--inline">
                            <div className="option__control">
                                <input name="userAgentWhitelistRestrictedEnabled"
                                       type="checkbox"
                                       checked={ this.state.options?.userAgentWhitelistRestrictedEnabled }
                                       onChange={ this.handleInputChange } />
                            </div>
                            <div className="option__label">
                                { _("optionsUserAgentWhitelistRestrictedEnabled") }
                                <span className="option__recommended">
                                    { _("optionsOptionRecommended") }
                                </span>
                            </div>
                            <div className="option__description">
                                { _("optionsUserAgentWhitelistRestrictedEnabledDescription") }
                            </div>
                        </label>

                        <div className="option">
                            <div className="option__label">
                                { _("optionsUserAgentWhitelistContent") }
                            </div>
                            <div className="option__control">
                                { this.state.options?.userAgentWhitelist &&
                                    <EditableList data={ this.state.options.userAgentWhitelist }
                                                  onChange={ this.handleWhitelistChange }
                                                  itemPattern={ REMOTE_MATCH_PATTERN_REGEX }
                                                  itemPatternError={ this.getWhitelistItemPatternError } /> }
                            </div>
                        </div>
                    </fieldset>

                    <div id="buttons">
                        <div id="status-line">
                            { this.state.hasSaved && _("optionsSaved") }
                        </div>
                        <button onClick={ this.handleReset }
                                type="button">
                            { _("optionsReset") }
                        </button>
                        <button type="submit"
                                default
                                disabled={ !this.state.isFormValid }>
                            { _("optionsSave") }
                        </button>
                    </div>
                </form>
            </div>
        );
    }


    private handleReset () {
        this.setState({
            options: { ...defaultOptions }
        });
    }

    private async handleFormSubmit (ev: React.FormEvent<HTMLFormElement>) {
        ev.preventDefault();

        this.form?.reportValidity();

        try {
            if (this.state.options) {
                await options.setAll(this.state.options);

                this.setState({
                    hasSaved: true
                }, () => {
                    window.setTimeout(() => {
                        this.setState({
                            hasSaved: false
                        });
                    }, 1000);
                });
            }
        } catch (err) {
            logger.error("Failed to save options");
        }
    }

    private handleFormChange (ev: React.FormEvent<HTMLFormElement>) {
        ev.preventDefault();

        const isFormValid = this.form?.checkValidity();
        if (isFormValid !== undefined) {
            this.setState({
                isFormValid
            });
        }
    }

    private handleInputChange (ev: React.ChangeEvent<HTMLInputElement>) {
        this.setState(currentState => {
            if (currentState.options) {
                currentState.options[ev.target.name] = getInputValue(ev.target);
            }

            return currentState;
        });
    }

    private handleReceiverSelectorTypeChange (
            ev: React.ChangeEvent<HTMLSelectElement>) {

        this.setState(currentState => {
            if (currentState.options) {
                currentState.options[ev.target.name] = parseInt(ev.target.value);
            }

            return currentState;
        });
    }

    private handleWhitelistChange (whitelist: string[]) {
        this.setState(currentState => {
            if (currentState.options) {
                currentState.options.userAgentWhitelist = whitelist;
            }

            return currentState;
        });
    }

    private getWhitelistItemPatternError (info: string): string {
        return _("optionsUserAgentWhitelistInvalidMatchPattern", info);
    }
}


ReactDOM.render(
    <OptionsApp />
  , document.querySelector("#root"));
