// ==================================================================================================================================================================
// This is a JavaScript Display Template and it alters the Edit Form's Layout when set as the ListFormWebPart Properties on a desired SharePoint Online List. 
// ==================================================================================================================================================================

// Global variables
var currentItemId,
    currentWebUrl,
    currentListGUID;

var msFormToolBarHtml = '',
    msCsrAttachmentsHtml = '';

var metadataArray = [],
    footerArray = [],
    noteFieldsArray = [],
    attachmentsFieldArray = [],
    listViewFieldsArray = [],
    pictureFieldsArray = [],
    requiredMetadataFieldsArray = [],
    requiredNoteFieldsArray = [],
    requiredPictureFieldsArray = [],
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

//This function is called on the OnPostRender event and performs DOM Manipulations especially related to the attachments block.
function AlterDefaultViewAfterRender(ctx) {
    try {
        var msCsrAttachmentsDiv = document.querySelector("#csrAttachmentUploadDiv");
        if (msCsrAttachmentsDiv) {
            msCsrAttachmentsHtml = document.querySelector("#csrAttachmentUploadDiv").outerHTML;
            jQuery("#csrAttachmentUploadDiv").remove();
            jQuery(msCsrAttachmentsHtml).appendTo("#insertAttachmentsAfterRenderControls");
            jQuery(attachmentsFieldArray[0].ValueObject).appendTo("#insertAttachmentsAfterRender");
            jQuery(".ms-rtestate-write").css({ "border-style": "solid", "border-width": "1px", "border-color": "rgba(0,0,0,.125)" });
            jQuery("table td .ms-formtoolbar").find("input").removeClass("ms-ButtonHeightWidth").addClass("btnCsrGeneric");
            var firstTableData = jQuery("input[id$=diidIOGoBack]:last").parents("table.ms-formtoolbar:first").find("td.ms-toolbar:first");
            if (firstTableData) {
                jQuery(firstTableData).next().attr("width", "auto");
                jQuery(firstTableData).css({ "width": "99%", "padding-left": "20px" }).insertAfter(jQuery(firstTableData).parent().find("td.ms-toolbar:last"));
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
        GetDefaultListViewFields(ctx);

        //Get the Context Fields and seperate them into arrays that help build the Custom Form Layout 
        var fieldArray = ctx.ListSchema.Field;
        $.each(fieldArray, function (key, value) {
            if (value.ReadOnlyField == false) {
                if (value.Type == "Note") {
                    noteFieldsArray.push(value);
                }                
                else {
                    if (value.Name == "Attachments") {
                        var itemObject = {};
                        itemObject["Name"] = value.Title;
                        itemObject["ValueObject"] = getSPFieldRender(ctx, value.Name);
                        attachmentsFieldArray.push(itemObject);
                    }
                    else if(value.Type == "URL"){                        
                        pictureFieldsArray.push(value);
                    }
                    else {
                        metadataArray.push(value);
                    }
                }
            }
        });

        //Use the List View fields array and then seperate the unneccessary fields from the Metadata Array.
        if (listViewFieldsArray.length > 0) {
            //Check the field information available for data binding.
            $.each(metadataArray, function (key, value) {
                if (value.Required == true) {
                    //Add to array only if the field is selected in the All Items default list view.                    
                    var fieldObject = {};
                    fieldObject["Name"] = value.Title;
                    fieldObject["Required"] = value.Required;
                    fieldObject["InternalName"] = value.Name;
                    fieldObject["ValueObject"] = getSPFieldRender(ctx, value.Name);
                    requiredMetadataFieldsArray.push(fieldObject);
                }
                else {
                    var boolExists = $.inArray(value.Name, listViewFieldsArray);
                    if (boolExists != -1) {
                        //Add to array only if the field is selected in the All Items default list view.                    
                        var fieldObject = {};
                        fieldObject["Name"] = value.Title;
                        fieldObject["Required"] = value.Required;
                        fieldObject["InternalName"] = value.Name;
                        fieldObject["ValueObject"] = getSPFieldRender(ctx, value.Name);
                        filteredMetadataFieldsArray.push(fieldObject);
                    }
                }
            })
        }

        //Use the List View fields array and then seperate the unneccessary fields from the Notes Array.
        if (listViewFieldsArray.length > 0) {
            //Check the field information available for data binding.
            $.each(noteFieldsArray, function (key, value) {
                if (value.Required == true) {
                    //Add to array only if the field is selected in the All Items default list view.                    
                    var fieldObject = {};
                    fieldObject["Name"] = value.Title;
                    fieldObject["Required"] = value.Required;
                    fieldObject["InternalName"] = value.Name;
                    fieldObject["ValueObject"] = getSPFieldRender(ctx, value.Name);
                    requiredNoteFieldsArray.push(fieldObject);
                }
                else {
                    var boolExists = $.inArray(value.Name, listViewFieldsArray);
                    if (boolExists != -1) {
                        //Add to array only if the field is selected in the All Items default list view.                    
                        var fieldObject = {};
                        fieldObject["Name"] = value.Title;
                        fieldObject["Required"] = value.Required;
                        fieldObject["InternalName"] = value.Name;
                        fieldObject["ValueObject"] = getSPFieldRender(ctx, value.Name);
                        filteredNoteFieldsArray.push(fieldObject);
                    }
                }
            })
        }

        //Use the List View fields array and then seperate the unneccessary fields from the Pictures Array.
        if (listViewFieldsArray.length > 0) {
            //Check the field information available for data binding.
            $.each(pictureFieldsArray, function (key, value) {
                if (value.Required == true) {
                    //Add to array only if the field is selected in the All Items default list view.                    
                    var fieldObject = {};
                    fieldObject["Name"] = value.Title;
                    fieldObject["Required"] = value.Required;
                    fieldObject["InternalName"] = value.Name;
                    fieldObject["ValueObject"] = getSPFieldRender(ctx, value.Name);
                    requiredPictureFieldsArray.push(fieldObject);
                }
                else {
                    var boolExists = $.inArray(value.Name, listViewFieldsArray);
                    if (boolExists != -1) {
                        //Add to array only if the field is selected in the All Items default list view.                    
                        var fieldObject = {};
                        fieldObject["Name"] = value.Title;
                        fieldObject["Required"] = value.Required;
                        fieldObject["InternalName"] = value.Name;
                        fieldObject["ValueObject"] = getSPFieldRender(ctx, value.Name);
                        filteredPictureFieldsArray.push(fieldObject);
                    }
                }
            })
        }

        if (filteredMetadataFieldsArray.length > 0 || requiredMetadataFieldsArray.length > 0) {
            //Add all required fields by default to the sorted Metadata Array.
            $.each(requiredMetadataFieldsArray, function (key, value) {
                sortedMetadataFieldsArray.push(value);
            });

            //Sort the MetaData Filter Array which contains the non-required fields.
            $.each(listViewFieldsArray, function (key, value) {
                var fieldName = $.grep(filteredMetadataFieldsArray, function (filteredKey, filteredValue) {
                    //If its required field; then directly add it.
                    if (value.toLowerCase() == filteredKey.InternalName.toLowerCase()) {
                        return (filteredKey);
                    }
                });
                // If a fieldname is returned.
                if (fieldName.length > 0) {
                    var fieldObject = {};
                    fieldObject["Name"] = fieldName[0].Name;
                    fieldObject["InternalName"] = fieldName[0].InternalName;
                    fieldObject["ValueObject"] = fieldName[0].ValueObject;
                    sortedMetadataFieldsArray.push(fieldObject);
                }
            });
        }

        if (filteredNoteFieldsArray.length > 0 || requiredNoteFieldsArray.length > 0) {
            //Add all required fields by default to the sorted Metadata Array.
            $.each(requiredNoteFieldsArray, function (key, value) {
                sortedNoteFieldsArray.push(value);
            });

            //Sort the Notes Filter Array which contains the non-required fields.
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

        if (filteredPictureFieldsArray.length > 0 || requiredPictureFieldsArray.length > 0) {
            //Add all required fields by default to the sorted Metadata Array.
            $.each(requiredPictureFieldsArray, function (key, value) {
                sortedPictureFieldsArray.push(value);
            });

            //Sort the Notes Filter Array which contains the non-required fields.
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
function GetDefaultListViewFields(ctx) {
    try {
	var listId = "";
	managerField = SPClientTemplates.Utility.GetFormContextForCurrentField(ctx); 
	listId = managerField.listAttributes.Id; 
        jQuery.ajax({
            url: decodeURIComponent(_spPageContextInfo.webAbsoluteUrl) + "/_api/web/lists/getbyid('" + listId + "')/Views/getbytitle('All Items')/ViewFields",
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
            var metadataRowTemplate = "<div class='card-group'><div class='col-md-4 card' style='background-color:rgba(0,0,0,.125)'><div><h6 class='card-title'>{0}:</h6></div></div><div class='col-md-8'><div>{1}</div></div></div>";
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
            //End of Metadata Section
        }

        if (sortedNoteFieldsArray.length > 0) {
            //Start of Note Fields Section
            var noteFieldsRowFormat = '';
            var noteFieldsRowTemplate = "<div class='card-group'><div class='col-md-2 card' style='background-color:rgba(0,0,0,.125)'><div><h6 class='card-title'>{0}:</h6></div></div><div class='col-md-10'><div>{1}</div></div></div>";
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
            //End of Note Fields Section
        }
        
        if (sortedPictureFieldsArray.length > 0) { 
            //Start of Picture Fields Section           
            var pictureFieldsRowFormat = '';
            var pictureFieldsRowTemplate = "<div class='card-group'><div class='col-md-2 card' style='background-color:rgba(0,0,0,.125)'><div><h6 class='card-title'>{0}:</h6></div></div><div class='col-md-10 card'><div id='imageCsrContainer'>{1}</div></div></div>";
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
            //End of Picture Fields Section
        }        

        //Start of Attachments Fields Section    
        var attachmentsRowTemplate = "<div class='card-group'><div class='col-md-2 card' style='background-color:rgba(0,0,0,.125)'><div><h6 class='card-title'>Attachments:</h6></div></div><div class='col-md-10'><div id='insertAttachmentsAfterRender' class='col-md-12 card-group'><div id='insertAttachmentsAfterRenderImage' class='col-md-1'><a href='#' id='idBindAttachmentsControl' onclick='javascript:BindAttachmentsControl()' class='ms-cui-ctl-large'><span class='ms-cui-ctl-largeIconContainer'><span class='ms-cui-img-32by32 ms-cui-img-cont-float ms-cui-imageDisabled'><img style='top: -239px;left: -443px;' src='/_layouts/15/1033/images/formatmap32x32.png?rev=44'></span></span></a></div><div id='insertAttachmentsAfterRenderControls' class='col-md-11'></div></div></div></div>";
        formTable += "<div id='attachmentsContainer' class='row'>";
        formTable += "<div class='h-divider'></div>";
        formTable += "<div class='col-md-12 card-group'>";
        formTable += "<div class='col-md-12'>";
        formTable += attachmentsRowTemplate;
        formTable += "</div>";
        formTable += "</div>";
        formTable += "</div>";
        //End of Attachments Fields Section 

        //Start of Footer Section
        formTable += "<div id='footerContainer' class='row'>";
        formTable += "<div class='h-divider'></div>";
        //Save Button
        formTable += "<div class='col-md-12 card-group'><div class='col-md-12'>" + msFormToolBarHtml + "</div></div>";
        formTable += "</div>";
        //End of Footer Section                

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

// This function provides the rendering logic for list view 
function BindAttachmentsControl() {
    try {
        jQuery("#part1").css("display", "none");
        jQuery("#partAttachment").css("display", "block");
        jQuery(".ms-descriptiontext").css("display", "none");
        jQuery(".ms-formlabel").css("display", "none");
        jQuery(".ms-formline").css("display", "none");
        jQuery(".ms-ButtonHeightWidth").addClass("btnCsrGeneric");
        var instance = SP.Ribbon.PageManager.get_instance();
        if (instance)
            instance.get_commandDispatcher().executeCommand("Ribbon.ListForm.Edit.Actions.AttachFile", null);
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



