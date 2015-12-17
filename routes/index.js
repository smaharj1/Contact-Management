var express = require('express');
var router = express.Router();
var database = require('./database');

var geocoderProvider = 'google';
var httpAdapter = 'http';

var geocoder = require('node-geocoder')(geocoderProvider,httpAdapter);

var ObjectID = require('mongodb').ObjectID
var currentData;
var requestSource;

var ensureLoggedIn = function(req, res, next) {
	if ( req.user) {
		next();
	}
	else {
		res.redirect("/mailer");
	}
}

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('mailer',{});
});

router.get('/mailer', function (req,res,next) {
    res.render('mailer', {});
});

router.post('/mailer',function(req,res,next) {
    requestSource = 'mailer';
    storeToDatabase(req, res);
});


// This directs the calls to contacts page
router.get('/contacts', ensureLoggedIn, function (req, res) {
    database.contacts().find().toArray(function (err, result) {
        if (!err) {
            
            res.render('contacts',{contacts: result});
        }
    })
});

router.get('/getContacts', ensureLoggedIn, function (req,res) {
    database.contacts().find().toArray(function (err, data) {
        if (!err) {
            //console.log(data);
            res.end(JSON.stringify(data));
        }
    });
    
});

// Returns the information of the contact with particular ID
router.post('/selectedContact', ensureLoggedIn, function (req,res) {
    //console.log("The selected id is "+req.body.id);
    database.contacts().findOne({_id: ObjectID(req.body.id)}, function (err, doc) {
        if (!err) {
            //console.log("The data is " +doc['first']);
            
            res.end(JSON.stringify(doc));
        }
        else {
            console.log("Error while retrieving");
        }
    });
    
});

// Handles the submission of the form in a single page
router.post('/inpageSubmit', ensureLoggedIn, function (req,res) {
    console.log ("Inpage submission of the data triggered");
    requestSource = 'create';
    storeToDatabase(req, res);
});


router.post('/deleteContact', ensureLoggedIn, function (req,res) {
    database.contacts().deleteOne({_id: ObjectID(req.body.id)},function (err, data) {
        console.log("Delete has been triggered");
        if (!err) {
            res.end(JSON.stringify({result: "success"}));
        }
        else {
            console.log("error deleting");
        }
    });
    

});

router.post('/modify', ensureLoggedIn, function (req,res) {
    requestSource = 'modify';

    storeToDatabase(req, res);
});

function storeToDatabase(req, res) {
    var contactByMail =false;
    var contactByPhone =false;
    var contactOnline =false;

    if (req.body.allOK != undefined) {
        contactByMail = true;
        contactByPhone = true;
        contactOnline = true;
    }
    else {
        if (req.body.phoneOK != undefined) {contactByPhone = true;}
        if (req.body.mailOK != undefined) {contactByMail = true;} 
        if (req.body.emailOK != undefined) {contactOnline = true}
    }

    currentData ={
        suffix: req.body.suffix,
        first: req.body.first,
        last: req.body.last,
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        zip: req.body.zip,
        email: req.body.email,
        phone: req.body.phone,
        contactByMail: contactByMail,
        contactByPhone: contactByPhone,
        contactByEmail: contactOnline
    };

    // First calculate the latitude and longitude of the given address
    // Geocoding through server side
    var latitude;
    var longitude;
    var location=req.body.street + ', '+req.body.city + ', '+req.body.state + ', '+ req.body.zip;
    
    geocoder.geocode(location, function (err, data) {
        //console.log(data);
        if (data[0] != null) {
            currentData.latitude = data[0].latitude;
            currentData.longitude = data[0].longitude;
//            console.log("current data is " + currentData.contactByPhone + currentData.contactByMail + currentData.contactByEmail);
            if (requestSource != 'modify') {
                database.contacts().insert(currentData, function (err, data) {
                    if (data.result.ok) {
                        // respond the required fields
                        console.log(data);
                        if (requestSource == 'mailer') {
                            res.render('confirmation',{contact: currentData});
                        }
                        else {
                            res.end(JSON.stringify(data.ops[0]));
                        }
                    }
                    else {
                       res.end(err);
                    }
                });
            }
            else {
                database.contacts().updateMany({_id: ObjectID(req.body.id)}, {'$set': currentData}, function (err, doc) {
                   // console.log(doc);
                    if (err) {
                        res.end(err);
                    }
                    else {
                        res.end(JSON.stringify(currentData));
                    }
                });
            }
        }
        else {
            console.log("Location not valid");
            //res.end("location is not valid");
        }
        
        
    });
}



module.exports = router;
