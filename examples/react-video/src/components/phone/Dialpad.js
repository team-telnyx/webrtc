import React, { Component } from 'react'
import './Dialpad.css'

export default class Dialpad extends Component {

  constructor(props) {
    super(props)
    this.state = { extension: '' }
    this._newCall = this._newCall.bind(this)
    this._handleChange = this._handleChange.bind(this)
  }

  _newCall() {
    this.props.newCall(this.state.extension)
  }

  _handleChange(event) {
    this.setState({ extension: event.target.value })
  }

  render() {
    return (
      <div className="dialpad flex flex-column">
        <label>Number:</label>
        <input type="text" value={this.state.extension} onChange={this._handleChange} />
        <button onClick={this._newCall}>Call</button>
      </div>
    )
  }
}
