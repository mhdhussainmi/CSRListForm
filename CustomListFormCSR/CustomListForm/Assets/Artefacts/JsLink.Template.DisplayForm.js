// ==================================================================================================================================================================
// This is a JavaScript Display Template and it alters the Display Form's Layout when set as the ListFormWebPart Properties on a desired SharePoint Online List. 
// ==================================================================================================================================================================

// Global variables
var currentItemId, 
    currentWebUrl,
    currentListGUID,
    msFormToolBarHtml = '', 
    msCsrAttachmentsHtml = '',
    metadataArray = [],
    footerArray = [],
    noteFieldsArray = [],
    attachmentsFieldArray = [],
    listViewFieldsArray = [],
    pictureFieldsArray = [];
    filteredMetadataFieldsArray = [],
    filteredNoteFieldsArray = [],
    filteredPictureFieldsArray = [],
    sortedMetadataFieldsArray = [],
    sortedNoteFieldsArray = [],
    sortedPictureFieldsArray = [];

// Add resources to head element of the DOM when jQuery is ready.
$(document).ready(function () {
    ExecuteOrDelayUntilScriptLoaded(AddResourcesToHeader, "sp.js");
});

//IFFY
(function () {
    // Create object that have the context information about the field that we want to change it's output render 
    var formTemplate = {};
    formTemplate.Templates = {};
    formTemplate.Templates.View = viewTemplate;
    formTemplate.Templates.OnPreRender = AlterDefaultViewBeforeRender;
    formTemplate.Templates.OnPostRender = AlterDefaultViewAfterRender;
    SPClientTemplates.TemplateManager.RegisterTemplateOverrides(formTemplate);
})();

//This function is called on the OnPreRender event and performs DOM Manipulations.
function AlterDefaultViewBeforeRender(ctx) {
    try {
        var msFormTable = document.querySelector("#WebPart" + ctx.FormUniqueId + " .ms-formtable");
        if (msFormTable) {
            msFormTable.style.display = 'none';
            var msFormToolBar = document.querySelector("#WebPart" + ctx.FormUniqueId + " .ms-formtoolbar");
            if (msFormToolBar) {
                msFormToolBarHtml = msFormToolBar.outerHTML;
                jQuery("#WebPart" + ctx.FormUniqueId + " .ms-formtoolbar").remove();
            }
            var msCsrAttachmentsDiv = document.querySelector("#csrAttachmentUploadDiv");
            if (msCsrAttachmentsDiv) {
                msCsrAttachmentsHtml = document.querySelector("#csrAttachmentUploadDiv").outerHTML;
            }
        }
    }
    catch (e) {
        console.log(e);
    }
}

//This function is called on the OnPostRender event and performs DOM Manipulations.
function AlterDefaultViewAfterRender(ctx) {
    try {
        var msCsrAttachmentsDiv = document.querySelector("#csrAttachmentUploadDiv");
        if (msCsrAttachmentsDiv) {
            msCsrAttachmentsHtml = document.querySelector("#csrAttachmentUploadDiv").outerHTML;
            jQuery("#csrAttachmentUploadDiv").remove();
            jQuery(msCsrAttachmentsHtml).appendTo("#insertAttachmentsAfterRenderControls");
            jQuery(attachmentsFieldArray[0].ValueObject).appendTo("#insertAttachmentsAfterRender");
            jQuery(".ms-rtestate-write").css({ "border-style": "solid", "border-width": "1px", "border-color": "#ababab" });
            var attachmentElements = document.getElementById("idAttachmentsTable");
            if (attachmentElements == null || attachmentElements.rows.length == 0) {
                jQuery("#attachmentsContainer").remove();
            }
        }
    }
    catch (e) {
        console.log(e);
    }
}


//This function loads resources such as Bootstrap and Custom CSS files on to the Header of the page
function AddResourcesToHeader() {
    try {
        var boostrapCssUrl = _spPageContextInfo.webAbsoluteUrl + "/_catalogs/masterpage/bootstrap.min.css";
        var boostrapGridCssUrl = _spPageContextInfo.webAbsoluteUrl + "/_catalogs/masterpage/bootstrap-grid.min.css";
        var customCssUrl = _spPageContextInfo.webAbsoluteUrl + "/_catalogs/masterpage/csr.sharepoint.list.forms.css";
        var boostrapJsUrl = _spPageContextInfo.webAbsoluteUrl + "/_catalogs/masterpage/bootstrap.min.js";
        $('head').append("<link rel='stylesheet' type='text/css' href='" + boostrapCssUrl + "'>");
        $('head').append("<link rel='stylesheet' type='text/css' href='" + boostrapGridCssUrl + "'>");
        $('head').append("<link rel='stylesheet' type='text/css' href='" + customCssUrl + "'>");
        $('head').append("<script type='text/javascript' href='" + boostrapJsUrl + "'></script>");
    }
    catch (e) {
        console.log(e);
    }
}

// This function provides the rendering logic for the Custom Form
function viewTemplate(ctx) {
    try {
        //Call the function to fetch the Fields enabled in the "All Items" List View
        GetDefaultListViewFields();

        //Get the Context Fields and seperate them into arrays that help build the Custom Form Layout 
        var contextFieldsArray = ctx.ListSchema.Field;
        $.each(contextFieldsArray, function (key, value) {
            if (value.ReadOnlyField == false) {
               if (value.Type == "Note") {
                    var itemObject = {};
                    itemObject["Name"] = value.Title;
                    itemObject["InternalName"] = value.InternalName;
                    itemObject["ValueObject"] = getSPFieldRender(ctx, value.InternalName);
                    noteFieldsArray.push(itemObject);
                }
                else {
                    if (value.Name == "Attachments") {
                        var itemObject = {};
                        itemObject["Name"] = value.Title;
                        itemObject["ValueObject"] = getSPFieldRender(ctx, value.InternalName);
                        attachmentsFieldArray.push(itemObject);
                    }
                    else if(value.Type == "URL"){
                        var itemObject = {};
                        itemObject["Name"] = value.Title;
                        itemObject["InternalName"] = value.InternalName;
                        itemObject["ValueObject"] = getSPFieldRender(ctx, value.InternalName);
                        pictureFieldsArray.push(itemObject);
                    }
                    else {
                        metadataArray.push(value);
                    }
                }
            }
            else {
                if (value.Type == "Calculated") {
                    metadataArray.push(value);
                }
                else {
                    var itemObject = {};
                    itemObject["Name"] = value.Title;
                    itemObject["ValueObject"] = getSPFieldRender(ctx, value.InternalName);
                    footerArray.push(itemObject);
                }
            }
        });

        //Use the List View fields array and then seperate the unneccessary fields from the Metadata Array.
        if (listViewFieldsArray.length > 0) {
            //Check the field information available for data binding.
            $.each(metadataArray, function (key, value) {
                var boolExists = $.inArray(value.InternalName, listViewFieldsArray);
                if (boolExists != -1) {
                    //Add to array only if the field is selected in the All Items default list view.                    
                    var fieldObject = {};
                    fieldObject["Name"] = value.Title;
                    fieldObject["InternalName"] = value.InternalName;
                    fieldObject["ValueObject"] = getSPFieldRender(ctx, value.InternalName);
                    filteredMetadataFieldsArray.push(fieldObject);
                }
            })
        }

        //Use the List View fields array and then seperate the unneccessary fields from the Notes Array.
        if (listViewFieldsArray.length > 0) {
            //Check the field information available for data binding.
            $.each(noteFieldsArray, function (key, value) {
                var boolExists = $.inArray(value.InternalName, listViewFieldsArray);
                if (boolExists != -1) {
                    //Add to array only if the field is selected in the All Items default list view.                    
                    var fieldObject = {};
                    fieldObject["Name"] = value.Name;
                    fieldObject["InternalName"] = value.InternalName;
                    fieldObject["ValueObject"] = getSPFieldRender(ctx, value.InternalName);
                    filteredNoteFieldsArray.push(fieldObject);
                }
            })
        }

        //Use the List View fields array and then seperate the unneccessary fields from the Pictures Array.
        if (listViewFieldsArray.length > 0) {
            //Check the field information available for data binding.
            $.each(pictureFieldsArray, function (key, value) {
                var boolExists = $.inArray(value.InternalName, listViewFieldsArray);
                if (boolExists != -1) {
                    //Add to array only if the field is selected in the All Items default list view.                    
                    var fieldObject = {};
                    fieldObject["Name"] = value.Name;
                    fieldObject["InternalName"] = value.InternalName;
                    fieldObject["ValueObject"] = getSPFieldRender(ctx, value.InternalName);
                    filteredPictureFieldsArray.push(fieldObject);
                }
            })
        }

        if (filteredMetadataFieldsArray.length > 0) {
            //Sort the Metadata Filter Array
            $.each(listViewFieldsArray, function (key, value) {
                var fieldName = $.grep(filteredMetadataFieldsArray, function (filteredKey, filteredValue) {
                    if (value.toLowerCase() == filteredKey.InternalName.toLowerCase()) {
                        return (filteredKey);
                    }
                });
                if (fieldName.length > 0) {
                    var fieldObject = {};
                    fieldObject["Name"] = fieldName[0].Name;
                    fieldObject["InternalName"] = fieldName[0].InternalName;
                    fieldObject["ValueObject"] = fieldName[0].ValueObject;
                    sortedMetadataFieldsArray.push(fieldObject);
                }
            });
        }

        if (filteredNoteFieldsArray.length > 0) {
            //Sort the Notes Filter Array
            $.each(listViewFieldsArray, function (key, value) {
                var fieldName = $.grep(filteredNoteFieldsArray, function (filteredKey, filteredValue) {
                    if (value.toLowerCase() == filteredKey.InternalName.toLowerCase()) {
                        return (filteredKey);
                    }
                });
                if (fieldName.length > 0) {
                    var fieldObject = {};
                    fieldObject["Name"] = fieldName[0].Name;
                    fieldObject["InternalName"] = fieldName[0].InternalName;
                    fieldObject["ValueObject"] = fieldName[0].ValueObject;
                    sortedNoteFieldsArray.push(fieldObject);
                }
            });
        }

        if (filteredPictureFieldsArray.length > 0) {
            //Sort the Notes Filter Array
            $.each(listViewFieldsArray, function (key, value) {
                var fieldName = $.grep(filteredPictureFieldsArray, function (filteredKey, filteredValue) {
                    if (value.toLowerCase() == filteredKey.InternalName.toLowerCase()) {
                        return (filteredKey);
                    }
                });
                if (fieldName.length > 0) {
                    var fieldObject = {};
                    fieldObject["Name"] = fieldName[0].Name;
                    fieldObject["InternalName"] = fieldName[0].InternalName;
                    fieldObject["ValueObject"] = fieldName[0].ValueObject;
                    sortedPictureFieldsArray.push(fieldObject);
                }
            });
        }

        //Call the Generate View function that will create the custom form layout. 
        var html = GenerateView(ctx);
        return html;
    }
    catch (e) {
        console.log(e);
    }
}

//This method gets the fields from the default "All Items" List View.
function GetDefaultListViewFields() {
    try {
        jQuery.ajax({
            url: decodeURIComponent(_spPageContextInfo.webAbsoluteUrl) + "/_api/web/lists/getbytitle('" + _spPageContextInfo.listTitle + "')/Views/getbytitle('All Items')/ViewFields",
            type: "GET",
            async: false,
            headers: {
                "accept": "application/json;odata=verbose"
            },
            success: function (data) {
                if (data) {
                    listViewFieldsArray = data.d.Items.results;
                }
            },
            error: function (data, xhr, message) {
                console.log('JSLink: An error occured in REST API Call of GetDefaultListViewFields ' + data + xhr + message, location.href);
            }
        });
    }
    catch (e) {
        console.log(e);
    }
}

//This method uses the Sharepoint Field array and generates the HTML.
function GenerateView(ctx) {
    try {
        //Start of Form HTML
        var formTable = "<div id='mainContainer' class='container'>";
        if (sortedMetadataFieldsArray.length > 0) {
            //Start of Metadata Section        
            var metadataRowFormatLeft = ''; var metadataRowFormatRight = '';
            var metadataRowTemplate = "<div class='card-group'> <div class='col-md-4 card' style='background-color:rgba(0,0,0,.125)'> <div> <h6 class='card-title'> {0}: </h6> </div> </div> <div class='col-md-8 card'> <div> {1} </div> </div> </div>";
            $.each(sortedMetadataFieldsArray, function (key, value) {
                if (key % 2 === 0) {
                    metadataRowFormatLeft += metadataRowTemplate.FormatRow(value.Name, TidyDynamicContent(value.ValueObject));
                }
                else {
                    metadataRowFormatRight += metadataRowTemplate.FormatRow(value.Name, TidyDynamicContent(value.ValueObject));
                }
            });

            formTable += "<div id='metadataContainer' class='row'>";
            formTable += "<div class='col-md-12 card-group'>";
            //Generate the Left Div of Metadata section
            formTable += "<div class='col-md-6'>";
            formTable += metadataRowFormatLeft;
            formTable += "</div>";

            //Generate the Right Div of Metadata section
            formTable += "<div class='col-md-6'>";
            formTable += metadataRowFormatRight;
            formTable += "</div>";
            formTable += "</div>";
            formTable += "</div>";
        }
        //End of Metadata Section

        //Start of Note Fields Section
        if (sortedNoteFieldsArray.length > 0) {
            
            var noteFieldsRowFormat = '';
            var noteFieldsRowTemplate = "<div class='card-group'> <div class='col-md-2 card' style='background-color:rgba(0,0,0,.125)'> <div> <h6 class='card-title'> {0}: </h6> </div> </div> <div class='col-md-10 card'> <div> {1} </div> </div> </div>";
            $.each(sortedNoteFieldsArray, function (key, value) {
                noteFieldsRowFormat += noteFieldsRowTemplate.FormatRow(value.Name, TidyDynamicContent(value.ValueObject));
            });
            formTable += "<div id='noteFieldsContainer' class='row'>";
            formTable += "<div class='h-divider'></div>";
            formTable += "<div class='col-md-12 card-group'>";
            formTable += "<div class='col-md-12'>";
            formTable += noteFieldsRowFormat;
            formTable += "</div>";
            formTable += "</div>";
            formTable += "</div>";
        }
        //End of Note Fields Section

        //Start of Picture Fields Section
        if (sortedPictureFieldsArray.length > 0) {            
            var pictureFieldsRowFormat = '';
            var pictureFieldsRowTemplate = "<div class='card-group'> <div class='col-md-2 card' style='background-color:rgba(0,0,0,.125)'> <div> <h6 class='card-title'> {0}: </h6> </div> </div> <div class='col-md-10 card'> <div id='imageCsrContainer'> {1} </div> </div> </div>";
            $.each(sortedPictureFieldsArray, function (key, value) {
                pictureFieldsRowFormat += pictureFieldsRowTemplate.FormatRow(value.Name, TidyDynamicContent(value.ValueObject));
            });
            formTable += "<div id='pictureFieldsContainer' class='row'>";
            formTable += "<div class='h-divider'></div>";
            formTable += "<div class='col-md-12 card-group'>";
            formTable += "<div class='col-md-12'>";
            formTable += pictureFieldsRowFormat;
            formTable += "</div>";
            formTable += "</div>";
            formTable += "</div>";
        }
        //End of Picture Fields Section

        //Start of Attachments Fields Section    
        var attachmentsRowTemplate = "<div class='card-group'> <div class='col-md-2 card' style='background-color:rgba(0,0,0,.125)'> <div> <h6 class='card-title'> Attachments: </h6> </div> </div> <div class='col-md-10 card'> <div id='insertAttachmentsAfterRender' class='col-md-12 card-group'> </div> </div> </div>";
        formTable += "<div id='attachmentsContainer' class='row'>";
        formTable += "<div class='h-divider'></div>";
        formTable += "<div class='col-md-12 card-group'>";
        formTable += "<div class='col-md-12'>";
        formTable += attachmentsRowTemplate;
        formTable += "</div>";
        formTable += "</div>";
        formTable += "</div>";

        //End of Attachments Fields Section 

        if (footerArray.length > 0) {
            //Start of Footer Section
            var footerRowFormatLeft = ''; var footerRowFormatRight = '';
            var footerRowTemplate = "<div class='card-group'><div class='col-md-4 card' style='background-color:rgba(0,0,0,.125)'><div><h6 class='card-title'>{0}:</h6></div></div><div class='col-md-8 card'><div>{1}</div></div></div>";
            var footerRowForUnidTemplate = "<div class='card-group'><div class='col-md-4 card' style='background-color:rgba(0,0,0,.125)'><div><h6 class='card-title'>{0}:</h6></div></div><div class='col-md-8 card'><div><p style='color:#D3D3D3'>{1}</p></div></div></div>";
            $.each(footerArray, function (key, value) {
                if (key % 2 === 0) {
                    if (value.Name == "UNID") {
                        footerRowFormatLeft += footerRowForUnidTemplate.FormatRow(value.Name, TidyDynamicContent(value.ValueObject));
                    }
                    else {
                        footerRowFormatLeft += footerRowTemplate.FormatRow(value.Name, TidyDynamicContent(value.ValueObject));
                    }
                }
                else {
                    if (value.Name == "UNID") {
                        footerRowFormatRight += footerRowForUnidTemplate.FormatRow(value.Name, TidyDynamicContent(value.ValueObject));
                    }
                    else {
                        footerRowFormatRight += footerRowTemplate.FormatRow(value.Name, TidyDynamicContent(value.ValueObject));
                    }
                }
            });

            formTable += "<div id='footerContainer' class='row'>";
            formTable += "<div class='h-divider'></div>";
            formTable += "<div class='col-md-12 card-group'>";
            //Generate the Left Div of Footer section
            formTable += "<div class='col-md-6'>";
            formTable += footerRowFormatLeft;
            formTable += "</div>";

            //Generate the Right Div of Footer section
            formTable += "<div class='col-md-6'>";
            formTable += footerRowFormatRight;
            formTable += "</div>";
            formTable += "</div>";
            formTable += "<div class='h-divider'></div>";
            //Version History
            formTable += "<div class='col-md-12 card-group'><div class='col-md-12'><a href='javascript:void(0);' id='linkVersionHistory' onclick='javascript:ShowDialog()' class='btnCsrGeneric'/>View Version History</a></div></div>";
            formTable += "</div>";
            //End of Footer Section 
        }

        //End of Form HTML
        formTable += "</div>";
        return formTable;
    }
    catch (e) {
        console.log(e);
    }
}

//This function code set the required properties and call the OOTB (default) function that use to render Sharepoint Fields 
function getSPFieldRender(ctx, fieldName) {
    try {
        var fieldContext = ctx;
        //Get the filed Schema
        var result = ctx.ListSchema.Field.filter(function (obj) {
            return obj.Name == fieldName;
        });
        //Set the field Schema  & default value
        fieldContext.CurrentFieldSchema = result[0];
        fieldContext.CurrentFieldValue = ctx.ListData.Items[0][fieldName];
        //Call  OOTB field render function 
        return ctx.Templates.Fields[fieldName](fieldContext);
    }
    catch (e) {
        console.log(e);
    }
}

//This method formats the rowTemplate by replacing the placeholders based on the arguments passed.
String.prototype.FormatRow = function () {
    try {
        var content = this;
        for (var i = 0; i < arguments.length; i++) {
            var replacement = '{' + i + '}';
            content = content.replace(replacement, arguments[i]);
        }
        return content;
    }
    catch (e) {
        console.log(e);
    }
}

//This method displays the Version History page of the current list item in a Modal Dialog Window.
function ShowDialog() {
    try {
        var options =
        {
            autoSize: true,
            allowMaximize: true,
            title: 'Version History',
            showClose: true,
            url: _spPageContextInfo.webAbsoluteUrl + '/_layouts/15/Versions.aspx?list=' + _spPageContextInfo.listId + '&ID=' + GetUrlKeyValue('ID') + '&Source=' + _spPageContextInfo.webServerRelativeUrl + '/Lists/' + _spPageContextInfo.listTitle + '/AllItems.aspx',
        };
        SP.UI.ModalDialog.showModalDialog(options);
    }
    catch (e) {
        console.log(e);
    }
}

//This method tidy's the HTML content if there are unending tags or the HTML passed is malformed.
function TidyDynamicContent(html) {
    try {
        var d = document.createElement('div');
        d.innerHTML = html;
        return d.innerHTML;
    }
    catch (e) {
        console.log(e);
    }
}



