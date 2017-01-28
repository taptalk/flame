const should = require('chai').should()
const fs = require('fs')
const flame = require('../index')
const json = fs.readFileSync('test/database.json', 'utf8')

beforeEach(() => {
    flame.loadJSON(json)
})

describe('#get', () => {
    it('fetches user', () => {
        flame.get('/user/abcd').should.deep.equal({ name: 'Joshua Moreno', age: 85 })
    })

    it('fetches users', () => {
        Object.keys(flame.get('/user')).should.deep.equal(['abcd', 'efgh'])
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
})

describe('#post', () => {
    it('adds comment', () => {
        const key = flame.post('/comment', { body: 'Matter is neither created nor destroyed.' }).name
        flame.database.comment[key].should.deep.equal({ body: 'Matter is neither created nor destroyed.' })
    })
})

describe('#put', () => {
    it('replaces user', () => {
        flame.put('/user/abcd', { name: 'Nancy Oconnell' }).should.deep.equal({ name: 'Nancy Oconnell' })
        flame.database.user.abcd.should.deep.equal({ name: 'Nancy Oconnell' })
    })
})

describe('#patch', () => {
    it('updates user', () => {
        flame.patch('/user/abcd', { name: 'Nancy Oconnell' }).should.deep.equal({ name: 'Nancy Oconnell' })
        flame.database.user.abcd.should.deep.equal({ name: 'Nancy Oconnell', age: 85 })
    })
})

describe('#delete', () => {
    it('deletes user', () => {
        should.not.exist(flame.delete('/user/efgh'))
        should.not.exist(flame.database.user.efgh)
    })
})
