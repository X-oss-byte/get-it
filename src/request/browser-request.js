/* eslint max-depth: ["error", 4] */
const win = require('global/window')
const sameOrigin = require('same-origin')
const parseHeaders = require('parse-headers')
const noop = function () { /* intentional noop */ }

const XmlHttpRequest = win.XMLHttpRequest || noop
const hasXhr2 = 'withCredentials' in (new XmlHttpRequest())
const XDomainRequest = hasXhr2 ? XmlHttpRequest : win.XDomainRequest

module.exports = (context, callback) => {
  const options = context.options
  const cors = !sameOrigin(win.location.href, options.url)
  const xhr = cors ? new XDomainRequest() : new XmlHttpRequest()
  const isXdr = win.XDomainRequest && xhr instanceof win.XDomainRequest
  const headers = options.headers

  // Let middleware know we're about to do a request
  context.applyMiddleware('onRequest', options)

  // Request state
  let aborted = false
  let loaded = false

  // Apply event handlers
  xhr.onerror = onError
  xhr.ontimeout = onError
  xhr.onabort = () => {
    aborted = true
  }

  // IE9 must have onprogress be set to a unique function
  xhr.onprogress = () => { /* intentional noop */ }

  xhr.onload = onLoad
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      onLoad()
    }
  }

  // @todo two last options to open() is username/password
  xhr.open(
    options.method,
    options.url,
    true // Always async
  )

  // Some options need to be applied after open
  xhr.withCredentials = !!options.withCredentials

  // Set headers
  if (headers && xhr.setRequestHeader) {
    for (const key in headers) {
      if (headers.hasOwnProperty(key)) {
        xhr.setRequestHeader(key, headers[key])
      }
    }
  } else if (headers && isXdr) {
    throw new Error('Headers cannot be set on an XDomainRequest object')
  }

  if (options.rawBody) {
    xhr.responseType = 'arraybuffer'
  }

  xhr.send(options.body || null)

  function onError(err) {
    callback(err instanceof Error ? err : new Error(`${err || 'Unknown XMLHttpRequest error'}`))
  }

  function reduceResponse() {
    let statusCode = xhr.status
    let statusMessage = xhr.statusText

    if (isXdr && statusCode === undefined) {
      // IE8 CORS GET successful response doesn't have a status field, but body is fine
      statusCode = 200
    } else {
      // Another IE bug where HTTP 204 somehow ends up as 1223
      statusCode = xhr.status === 1223 ? 204 : xhr.status
      statusMessage = xhr.status === 1223 ? 'No Content' : statusMessage
    }

    return {
      body: xhr.response || xhr.responseText,
      url: options.url,
      method: options.method,
      headers: isXdr ? {} : parseHeaders(xhr.getAllResponseHeaders()),
      statusCode: statusCode,
      statusMessage: statusMessage
    }
  }

  function onLoad() {
    if (aborted || loaded) {
      return
    }

    // Prevent being called twice
    loaded = true

    const err = xhr.status === 0 && new Error('Unknown XHR error')
    const res = !err && reduceResponse()
    callback(err, res)
  }
}
