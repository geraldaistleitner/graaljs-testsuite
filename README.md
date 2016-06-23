## Getting Started

#### 1. Install node.js

Install and start node.js. (https://nodejs.org/download)

	$ node --version

Install and start mongoDB. (http://www.mongodb.org)

	$ cd mongodb
	$ mkdir -p data/db
	$ bin/mongod --dbpath data/db &

Install svn (https://subversion.apache.org/packages.html)
SVN must be executable (in path of system)

    $ svn ...

#### 2. Install dependencies

	$ npm install

#### 3. Start GraalJS test runner

	$ node ./bin/www

#### 4. Start by configuring the system

	http://localhost:3000


## API Usage

Post requests are used with key-value pairs, response is JSON

#### /tests/api/create

    Parameters:
        key
        name
        basePath
        svnUrl

    Response:
        {result: true || false}


#### /tests/api/init

    Parameters:
        key

    Response:
        {result: true || false}

#### /tests/api/run

    Parameters:
        key
        callbackURL

    Response:
        {running: true || false}

#### /tests/api/run/state

    Parameters:
        key

    Response:
        {   "running": true || false,
            optional if running false
                "passed": int,
                "executedTests": int
        }


