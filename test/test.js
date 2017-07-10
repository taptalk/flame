const should = require('chai').should()
const fs = require('fs')
const flame = require('../lib/index')
const json = fs.readFileSync('test/database.json', 'utf8')
const database = JSON.parse(json)

beforeEach(() => {
    flame.loadDatabase(database)
    // flame.useLogger(console.log)
})

describe('#get', () => {
    it('fetches user', () => {
        flame.get('/user/abcd').name.should.equal('Joshua Moreno')
    })

    it('fetches users', () => {
        Object.keys(flame.get('/user')).should.deep.equal(['abcd', 'efgh'])
    })

    it('fetches root', () => {
        Object.keys(flame.get('')).should.deep.equal(['item', 'user'])
        Object.keys(flame.get('/')).should.deep.equal(['item', 'user'])
    })

    it('fetches limited users', () => {
        Object.keys(flame.get('/user', { orderBy: '$key', limitToLast: 1 })).should.deep.equal(['efgh'])
        Object.keys(flame.get('/user', { orderBy: 'age', limitToLast: 1, startAt: 10 })).should.deep.equal(['abcd'])
    })

    it('sorts items by key', () => {
        flame.get('/item', { orderBy: '$key', limitToFirst: 3 }).should.deep.equal(['zeroth', 'first', 'second'])
        flame.get('/item', { orderBy: '$key', limitToFirst: 3, startAt: 1 }).should.deep.equal({ '1': 'first', '2': 'second', '10': 'tenth' })
        flame.get('/item', { orderBy: '$key', limitToLast: 3 }).should.deep.equal({ '1': 'first', '2': 'second', '10': 'tenth' })
        flame.get('/item', { orderBy: '$key', limitToLast: 3, startAt: 2 }).should.deep.equal({ '2': 'second', '10': 'tenth' })
    })

    it('sorts items by value', () => {
        flame.get('/item', { orderBy: '$value', limitToFirst: 3 }).should.deep.equal({ '1': 'first', '2': 'second', '10': 'tenth' })
        flame.get('/item', { orderBy: '$value', limitToFirst: 3, startAt: 's' }).should.deep.equal({ '0': 'zeroth', '2': 'second', '10': 'tenth' })
        flame.get('/item', { orderBy: '$value', limitToLast: 3 }).should.deep.equal({ '0': 'zeroth', '2': 'second', '10': 'tenth' })
        flame.get('/item', { orderBy: '$value', limitToLast: 3, startAt: 's' }).should.deep.equal({ '0': 'zeroth', '2': 'second', '10': 'tenth' })
    })

    it('fetches shallow users', () => {
        Object.keys(flame.get('/user', { shallow: true })).should.deep.equal(['abcd', 'efgh'])
    })

    it('fetch by sub key', () => {
        Object.keys(flame.get('/user', { orderBy: 'stats/visits', limitToLast: 1, startAt: 0 })).should.deep.equal(['abcd'])
        Object.keys(flame.get('/user', { orderBy: 'stats/type', equalTo: 'c' })).should.deep.equal(['abcd'])
    })
})

describe('#post', () => {
    it('adds comment', () => {
        const key = flame.post('/comment', { body: 'Matter is neither created nor destroyed.' }).name
        flame.database.comment[key].should.deep.equal({ body: 'Matter is neither created nor destroyed.' })
    })

    it('does not affect the root data', () => {
        const key = flame.post('/comment', { body: 'The second.' }).name
        flame.database.comment[key].should.deep.equal({ body: 'The second.' })
        should.not.exist(database.comment)
    })
})

describe('#put', () => {
    it('replaces user', () => {
        flame.put('/user/abcd', { name: 'Nancy Oconnell' }).should.deep.equal({ name: 'Nancy Oconnell' })
        flame.database.user.abcd.should.deep.equal({ name: 'Nancy Oconnell' })
    })

    it('does not affect the root data', () => {
        flame.put('/user/abcd', { name: 'Fred Johnson' })
        flame.database.user.abcd.name.should.equal('Fred Johnson')
        database.user.abcd.name.should.equal('Joshua Moreno')
    })

    it('works without slash prefix', () => {
        flame.put('test', { value: 'xyz' }).should.deep.equal({ value: 'xyz' })
        flame.database.test.should.deep.equal({ value: 'xyz' })
    })
})

describe('#patch', () => {
    it('updates user', () => {
        flame.patch('/user/abcd', { name: 'Nancy Oconnell' }).should.deep.equal({ name: 'Nancy Oconnell' })
        flame.database.user.abcd.name.should.equal('Nancy Oconnell')
    })

    it('does not affect the root data', () => {
        flame.patch('/user/abcd', { name: 'Fred Johnson' })
        flame.database.user.abcd.name.should.equal('Fred Johnson')
        database.user.abcd.name.should.equal('Joshua Moreno')
    })
})

describe('#delete', () => {
    it('deletes user', () => {
        should.not.exist(flame.delete('/user/efgh'))
        should.not.exist(flame.database.user.efgh)
    })

    it('does not affect the root data', () => {
        should.exist(flame.database.user)
        flame.delete('/user')
        should.not.exist(flame.database.user)
        should.exist(database.user)
    })
})

describe('#generateKey', () => {
    it('generates with fixed prefix', () => {
        flame.generateKey(0).should.match(/^--------[A-Za-z0-9_-]{12}$/)
        flame.generateKey(1).should.match(/^-------0[A-Za-z0-9_-]{12}$/)
        flame.generateKey(1000).should.match(/^------Ec[A-Za-z0-9_-]{12}$/)
        flame.generateKey(1000000).should.match(/^----2o8-[A-Za-z0-9_-]{12}$/)
        flame.generateKey(1486072494923).should.match(/^-Kc-ofhA[A-Za-z0-9_-]{12}$/)
        flame.generateKey(281474976710655).should.match(/^zzzzzzzz[A-Za-z0-9_-]{12}$/)
    })
})

describe('#timestampForKey', () => {
    it('reverses date from generated key', () => {
        flame.timestampForKey('--------trHTBlfcaOg3').should.equal(0)
        flame.timestampForKey('-------0W_AvbIPV-hTf').should.equal(1)
        flame.timestampForKey('------Echeo0gL_kxHCr').should.equal(1000)
        flame.timestampForKey('----2o8-tNE2SRVeWADl').should.equal(1000000)
        flame.timestampForKey('---48_k-S4pTebdGH_IB').should.equal(86400000)
        flame.timestampForKey('-Kc-ofhA2uGpymUI1CLf').should.equal(1486072494923)
        flame.timestampForKey('zzzzzzzz9vmDck6jy-qC').should.equal(281474976710655)
    })
})

describe('logging', () => {
    it('prints to console', () => {
        // flame.useLogger(console.log)
        flame.get('writing', { startAt: 'console.log' })
    })

    it('prints to logger', () => {
        const did = { write: false }
        flame.useLogger((operation, path, query) => {
            operation.should.equal('get')
            path.should.equal('writing')
            query.should.deep.equal({ startAt: 'here' })
            did.write = true
        })
        flame.get('writing', { startAt: 'here' })
        did.write.should.equal(true)
        flame.useLogger()
    })
})
