var map;
var parsedData;
var markers = {};
var isCreate;
var row;
var totalErrors = [];

$(document).ready(function() {
    
    init_visibility();

    
    // This will drop markers for all the contacts
    $.get('/getContacts', function (data) {       
        parsedData = JSON.parse(data);
            
        $(parsedData).each(function (key, value) {
            //alert("lat" + value['latitude']);
            
        var tooltipInfo = "<h4>" + value['first']+ " " + value['last']+ "</h4>" + value['street'] + ", " + value ['city'] +", " +  value['state'] + ", " + value['zip'];
            dropMarker({lat:value['latitude'], lng: value['longitude']}, tooltipInfo, value['_id']);
        });
    });
    
    // If the table is clicked, then point the map to the clicked address
    $('#contents').on('click','tr', function () {
              
        map.setCenter({lat: $(this).data('latitude'), lng: $(this).data('longitude')});    
        
    });
    
    // Checks if the modify button was pressed. If yes, then calls the form for that element and updates it
    //$('.modify').on('click',function() {
    $('#contents').on('click','.modify', function() {
        isCreate = false;
    
        // Generate the same form
        createForm();
        
        // AJAX call to the server to get the ID 
        row = $(this).parent().parent();
        
        // Make an AJAX call to get the row data of the button pressed
        var info = $.post('/selectedContact', {id: row.data('id')});
        info.done(function (result) {
            parsedData = JSON.parse(result);
            
            // Add the suffix initial value
            var sufx = parsedData.suffix;
            if (sufx === "Mr") $('#col1').prop('checked', true);
            else if (sufx === "Mrs") $('#col2').prop('checked', true);
            else if (sufx === "Ms") $('#col3').prop('checked', true);
            else $('#col4').prop('checked', true);
            
            $('#first').val(parsedData.first);
            $('#last').val(parsedData.last);
            $('#street').val(parsedData.street);
            $('#city').val(parsedData.city);
            $('#state').val(parsedData.state);
            $('#zip').val(parsedData.zip);
            $('#phone').val(parsedData.phone);
            $('#email').val(parsedData.email);
            
            //alert(parsedData.contactByEmail + parsedData.contactByMail + parsedData.contactByPhone);
            if (parsedData.contactByEmail && parsedData.contactByMail && parsedData.contactByPhone) $('#allOK').prop('checked',true);
            else {
                if (parsedData.contactByMail) $('#mailOK').prop('checked',true) ;
                if (parsedData.contactByPhone) $('#phoneOK').prop('checked',true) ;
                if (parsedData.contactByEmail) $('#onlineOK').prop('checked',true) ;
            }
            
        });
        
        $('html, body').animate({
            scrollTop: $( '#createContact' ).offset().top
        }, 500);
    });
    
    // Checks if the button pressed is delete. Deletes the contact
    $('#contents').on('click', '.delete', function () {
        var row = $(this).parent().parent();
        
        var info = $.post('/deleteContact', {id: row.data('id')});
        info.done(function (result) {
           // It changes the table info in the page
            deleteMarker(row.data('id'));
            row.remove();
        });
    });
    
        
    $('#createButton').on('click',function() {
        createForm();
        
        isCreate = true;
        flushValues();
    });
    
    // This is for validating the form submission
    $('#forming').validate({
        errorPlacement: function(error, element) {
           totalErrors.push(error);
           //error.insertBefore(element);
        },
        rules: {
            suffix: "required",
            first: "required",
            last:"required",
            street: "required",
            city:"required",
            state:"required",
            zip: {
                required: true,
                number: true,
                minlength: 5,
            },
            phone: {
                number: true,
                minlength: 10,
                maxlength: 10
            }
            
        },
        messages: {
            suffix: "Please enter the suffix",
            first: "Please specify your first name",
            last: "Please specify your last name",
            street: "Please enter the street address",
            city: "Please enter the city",
            state: "Please enter the state",
            zip: "Please enter the zip code of the location",
            phone: "Please enter valid phone number"
        }
       
    });
    
 
    $('#forming').on('click','#save', function() {
        // Remove everything from the error list
        totalErrors.length = 0;
        $('li').remove();
        
        if ($('#forming').valid() )
        {
            var data = getFormObj('forming');
            
            if(isCreate) {
                // include all of it in the database
                var info = $.post('/inpageSubmit', data);

                // Puts the submission to the table
                info.done(function (result) {
                    parsedData = JSON.parse(result);
                    //alert(parsedData.first);
                    parsedData.id = parsedData._id;
                    addNewRow(parsedData);
                });
            }
            else {
                //alert(data.first);
                data.id = row.data('id');

                var info = $.post('/modify', data);

                info.done(function (result) {
                    // change the existing data in the database
                    parsedData = JSON.parse(result);
                    parsedData.id = row.data('id');
                    deleteMarker(row.data('id'));
                    row.remove();
    
                    addNewRow(parsedData);
                });
            }
            showConfirmation();
            $('#createContact').slideUp();
                          
        

        }
        else {          
            for (i=0;i<totalErrors.length;++i) {
                $('<li/>').text(totalErrors[i].html())
                        .appendTo('ul');
                console.log(totalErrors[i].html());
            }
            showErrors();
        }
    });
    
    $('.close').on('click',function () {
        var parentID = $(this).parent().attr('id');
        if (parentID == 'createContact') {
            flushValues();
            $('#'+parentID).slideUp();
        }
        else if (parentID == 'searchTable') {
            unhideTable();
            $('#'+parentID).slideUp();
        }
        else if (parentID === 'errors' || parentID === 'confirm') {
            $('#'+parentID).slideUp();
        }
    })
    
    $("#search").on('click', function () {
        $('#searchTable').slideDown();
    });
    
    $('#searchField').on('click', '#searchButton', function () {
        var data = getFormObj('searchField');
        unhideTable();
        search(data);
    });
    
});
           
function getFormObj(formId) {
    var formObj = {};
    var inputs = $('#'+formId).serializeArray();
    $.each(inputs, function (i, input) {
        formObj[input.name] = input.value; 
    });
    //alert(tmp);
    return formObj;
}

function unhideTable() {
    rows =$('#contents').children();
    $.each(rows, function (index, data) {
        $(this).show();
    })
};

function search(searchData) {
    firstname = searchData.firstname.toLowerCase();
    lastname = searchData.lastname.toLowerCase();
    //console.log("data is " + firstname + "   " +lastname);
    rows =$('#contents').children();
    $.each(rows, function (index, data) {
        var name = data.children[0].innerHTML;
        var nameParts = name.split(' ');
        
        var first = nameParts[1].toLowerCase();
        var last = nameParts[2].toLowerCase();
        
        if (!firstname && !lastname) $(this).show();
        else if (firstname && lastname){
            if (first.indexOf(firstname) == -1) {
                $(this).hide();
            }
            else if (last.indexOf(lastname) == -1) {
                $(this).hide();
            }
        }
        else if (first.indexOf(firstname) == -1){
            console.log(first +" didnt have "+ firstname);
            $(this).hide();
        }
        else if (last.indexOf(lastname) == -1){
            $(this).hide();
        }
    })
    
}

function init_visibility() {
    mask (false,false, false);
    $("#searchTable").hide();
}

function createForm(){
    mask(true,false,false);
    //$('#save').data('type':'create');
}

function showConfirmation() {
    mask(false,true, false);
}

function showErrors() {
    mask (true, false, true);
}

function addNewRow(parsedData) {
    var tooltipInfo = "<h4>" + parsedData.first+ " " + parsedData.last+ "</h4>" + parsedData.street + ", " + parsedData.city +", " +  parsedData.state + ", " + parsedData.zip;
    dropMarker({lat:parsedData.latitude,lng: parsedData.longitude}, tooltipInfo, parsedData.id);

    var emailLink = $('<a/>').attr('href','mailto:'+parsedData.email)
                            .text(parsedData.email);
    var contactTypes ="";
    if (parsedData.contactByPhone) contactTypes = contactTypes.concat('| Phone');
    if (parsedData.contactByEmail) contactTypes = contactTypes.concat('| Email');
    if (parsedData.contactByMail) contactTypes = contactTypes.concat('| Mail');
    
    console.log(contactTypes);
    var newRow = $('<tr/>');
    $('<td/>').text(parsedData.suffix + " " +parsedData.first + " " + parsedData.last).appendTo(newRow);
    $('<td/>').text(parsedData.street + ", " + parsedData.city + ", " + parsedData.state+ ", " + parsedData.zip).appendTo(newRow);
    $('<td/>').append(emailLink)
        .appendTo(newRow);
    $('<td/>').text(parsedData.phone).appendTo(newRow);
    
    newRow.append($('<td/>').append(contactTypes));
    newRow.append($('<td/>').append($('<button/>').attr({
        type: 'button',
        class: 'modify btn hvr-sweep-to-bottom',
        name: 'modifyContact',
    })
                        .text('Modify')
    ));
    
    newRow.append($('<td/>').append($('<button/>').attr({
        type: 'button',
        class: 'delete btn hvr-sweep-to-bottom',
        name: 'delete',
    })
                        .text('Delete')
    ));
    
    //alert(parsedData.id);
    newRow.attr({
        'data-id': parsedData.id,
        'data-latitude': parsedData.latitude,
        'data-longitude': parsedData.longitude,
        'class': 'table-hover'
    })    
    newRow.fadeIn();
    newRow.appendTo('#contents');
}

// It cleans all the form fields to default
function flushValues() {
    // Add the suffix initial value
    $('#col1').prop('checked', false);
    $('#col2').prop('checked', false);
    $('#col3').prop('checked', false);
    $('#col4').prop('checked', false);
//alert("Create clicked");
    $('#first').val("");
    $('#last').val("");
    $('#street').val("");
    $('#city').val("");
    $('#state').val("");
    $('#zip').val("");
    $('#phone').val("");
    $('#email').val("");
}

function createMap () {
    // initialize the map
    latlng = {lat:40.7029741, lng: -74.2598655};
    map = new google.maps.Map(document.getElementById('map-canvas'),{
        center: latlng,
        zoom: 8
    });
}

function deleteMarker (id) {
    var marker = markers[id];
    marker.setMap(null);
}

function dropMarker(location, locationStr, dataID) {
    var marker = new google.maps.Marker({
        id: dataID,
        position: location
    });
    markers[dataID] = marker;
    marker.setMap(map);
    
    var toolTip = new google.maps.InfoWindow({
        content: locationStr,
        maxWidth: 250
    });
    
    marker.addListener( 'click', function() {
        toolTip.open(map, marker);
    });
    
    marker.addListener('mouseover', function () {
        toolTip.open(map, marker);
    });
    
    marker.addListener('mouseout', function () {
        toolTip.close(map, marker);
    });
    
}

function mask (create, confirmation, errors) {
    create ? $('#createContact').slideDown('slow') : $('#createContact').hide();
    confirmation ? $('#confirm').fadeIn() : $('#confirm').hide();
    errors ? $('#errors').fadeIn() : $('#errors').hide();
}