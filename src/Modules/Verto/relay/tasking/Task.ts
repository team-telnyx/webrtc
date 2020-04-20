import { request } from 'https'

export default class Task {

  public host: string = 'relay.signalwire.com'

  constructor(public project: string, public token: string) {
    if (!project || !token) {
      throw new Error('Invalid options: project and token required!')
    }
  }

  deliver(context: string, message: any) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({ context, message })
      const options = {
        host: this.host,
        port: 443,
        method: 'POST',
        path: '/api/relay/rest/tasks',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.project}:${this.token}`).toString('base64'),
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      }
      const req = request(options, ({ statusCode }) => {
        statusCode === 204 ? resolve() : reject()
      })

      req.on('error', reject)

      req.write(data)
      req.end()
    })
  }
}
