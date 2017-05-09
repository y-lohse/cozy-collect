import React, { Component } from 'react'

import Loading from '../components/Loading'
import ServiceBar from '../components/services/ServiceBar'
import CreateAccountService from '../components/services/CreateAccountService'

export default class IntentService extends Component {
  constructor (props, context) {
    super(props, context)
    this.store = context.store

    const {window} = props

    this.state = {
      isFetching: true
    }

    // Maybe the logic about getting the intent from location.search should be
    // encapsulated in cozy.client.createService
    const intent = window.location.search.split('=')[1]

    this.store.createIntentService(intent, window)
      .then(service => {
        this.setState({
          service: service
        })

        const data = service.getData()

        if (!data || !data.slug) {
          throw new Error('Unexpected data from intent')
        }

        return this.store.fetchKonnectorInfos(data.slug)
      })
      .then(konnector => {
        if (!konnector) {
          throw new Error(`Unknown konnector`)
        }

        this.setState({
          isFetching: false,
          konnector: konnector
        })

        return konnector
      })
      .catch(error => {
        this.setState({
          isFetching: false,
          error: {
            message: 'intent.service.initialization.error',
            reason: error.message
          }
        })
      })
  }

  createAccount (auth, baseFolder) {
    const { konnector } = this.state
    const account = {auth: auth}

    return this.store.connectAccount(konnector, account, baseFolder)
      .then(connection => this.terminate(connection.account))
      .catch(error => {
        this.setState({
          error: {
            message: 'intent.service.account.creation.error',
            reason: error.message
          }
        })

        throw error
      })
  }

  terminate (account) {
    const { service } = this.state
    service.terminate(account)
  }

  cancel () {
    const { service } = this.state

    service.cancel
      ? service.cancel()
        : service.terminate(null)
  }

  render () {
    const { data } = this.props
    const { isFetching, error, konnector } = this.state
    const { t } = this.context
    return (
      <div className='coz-service'>
        { isFetching &&
          <div className='coz-service-loading'>
            <Loading />
          </div> }
        { error && <div className='coz-error coz-service-error'>
          <p>{t(error.message)}</p>
          <p>{t('intent.service.error.cause', {error: error.reason})}</p>
        </div>}
        { !isFetching && !error && konnector &&
          <div className='coz-service-layout'>
            <ServiceBar
              appEditor={data.cozyAppEditor}
              appName={data.cozyAppName}
              iconPath={`../${data.cozyIconPath}`}
              onCancel={() => this.cancel()}
              {...this.context}
             />
            <CreateAccountService
              konnector={konnector}
              onCancel={() => this.cancel()}
              onSubmit={auth => this.createAccount(auth, t('konnector default base folder'))}
              {...this.context}
              />
          </div>}
      </div>)
  }
}
