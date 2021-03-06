// Copyright 2015-2017 Parity Technologies (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

import React, { Component, PropTypes } from 'react';
import { FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';
import { observer } from 'mobx-react';
import { pick } from 'lodash';

import { BusyStep, AddressSelect, Button, Form, TypedInput, Input, InputAddress, Portal, TxHash } from '~/ui';
import { CancelIcon, DoneIcon, NextIcon } from '~/ui/Icons';
import { fromWei } from '~/api/util/wei';

import WalletSettingsStore from './walletSettingsStore.js';
import styles from './walletSettings.css';

@observer
class WalletSettings extends Component {
  static contextTypes = {
    api: PropTypes.object.isRequired
  };

  static propTypes = {
    accountsInfo: PropTypes.object.isRequired,
    wallet: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    senders: PropTypes.object.isRequired
  };

  store = new WalletSettingsStore(this.context.api, this.props.wallet);

  render () {
    const { stage, steps, waiting, rejected } = this.store;

    if (rejected) {
      return (
        <Portal
          onClose={ this.onClose }
          open
          title={
            <FormattedMessage
              id='walletSettings.rejected.title'
              defaultMessage='rejected'
            />
          }
          actions={ this.renderDialogActions() }
        >
          <BusyStep
            title={
              <FormattedMessage
                id='walletSettings.rejected.busyStep.title'
                defaultMessage='The modifications have been rejected'
              />
            }
            state={
              <FormattedMessage
                id='walletSettings.rejected.busyStep.state'
                defaultMessage='The wallet settings will not be modified. You can safely close this window.'
              />
            }
          />
        </Portal>
      );
    }

    return (
      <Portal
        activeStep={ stage }
        busySteps={ waiting }
        buttons={ this.renderDialogActions() }
        onClose={ this.onClose }
        open
        steps={ steps.map((step) => step.title) }
      >
        { this.renderPage() }
      </Portal>
    );
  }

  renderPage () {
    const { step } = this.store;

    switch (step) {
      case 'SENDING':
        return (
          <BusyStep
            title='The modifications are currently being sent'
            state={ this.store.deployState }
          >
            {
              this.store.requests.map((req) => {
                const key = req.id;

                if (req.txhash) {
                  return (
                    <TxHash
                      key={ key }
                      hash={ req.txhash }
                    />
                  );
                }

                if (req.rejected) {
                  return (
                    <p key={ key }>
                      <FormattedMessage
                        id='walletSettings.rejected'
                        defaultMessage='The transaction #{txid} has been rejected'
                        values={ {
                          txid: parseInt(key, 16)
                        } }
                      />
                    </p>
                  );
                }
              })
            }
          </BusyStep>
        );

      case 'CONFIRMATION':
        const { changes } = this.store;

        return (
          <div>
            { this.renderChanges(changes) }
          </div>
        );

      default:
      case 'EDIT':
        const { errors, fromString, wallet } = this.store;
        const { accountsInfo, senders } = this.props;

        return (
          <Form>
            <p>
              <FormattedMessage
                id='walletSettings.edit.message'
                defaultMessage={
                  `In order to edit this contract's settings, at
                  least { owners, number } { owners, plural,
                    one { owner }
                    other { owners }
                  } have to
                  send the very same modifications. You can paste a stringified version
                  of the modifications here.`
                }
                values={ {
                  owners: this.store.initialWallet.require.toNumber()
                } }
              />
            </p>

            <Input
              hint='[ ... ]'
              label={
                <FormattedMessage
                  id='walletSettings.modifications.fromString.label'
                  defaultMessage='modifications'
                />
              }
              onChange={ this.store.onModificationsStringChange }
            />

            <AddressSelect
              label={
                <FormattedMessage
                  id='walletSettings.modifications.sender.label'
                  defaultMessage='from account (wallet owner)'
                />
              }
              hint={
                <FormattedMessage
                  id='walletSettings.modifications.sender.hint'
                  defaultMessage='send modifications as this owner'
                />
              }
              value={ wallet.sender }
              error={ errors.sender }
              onChange={ this.store.onSenderChange }
              accounts={ senders }
            />

            <br />

            {
              fromString
                ? null
                : (
                  <div>
                    <TypedInput
                      label={
                        <FormattedMessage
                          id='walletSettings.modifications.owners.label'
                          defaultMessage='other wallet owners'
                        />
                      }
                      value={ wallet.owners.slice() }
                      onChange={ this.store.onOwnersChange }
                      accounts={ accountsInfo }
                      param='address[]'
                    />

                    <div className={ styles.splitInput }>
                      <TypedInput
                        label={
                          <FormattedMessage
                            id='walletSettings.modifications.required.label'
                            defaultMessage='required owners'
                          />
                        }
                        hint={
                          <FormattedMessage
                            id='walletSettings.modifications.required.hint'
                            defaultMessage='number of required owners to accept a transaction'
                          />
                        }
                        error={ errors.require }
                        min={ 1 }
                        onChange={ this.store.onRequireChange }
                        max={ wallet.owners.length }
                        param='uint'
                        value={ wallet.require }
                      />

                      <TypedInput
                        label={
                          <FormattedMessage
                            id='walletSettings.modifications.daylimit.label'
                            defaultMessage='wallet day limit'
                          />
                        }
                        hint={
                          <FormattedMessage
                            id='walletSettings.modifications.daylimit.hint'
                            defaultMessage='amount of ETH spendable without confirmations'
                          />
                        }
                        value={ wallet.dailylimit }
                        error={ errors.dailylimit }
                        onChange={ this.store.onDailylimitChange }
                        param='uint'
                        isEth
                      />
                    </div>
                  </div>
                )
            }
          </Form>
        );
    }
  }

  renderChanges (changes) {
    if (changes.length === 0) {
      return (
        <p>
          <FormattedMessage
            id='walletSettings.changes.none'
            defaultMessage='No modifications have been made to the Wallet settings.'
          />
        </p>
      );
    }

    const modifications = changes.map((change, index) => (
      <div key={ `${change.type}_${index}` }>
        { this.renderChange(change) }
      </div>
    ));

    return (
      <div>
        <p className={ styles.modifications }>
          <FormattedMessage
            id='walletSettings.changes.modificationString'
            defaultMessage={
              `For your modifications to be taken into account,
              other owners have to send the same modifications. They can paste
              this string to make it easier:`
            }
          />
        </p>
        <Input
          allowCopy
          label='modifications'
          readOnly
          value={ this.store.changesToString() }
        />

        <p>
          <FormattedMessage
            id='walletSettings.changes.overview'
            defaultMessage='You are about to make the following modifications'
          />
        </p>
        { modifications }
      </div>
    );
  }

  renderChange (change) {
    const { accountsInfo } = this.props;

    switch (change.type) {
      case 'dailylimit':
        return (
          <div className={ styles.change }>
            <div className={ styles.label }>Change Daily Limit</div>
            <div>
              <span> from </span>
              <code> { fromWei(change.initial).toFormat() }</code>
              <span className={ styles.eth } />
              <span> to </span>
              <code> { fromWei(change.value).toFormat() }</code>
              <span className={ styles.eth } />
            </div>
          </div>
        );

      case 'require':
        return (
          <div className={ styles.change }>
            <div className={ styles.label }>
              <FormattedMessage
                id='walletSettings.ownersChange.title'
                defaultMessage='Change Required Owners'
              />
            </div>
            <div>
              <FormattedMessage
                id='walletSettings.ownersChange.details'
                defaultMessage=' from {from} to {to} '
                values={ {
                  from: <code>change.initial.toNumber()</code>,
                  to: <code>change.value.toNumber()</code>
                } }
              />
            </div>
          </div>
        );

      case 'add_owner':
        return (
          <div className={ [ styles.change, styles.add ].join(' ') }>
            <div className={ styles.label }>
              <FormattedMessage
                id='walletSettings.addOwner.title'
                defaultMessage='Add Owner'
              />
            </div>
            <div>
              <InputAddress
                disabled
                value={ change.value }
                accounts={ accountsInfo }
              />
            </div>
          </div>
        );

      case 'remove_owner':
        return (
          <div className={ [ styles.change, styles.remove ].join(' ') }>
            <div className={ styles.label }>
              <FormattedMessage
                id='walletSettings.removeOwner.title'
                defaultMessage='Remove Owner'
              />
            </div>
            <div>
              <InputAddress
                disabled
                value={ change.value }
                accounts={ accountsInfo }
              />
            </div>
          </div>
        );
    }
  }

  renderDialogActions () {
    const { step, hasErrors, rejected, onNext, send, done } = this.store;

    const cancelBtn = (
      <Button
        icon={ <CancelIcon /> }
        label={
          <FormattedMessage
            id='walletSettings.buttons.cancel'
            defaultMessage='Cancel'
          />
        }
        onClick={ this.onClose }
      />
    );

    const closeBtn = (
      <Button
        icon={ <CancelIcon /> }
        label={
          <FormattedMessage
            id='walletSettings.buttons.close'
            defaultMessage='Close'
          />
        }
        onClick={ this.onClose }
      />
    );

    const sendingBtn = (
      <Button
        icon={ <DoneIcon /> }
        label={
          <FormattedMessage
            id='walletSettings.buttons.sending'
            defaultMessage='Sending...'
          />
        }
        disabled
      />
    );

    const nextBtn = (
      <Button
        icon={ <NextIcon /> }
        label={
          <FormattedMessage
            id='walletSettings.buttons.next'
            defaultMessage='Next'
          />
        }
        onClick={ onNext }
        disabled={ hasErrors }
      />
    );

    const sendBtn = (
      <Button
        icon={ <NextIcon /> }
        label={
          <FormattedMessage
            id='walletSettings.buttons.send'
            defaultMessage='Send'
          />
        }
        onClick={ send }
        disabled={ hasErrors }
      />
    );

    if (rejected) {
      return [ closeBtn ];
    }

    switch (step) {
      case 'SENDING':
        return done
          ? [ closeBtn ]
          : [ closeBtn, sendingBtn ];

      case 'CONFIRMATION':
        const { changes } = this.store;

        if (changes.length === 0) {
          return [ closeBtn ];
        }

        return [ cancelBtn, sendBtn ];

      default:
      case 'TYPE':
        return [ cancelBtn, nextBtn ];
    }
  }

  onClose = () => {
    this.props.onClose();
  }
}

function mapStateToProps (initState, initProps) {
  const { accountsInfo, accounts } = initState.personal;
  const { owners } = initProps.wallet;

  const senders = pick(accounts, owners);

  return () => {
    return { accountsInfo, senders };
  };
}

export default connect(
  mapStateToProps,
  null
)(WalletSettings);
