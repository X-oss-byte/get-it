const {jsonResponse} = require('../src/middleware')
const requester = require('../src/index')
const {
  expectRequest,
  expectRequestBody,
  expect,
  testNonIE9,
  testNode,
  debugRequest,
  baseUrl,
  baseUrlPrefix,
  isNode
} = require('./helpers')

describe('basics', function () {
  this.timeout(15000)

  it('should be able to request a basic, plain-text file', () => {
    const body = 'Just some plain text for you to consume'
    const request = requester([baseUrl, debugRequest])
    const req = request({url: '/plain-text'})

    return expectRequest(req).to.eventually.have.property('body', body)
  })

  testNode('should be able to post a Buffer as body in node', () => {
    const request = requester([baseUrl, debugRequest])
    const req = request({url: '/echo', body: Buffer.from('Foo bar', 'utf8')})
    return expectRequestBody(req).to.eventually.eql('Foo bar')
  })

  testNode('should throw when trying to post invalid stuff', () => {
    const request = requester([baseUrl, debugRequest])
    expect(() => {
      request({url: '/echo', method: 'post', body: {}})
    }).to.throw(/string or buffer/)
  })

  testNonIE9('should be able to get a raw, unparsed body back', isNode ? () => {
    // Node.js (buffer)
    const request = requester([baseUrl, debugRequest])
    const req = request({url: '/plain-text', rawBody: true})
    return expectRequestBody(req).to.eventually.be.an.instanceOf(Buffer)
      .and.deep.equal(Buffer.from('Just some plain text for you to consume', 'utf8'))
  } : () => {
    // Browser (ArrayBuffer)
    const request = requester([baseUrl, debugRequest])
    const req = request({url: '/plain-text', rawBody: true})
    return expectRequestBody(req).to.eventually.be.an.instanceOf(ArrayBuffer)
  })

  it('should unzip gziped responses', () => {
    const request = requester([baseUrl, jsonResponse, debugRequest])
    const req = request({url: '/gzip'})
    return expectRequestBody(req).to.eventually.deep.equal(['harder', 'better', 'faster', 'stronger'])
  })

  it('should not return a body on HEAD-requests', () => {
    const request = requester([baseUrl, jsonResponse])
    const req = request({url: '/gzip', method: 'HEAD'})
    return expectRequest(req).to.eventually.containSubset({
      statusCode: 200,
      method: 'HEAD'
    })
  })

  it('should be able to send PUT-requests with raw bodies', () => {
    const request = requester([baseUrl, jsonResponse, debugRequest])
    const req = request({url: '/debug', method: 'PUT', body: 'just a plain body'})
    return expectRequestBody(req).to.eventually.containSubset({
      method: 'PUT',
      body: 'just a plain body'
    })
  })

  // IE9 fails on cross-origin requests from http to https
  testNonIE9('should handle https without issues', () => {
    const request = requester()
    const req = request({url: 'https://httpbin.org/robots.txt'})
    return expectRequest(req).to.eventually.have.property('body')
      .and.include('/deny')
  })

  it('should handle cross-origin requests without issues', () => {
    const request = requester()
    const req = request({url: `http://httpbin.org/robots.txt?cb=${Date.now()}`})
    return expectRequest(req).to.eventually.have.property('body').and.include('/deny')
  })

  it('should not allow base middleware to add prefix on absolute urls', () => {
    const request = requester([baseUrl, jsonResponse])
    const req = request({url: `${baseUrlPrefix}/debug`})
    return expectRequestBody(req).to.eventually.have.property('url', '/req-test/debug')
  })

  /**
   * Cases to test:
   *  - Timeouts
   *  - Cancel
   *  - Auth
   **/
})