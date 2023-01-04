import {isPlainObject} from 'is-plain-object'

const serializeTypes = ['boolean', 'string', 'number']
const isBuffer = (obj: any) =>
  !!obj.constructor &&
  typeof obj.constructor.isBuffer === 'function' &&
  obj.constructor.isBuffer(obj)

/** @public */
export function jsonRequest() {
  return {
    processOptions: (options: any) => {
      const body = options.body
      if (!body) {
        return options
      }

      const isStream = typeof body.pipe === 'function'
      const shouldSerialize =
        !isStream &&
        !isBuffer(body) &&
        (serializeTypes.indexOf(typeof body) !== -1 || Array.isArray(body) || isPlainObject(body))

      if (!shouldSerialize) {
        return options
      }

      return Object.assign({}, options, {
        body: JSON.stringify(options.body),
        headers: Object.assign({}, options.headers, {
          'Content-Type': 'application/json',
        }),
      })
    },
  }
}