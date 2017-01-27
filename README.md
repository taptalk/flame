<img src="icon.jpg" alt="Flame Icon" width="72"/>


Flame
======

*A Firebase REST API on a local in-memory database.*

With Flame you can use the Firebase REST API on a local in-memory database. This is useful when you for example want to run tests locally.


## Installation

    npm install @leonardvandriel/flame


## Usage

    const flame = require('@leonardvandriel/flame')

    // load database
    const json = '{ "user": { "abcd": { "name": "John", "age": 85 } } }'
    flame.loadJSON(json)
    // or read from file: const json = fs.readFileSync('database.json', 'utf8')

    // Read user
    console.log(flame.get('/user/abcd'))

    // Add user
    flame.put('/user/efgh', { name: 'Romona Moten', age: 20 })

    // Query users
    console.log(flame.get('/user/abcd', { orderBy: 'age', limitToLast: 1, startAt: 10 }))


## Tests

    npm test


## License

Flame is licensed under the terms of the BSD 3-Clause License, see the included LICENSE file.


## Authors

- Leo Vandriel
