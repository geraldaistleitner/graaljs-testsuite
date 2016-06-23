var Test = require('../persister/test');
var Config = require('../persister/config');

var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
var htmlEscape = require("html-escape");

module.exports = function (app, passport) {

    app.get('/', isAuthenticated, function (req, res) {
        res.redirect('/tests');
    });

    app.get('/config', isAuthenticated, function (req, res) {
        Config.findOne({},
            function (err, config) {
                // In case of any error, return using the done method
                if (err)
                    return done(err);
                if (config == null) {
                    var newConfig = new Config();
                    // set the user's local credentials

                    newConfig.name = req.param('Basic');
                    newConfig.path = req.param('/node');
                    // save the user
                    newConfig.save(function (err) {
                        if (err) {
                            console.log('Error in Saving test: ' + err);
                        }
                        res.render('template/config', {"config": newConfig});
                    });
                } else {
                    // Username does not exist, log error & redirect back
                    res.render('template/config', {"config": config});
                }
            }
        );
    });

    app.get('/tests', isAuthenticated, function (req, res) {
        Test.find({},
            function (err, tests) {
                // In case of any error, return using the done method
                if (err)
                    return done(err);
                // Username does not exist, log error & redirect back
                res.render('template/tests', {"tests": tests});
            }
        );
    });

    app.get('/tests/detail', isAuthenticated, function (req, res) {
        var id = req.param('id');
        Test.findById(id,
            function (err, test) {
                // In case of any error, return using the done method
                if (err)
                    return done(err);
                // Username does not exist, log error & redirect back
                res.render('template/test-detail', {"test": test, "htmlescape": htmlEscape});
            }
        );
    });

    app.get('/tests/initialize', isAuthenticated, function (req, res) {
        var id = req.param('test');
        Test.findOne({_id: id},
            function (err, test) {
                test.initRepository();
                res.render('template/test-detail', {"test": test, "htm-escape": htmlEscape});
            }
        );
    });

    app.get('/tests/blacklist', isAuthenticated, function (req, res) {
        var id = req.param('test');
        var name = req.param('blacklist');
        Test.findOne({_id: id, "blacklist.test": name},
            function (err, test) {
                if (err != null || test == null) {
                    Test.findByIdAndUpdate(id, {$push: {blacklist: {test: name}}}, {new: true}, function (err, test2) {
                        res.render('template/test-detail', {"test": test2, "htmlescape": htmlEscape});
                    });
                } else {
                    // Username does not exist, log error & redirect back
                    res.render('template/test-detail', {"test": test, "htmlescape": htmlEscape});
                }

            }
        );
    });

    app.get('/tests/unblacklist', isAuthenticated, function (req, res) {
        var id = req.param('test');
        var name = req.param('blacklist');
        Test.findOneAndUpdate(
            {
                "_id": id,
                "blacklist.test": name
            },
            {"$pull": {"blacklist": {"test": name}}}, {new: true},
            function (err, test) {
                if (test == null) {
                    Test.findById(id, function (err, test2) {
                        res.render('template/test-detail', {"test": test2, "htmlescape": htmlEscape});
                    });
                } else {
                    res.render('template/test-detail', {"test": test, "htmlescape": htmlEscape});
                }
            }
        );
    });

    app.get('/tests/greylist', isAuthenticated, function (req, res) {
        var id = req.param('test');
        var name = req.param('greylist');
        Test.findOne({_id: id, "greylist.test": name},
            function (err, test) {
                if (err != null || test == null) {
                    Test.findByIdAndUpdate(id, {$push: {greylist: {test: name}}}, {new: true}, function (err, test2) {
                        res.render('template/test-detail', {"test": test2, "htmlescape": htmlEscape});
                    });
                } else {
                    // Username does not exist, log error & redirect back
                    res.render('template/test-detail', {"test": test, "htmlescape": htmlEscape});
                }

            }
        );
    });

    app.get('/tests/ungreylist', isAuthenticated, function (req, res) {
        var id = req.param('test');
        var name = req.param('greylist');
        Test.findOneAndUpdate(
            {
                "_id": id,
                "greylist.test": name
            },
            {"$pull": {"greylist": {"test": name}}}, {new: true},
            function (err, test) {
                if (test == null) {
                    Test.findById(id, function (err, test2) {
                        res.render('template/test-detail', {"test": test2, "htmlescape": htmlEscape});
                    });
                } else {
                    res.render('template/test-detail', {"test": test, "htmlescape": htmlEscape});
                }
            }
        );
    });

    app.get('/tests/list', isAuthenticated, function (req, res) {
        Test.find({},
            function (err, tests) {
                // In case of any error, return using the done method
                if (err)
                    return done(err);
                // Username does not exist, log error & redirect back
                res.send(tests);
            }
        );
    });

    app.post('/tests/run', isAuthenticated, function (req, res) {
        var id = req.param('id');
        Test.findById(id,
            function (err, test) {
                var test = test.runTest();
                // In case of any error, return using the done method
                if (err)
                    return done(err);
                // Username does not exist, log error & redirect back
                res.render('template/test-detail-ajax', {"test": test, "htmlescape": htmlEscape});
            }
        );
    });

    app.post('/tests/run/state', isAuthenticated, function (req, res) {
        var id = req.param('id');
        Test.findById(id,
            function (err, test) {
                var run = test.runs.id(req.param('rid'));
                if (err)
                    return done(err);
                // Username does not exist, log error & redirect back
                var header;
                ejs.renderFile(__dirname + '/../views/template/test-detail-run-ajax_header.ejs', {
                    test: test,
                    run: run
                }, function (err, html) {
                    header = html;
                    ejs.renderFile(__dirname + '/../views/template/test-detail-run-ajax_body.ejs', {
                        htmlescape: htmlEscape,
                        test: test,
                        run: run
                    }, function (err, html) {
                        res.send({finished: !test.runActive, header: header, body: html});
                    });
                });
            }
        );
    });

    app.post('/tests/create', isAuthenticated, function (req, res) {

        var newTest = new Test();
        // set the user's local credentials

        newTest.name = req.param('name').replace(" ", "");
        newTest.basePath = req.param('basePath');
        newTest.svnUrl = req.param('svnUrl');
        newTest.key = req.param('key');
        newTest.runActive = false;
        // save the user
        newTest.save(function (err) {

            if (err) {
                console.log('Error in Saving test: ' + err);
                res.send({"result": false});
            }
            res.send({"result": true});
        });
    });

    app.post('/tests/delete', isAuthenticated, function (req, res) {
        // set the user's local credentials
        var id = req.param('id');
        Test.findByIdAndRemove(id, function (err) {
            if (err) {
                console.log('Error in Saving test: ' + err);
                res.send({"result": false});
            }
            res.send({"result": true});
        })
    });

    app.post('/tests/api/init', isAuthenticated, function (req, res) {
        var key = req.param('key');
        Test.findOne({key: key},
            function (err, test) {
                if (err){
                    res.send({result: false});
                } else {
                    test.initRepository();
                    res.send({result: true});
                }
            }
        );
    });

    app.post('/tests/api/run', isAuthenticated, function (req, res) {
        var key = req.param('key');
        var url = req.param('callbackURL');
        Test.findOne({key: key},
            function (err, test) {
                var test = test.runTest(url);
                // In case of any error, return using the done method
                if (err || test == null)
                    res.send({"running": false, "error": err});
                // Username does not exist, log error & redirect back
                res.send({"running": true});
            }
        );
    });


    app.post('/tests/api/create', isAuthenticated, function (req, res) {
        var newTest = new Test();
        // set the user's local credentials
        newTest.name = req.param('name').replace(" ", "");
        newTest.basePath = req.param('basePath');
        newTest.svnUrl = req.param('svnUrl');
        newTest.key = req.param('key');
        newTest.runActive = false;
        // save the user
        newTest.save(function (err) {
            if (err) {
                console.log('Error in Saving test: ' + err);
                res.send({"result": false});
            }
            res.send({"result": true});
        });
    });

    app.post('/tests/api/run/state', isAuthenticated, function (req, res) {
        var key = req.param('key');
        Test.findOne({key: key},
            function (err, test) {
                var run = test.runs[test.runs.length - 1];
                if (err) {
                    res.send({"result": false, "message": "no valid test"});
                } else if (test.runActive) {
                    res.send({"running": true});
                } else {
                    res.send({"running": false, "passed": run.passedTests, "executedTests": run.allTests});
                }
            }
        );
    });

    app.post('/config', isAuthenticated, function (req, res) {
        var id = req.param('id');
        Config.findById(id,
            function (err, config) {
                config.name = req.param('name');
                config.path = req.param('path');
                config.save();
                if (err)
                    return done(err);
                // Username does not exist, log error & redirect back
                res.render('template/config', {"config": config});
            }
        );
    });

}
// As with any middleware it is quintessential to call next()
// if the user is authenticated
var isAuthenticated = function (req, res, next) {
    Config.findOne({}, function (err, config) {
        if (config == null) {
            res.redirect('/config');
        }
    });
    return next();
}