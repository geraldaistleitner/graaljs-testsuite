var mongoose = require('mongoose');

/**
 * Config Mongo DB model
 * @name configModel
 */
var configModel = function () {

    var configSchema = mongoose.Schema({
        id: mongoose.Schema.Types.ObjectId,
        name: String,
        path: String
    });
    return mongoose.model('Config', configSchema);
};

module.exports = new configModel();