var mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec
var execSync = require('child_process').execSync;
var Config = require('./config');
var promise = require('promise');
var async = require('async');
var http = require('http');


/**
 * Test Mongo DB model
 * @name testModel
 */
var testModel = function () {

    var testSchema = mongoose.Schema({
        name: String,
        basePath: String,
        svnUrl: String,
        key: String,
        runActive: Boolean,
        initialized: {type: Boolean, default: false},
        runs: [{
            id: mongoose.Schema.Types.ObjectId,
            date: {type: Date, default: Date.now},
            results: [{test: String, state: Number, result: String}],
            allTests: {type: Number, default: 0},
            passedTests: {type: Number, default: 0},
            failedTests: {type: Number, default: 0},
            callback: {type: String, default: ""}
        }],
        blacklist: [{test: String}],
        greylist: [{test: String}],
        date: {type: Date, default: Date.now}
    });

    testSchema.methods.runTest = function (url) {
        /* check if sources already fetched and no run is active, otherwise do nothing and return test */
        if (this.initialized && !this.runActive) {
            return this.runTestRun(this, url);
        } else {
            return this;
        }
    }

    /* run all tests in specified directory */
    testSchema.methods.runTestRun = function (test, url) {
        test.runActive = true;
        test.save();
        var run = test.runs.create({allTests: 0, passedTests: 0, callback: url});
        test.runs.push(run);
        var id = run._id;
        var pathToTests = './repositories/' + test.name + "/" + test.basePath;
        var allTests = 0;
        test.runs.forEach(function (run) {
            if (run._id == id) {
                fs.readdir(pathToTests, function (err, files) {
                    if (err) {
                        throw err;
                    }
                    var mappedFiles = files.map(function (file) {
                        return path.join(pathToTests, file);
                    }).filter(function (file) {
                        return fs.statSync(file).isFile();
                    });
                    async.eachLimit(
                        mappedFiles,
                        10,
                        function (file, callback) {
                            include(file, test._id, id, callback);
                        },
                        function (err) {
                            //done
                        }
                    );
                });

            }
        });
        return test;
    }


    /* get tests from SVN repository */
    testSchema.methods.initRepository = function () {
        var dir = './repositories';
        var test = this;
        test.runActive = false;
        test.save();
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        var rep = dir + "/" + this.name;
        if (!fs.existsSync(rep)) {
            fs.mkdirSync(rep);
        }

        var cmd = "svn export --force " + this.svnUrl + "/trunk/" + this.basePath + " " + path.resolve(rep + "/" + this.basePath);
        var error = execSync(cmd);
        test.initialized = true;
        test.save();
    }


    return mongoose.model('Test', testSchema);
};

var Test = new testModel();

/* helper function to execute the tests and store results */
function include(inc, test, run, callback) {
    Test.findById(test, function (err, test) {

        /* Greylist check */
        greyListed = false;
        if (test.greylist.some(function (e) {
                return e.test === inc
            })) {
            greyListed = true;
        }

        if (!greyListed) {
            Test.update({
                "_id": test,
                "runs._id": run
            }, {
                $inc: {
                    "runs.$.allTests": 1
                }
            }, function (err, numAffected) {
                if (err != null) {
                    console.log(err);
                }
            });
            try {
                Config.findOne({}, function (err, config) {
                    var cmd = config.path + " " + inc;
                    /* Execute the test with config */
                    exec(cmd, function (error, stdout, stderr) {
                        callback();
                        var result;
                        var testDoc;
                        Test.findOne({
                            "_id": test,
                            "runs._id": run
                        }, function (err, test) {
                            testDoc = test;
                            var incr = {
                                "runs.$.passedTests": 1
                            };
                            var state = 0;
                            /* Run failed, increment number of failed tests */
                            if (stdout.length == 0 && error != null) {
                                incr = {
                                    "runs.$.failedTests": 1
                                };
                                state = 1;
                                if (stderr.indexOf('com.oracle.truffle.js.runtime.JSException') < 0) {
                                    state = 2
                                }
                            }
                            /* Executed test is on blacklist, change state of result */
                            if (test.blacklist.some(function (e) {
                                    return e.test === inc
                                })) {
                                state = 3;
                            }

                            /* Store result and increment failed or passed tests */
                            Test.update({
                                "_id": test,
                                "runs._id": run
                            }, {
                                $push: {
                                    'runs.$.results': {
                                        test: inc,
                                        state: state,
                                        result: stderr
                                    }
                                },
                                $inc: incr
                            }, function (err, num) {
                                /* Check if test run is finished  and send callback*/
                                Test.findOne({
                                    "_id": test,
                                    "runs._id": run
                                }, function (err, test) {
                                    var activeRun = test.runs.id(run);
                                    if (activeRun.allTests == (activeRun.passedTests + activeRun.failedTests)) {
                                        if (test.runActive) {
                                            test.runActive = false;
                                            test.save();
                                            /* if there is a callback execute it */
                                            if (activeRun.callback.length > 0)
                                                http.get(activeRun.callback);
                                        }
                                    }
                                });
                            });

                        });
                    });
                });

            } catch
                (ex) {
                console.log(ex);

            }
        }
    });
}

module.exports = Test;