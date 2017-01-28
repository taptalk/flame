'use strict'

module.exports = new class {
    constructor() {
        this.setupGeneratePushId()
    }

    // Database loading

    loadJSON(json) {
        const node = JSON.parse(json)
        this.loadDatabase(node)
    }

    loadDatabase(node) {
        this.database = node
    }

    // Operations

    get(path, query) {
        for (let key in query) {
            if (['orderBy', 'startAt', 'limitToFirst', 'limitToLast', 'shallow', 'equalTo'].indexOf(key) < 0) {
                throw new Error(`unknown query option ${key}=${query[key]}`)
            }
        }
        let node = this.nodeAtPath(path)
        if (node === undefined || node === null) {
            return null
        }
        if (typeof node !== 'object') {
            return node
        }
        if (Object.keys(node).length === 0) {
            return null
        }
        query = query || { orderBy: '$key' }
        let order = query.orderBy
        let start = query.startAt
        if (typeof start === 'string' && start.startsWith('"')) {
            start = start.substring(1, start.length - 1)
        }
        if (typeof order === 'string' && order.startsWith('"')) {
            order = order.substring(1, order.length - 1)
        }
        if (order === '$key') {
            start = this.intForValue(start)
        }
        const reverse = query.limitToLast !== undefined
        const limit = reverse ? query.limitToLast : query.limitToFirst
        let result = this.queryNode(node, order, start, limit, reverse, query.equalTo)
        const array = this.arrayFromNode(result)
        if (array) {
            result = array
        }
        if (query.shallow) {
            result = this.shallowFromNode(result)
        }
        return result
    }

    patch(path, value) {
        let node = this.nodeAtPath(path, 0, true)
        if (typeof node !== 'object') {
            return this.put(path, value)
        }
        for (let key in value) {
            const v = value[key]
            this.setValueOnNode(node, key, v)
        }
        return value
    }

    put(path, value) {
        let node = this.nodeAtPath(path, 1, true)
        let name = this.tailForPath(path, 1)[0]
        this.setValueOnNode(node, name, value)
        return value
    }

    post(path, value) {
        let node = this.nodeAtPath(path, 0, true)
        let name = this.generatePushID(Date.now())
        this.setValueOnNode(node, name, value)
        return { name }
    }

    delete(path) {
        let node = this.nodeAtPath(path, 1, true)
        let tail = this.tailForPath(path, 1)[0]
        this.setValueOnNode(node, tail, null)
        return null
    }

    // Path parsing

    keysForPath(path) {
        let keys = path.split('/')
        if (keys.length > 0 && keys[0] === '') {
            keys = keys.splice(1)
        }
        return keys
    }

    headForPath(path, offset) {
        let keys = this.keysForPath(path)
        if (offset) {
            keys = keys.splice(0, keys.length - offset)
        }
        return keys
    }

    tailForPath(path, offset) {
        let keys = this.keysForPath(path)
        if (offset) {
            keys = keys.splice(keys.length - offset)
        }
        return keys
    }

    // Tree traversal

    childForNode(node, keys, modify) {
        for (let i in keys) {
            const key = keys[i]
            let child = node[key]
            if (child === undefined || child === null) {
                child = {}
            }
            if (modify) {
                child = this.copyNode(child)
                node[key] = child
            }
            node = child
        }
        return node
    }

    childAt(keys, modify) {
        let node = this.database
        if (modify) {
            node = this.copyNode(node)
            this.database = node
        }
        const child = this.childForNode(node, keys, modify)
        return child
    }

    nodeAtPath(path, offset, modify) {
        const keys = this.headForPath(path, offset)
        const child = this.childAt(keys, modify)
        return child
    }

    setValueOnNode(node, key, value) {
        if (value !== null && value !== undefined) {
            node[key] = value
        } else if (node[key] !== undefined) {
            delete node[key]
        }
    }

    // Node manipulation

    copyNode(node) {
        const result = Array.isArray(node) ? [] : {}
        for (let key in node) {
            result[key] = node[key]
        }
        return result
    }

    reverseNode(node) {
        let reversed = {}
        let keys = Object.keys(node).reverse()
        for (let i in keys) {
            const key = keys[i]
            reversed[key] = node[key]
        }
        return reversed
    }

    arrayFromNode(node) {
        let i = 0
        const array = []
        for (let key in node) {
            if (('' + i) !== key) {
                return null
            }
            array[i] = node[key]
            i += 1
        }
        return array
    }

    shallowFromNode(node) {
        let shallow = Array.isArray(node) ? [] : {}
        for (let key in node) {
            shallow[key] = true
        }
        return shallow
    }

    // Querying

    queryNode(node, order, start, limit, reverse, equal) {
        let keys = this.sortedKeys(node, order, reverse)
        let result = {}
        let j = 0
        for (let i in keys) {
            const key = keys[i]
            const value = this.valueFor(node, order, key)
            if ((start === undefined || start <= value) && (equal === undefined || value === equal)) {
                this.setValueOnNode(result, key, node[key])
                j += 1
            }
            if (limit !== undefined && j >= limit) {
                break
            }
        }
        if (reverse) {
            result = this.reverseNode(result)
        }
        return result
    }

    sortedKeys(node, order, reverse) {
        if (!order) {
            throw new Error('expecting orderBy in query')
        }
        if (order === '$key') {
            return Object.keys(node).map(value => this.intForValue(value))
                .sort((a, b) => this.compareValues(a, b, reverse))
        }
        if (order === '$value') {
            return Object.keys(node).sort((a, b) => this.compareValues(node[a] || '', node[b] || '', reverse))
        }
        return Object.keys(node).sort((a, b) => this.compareValues((node[a] || {})[order] || '', (node[b] || {})[order] || '', reverse))
    }

    valueFor(node, order, key) {
        if (order === '$key') {
            return key
        }
        if (order === '$value') {
            return node[key]
        }
        return node[key][order]
    }

    // Ordering

    compareValues(a, b, reverse) {
        if (a < b) {
            return reverse ? 1 : -1
        }
        if (a > b) {
            return reverse ? -1 : 1
        }
        return 0
    }

    intForValue(value) {
        return value && typeof value === 'string' && value.match(/^[0-9]+$/) ? +value : value
    }

    // Firebase key generation

    // https://gist.github.com/mikelehen/3596a30bd69384624c11
    setupGeneratePushId() {
        /**
         * Fancy ID generator that creates 20-character string identifiers with the following properties:
         *
         * 1. They're based on timestamp so that they sort *after* any existing ids.
         * 2. They contain 72-bits of random data after the timestamp so that IDs won't collide with other clients' IDs.
         * 3. They sort *lexicographically* (so the timestamp is converted to characters that will sort properly).
         * 4. They're monotonically increasing.  Even if you generate more than one in the same timestamp, the
         *    latter ones will sort after the former ones.  We do this by using the previous random bits
         *    but "incrementing" them by 1 (only in the case of a timestamp collision).
         */
        this.generatePushID = (function() {
          // Modeled after base64 web-safe chars, but ordered by ASCII.
          let PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

          // Timestamp of last push, used to prevent local collisions if you push twice in one ms.
          let lastPushTime = 0;

          // We generate 72-bits of randomness which get turned into 12 characters and appended to the
          // timestamp to prevent collisions with other clients.  We store the last characters we
          // generated because in the event of a collision, we'll use those same characters except
          // "incremented" by one.
          let lastRandChars = [];

          return function(now) {
            let duplicateTime = (now === lastPushTime);
            lastPushTime = now;

            let timeStampChars = new Array(8);
            for (let i = 7; i >= 0; i--) {
              timeStampChars[i] = PUSH_CHARS.charAt(now % 64);
              // NOTE: Can't use << here because javascript will convert to int and lose the upper bits.
              now = Math.floor(now / 64);
            }
            if (now !== 0) throw new Error('We should have converted the entire timestamp.');

            let id = timeStampChars.join('');

            if (!duplicateTime) {
              for (let i = 0; i < 12; i++) {
                lastRandChars[i] = Math.floor(Math.random() * 64);
              }
            } else {
              // If the timestamp hasn't changed since last push, use the same random number, except incremented by 1.
              let i = 11
              for (; i >= 0 && lastRandChars[i] === 63; i--) {
                lastRandChars[i] = 0;
              }
              lastRandChars[i]++;
            }
            for (let i = 0; i < 12; i++) {
              id += PUSH_CHARS.charAt(lastRandChars[i]);
            }
            if(id.length != 20) throw new Error('Length should be 20.');

            return id;
          };
        })();
    }
}
