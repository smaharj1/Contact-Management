var MongoClient = require('mongodb').MongoClient;
var ObjectID = require ('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/contacts';

var contacts;
var contactList; // an array of existing contacts
var username = "sujil";
var password = "ramapo";

MongoClient.connect(url, function(err, db) {
    console.log("Successfully connect to the database");
    if (err) {
        console.log("Cound not connect to the database");
    }
    contacts = db.collection('contacts');
});
                    
exports.contacts = function() {
    return contacts;
};

exports.getUserName = function () {
    return username;
}

exports.getPassword = function() {
    return password;
}
