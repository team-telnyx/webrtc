import React, { Component } from 'react'
import Dialpad from './Dialpad';
import Dialog from './Dialog';
import './Phone.css'

export default class Phone extends Component {
  render() {
    const { dialog } = this.props
    if (dialog) {
      return <Dialog dialog={dialog} />
    } else {
      return <Dialpad newCall={this.props.newCall} />
    }
  }
}
