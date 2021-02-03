#===============================================================================================================================================================================================================
<#This script reads a csv file that contains a list of site collection url's along with the target list Titles; it then uploads the artefacts and sets the ListFormWebPart Properties on the desired List. #>
# Version: 				1.0
#===============================================================================================================================================================================================================

#region Global Variables
	$ArtefactsFolderPath = ($pwd).path + "\Artefacts" # Local path to folder "Artefacts" from the Package
	$CsvFilePath = ($pwd).path + "\ListFormWebPartsToUpdate.csv" # Do NOT change this value unless real file name of the CSV has changed.

	#Re-Usable variables: Do NOT change them.
	$MasterPageGalleryTitle = "Master Page Gallery"
	$DisplayFormJsLinks = "~site/_catalogs/masterpage/jquery.min.js|~site/_catalogs/masterpage/JsLink.Template.DisplayForm.js" # Do NOT change this value unless real file name of the JSLink has changed.
	$EditFormJsLinks = "~site/_catalogs/masterpage/jquery.min.js|~site/_catalogs/masterpage/JsLink.Template.EditForm.js" # Do NOT change this value unless real file name of the JSLink has changed.
	$NewFormJsLinks = "~site/_catalogs/masterpage/jquery.min.js|~site/_catalogs/masterpage/JsLink.Template.NewForm.js" # Do NOT change this value unless real file name of the JSLink has changed.
	$TemplateNameDisplay = "JsLink.Template.DisplayForm" # Do NOT change this value unless real file name of the Javascript Display Template has changed.
	$TemplateNameEdit = "JsLink.Template.EditForm" # Do NOT change this value unless real file name of the Javascript Display Template has changed.
	$TemplateNameNew = "JsLink.Template.NewForm" # Do NOT change this value unless real file name of the Javascript Display Template has changed.	
#endregion


#region Invoke-UploadArtefacts
	<# This function uploads the custom artefacts into the Master Page Gallery of a target Site Collection.#>
	
Function Invoke-UploadArtefactsToMasterPageGallery
{
	[CmdletBinding()]
	Param(
		[string] $siteCollectionURL
	)
    Process
	{
        try{ 
            $spWeb = Get-SPWeb $siteCollectionURL
		    $List = $spWeb.Lists[$MasterPageGalleryTitle]
            Write-Host "Uploading artefacts. "$List.Title" is found" -ForegroundColor White
		    $files = ([System.IO.DirectoryInfo] (Get-Item $ArtefactsFolderPath)).GetFiles()

            foreach($file in $files)
            {
            Write-Host "Uploading "$file.FullName"...."
                 $fileStream = ([System.IO.FileInfo] (Get-Item $file.FullName)).OpenRead()
                 $folder =  $spWeb.getfolder($List.RootFolder)
                 Write-Host $folder
                 $uploadFile = $folder.Files.Add($folder.Url + "/" + $file.Name, [System.IO.Stream]$fileStream, $true)
	             $fileStream.Close();
                if($file.BaseName -eq $TemplateNameDisplay -or $file.BaseName -eq $TemplateNameEdit -or $file.BaseName -eq $TemplateNameNew)
	                {				
		                $item = $uploadFile.ListItemAllFields			
		                $item["Title"] = $File.BaseName	
		                $item["ContentTypeId"] = "0x0101002039C03B61C64EC4A04F5361F3851068"	
		                $item["DisplayTemplateJSTargetControlType"] = "Form"	
		                $item["DisplayTemplateJSTemplateType"] = "Override"	
		                $item["DisplayTemplateJSTargetScope"] = "/"			  
		                $item.Update()
		 			
		                Write-Host "JavaScript Display Template: "$File" uploaded successfully." -ForegroundColor Green
	                }
	                else
	                {				
		                $item = $uploadFile.ListItemAllFields			
		                $item["Title"] = $File.BaseName	
		                $item["ContentTypeId"] = "0x010100C5033D6CFB8447359FB795C8A73A2B19"			  
		                $item.Update()
		                Write-Host "Design file: "$File" uploaded successfully." -ForegroundColor Green
	                }
            }
            Write-Host "Completed uploading artefacts" -ForegroundColor White

        }
        catch{
            Write-Host "Unknown error occurred." -ForegroundColor Red
			Write-Host ""
			Write-Host $_.Exception.ToString() -ForegroundColor Red
		}
		finally
		{
			Write-Host ""
		}
    }
}


#region Invoke-ListFormWebPartProperties
	<#This function updates the JSLink property of the ListFormWebParts of the desired SharePoint Form within a List.
	Example: NewForm.aspx; DispForm.aspx; EditForm.aspx
	#>
	Function Invoke-ConfigureListFormWebPartProperties
	{
		[CmdletBinding()]
		Param(
			[string] $siteCollectionURL,
			[string] $ListTitle,
			[string] $FormTypeName,
			[string] $JsLinkPath
		)
		Process{
			try
			{
				Write-Host "Beginning to update JSLink property for List:"$ListTitle" & Page: "$FormTypeName"." -ForegroundColor White

				$Web = Get-SPWeb $siteCollectionURL
			
				$List = $Web.Lists[$ListTitle]
				
				$Forms = $List.Forms

				$Form = $Forms | Where-Object {$_.Type -eq $FormTypeName}

				$Page = $Web.GetFile($Form.ServerRelativeUrl);

				$LimitedWebPartManager = $Page.GetLimitedWebPartManager("Shared")

				$WebParts = $LimitedWebPartManager.WebParts

				$WebPart = $WebParts[0]

				$WebPart.TemplateName = "ListForm"
				$WebPart.JSLink = $JsLinkPath
				$WebPart.CSRRenderMode = 2			
				$LimitedWebPartManager.SaveChanges($WebPart)

				Write-Host "Completed successfully" -ForegroundColor Green
			}
			catch [System.Exception]
			{
				Write-Host "Unknown error occurred." -ForegroundColor Red
				Write-Host ""
				Write-Host $_.Exception.ToString() -ForegroundColor Red
			}
			finally
			{
				Write-Host ""
			}
		}
	}
#endregion

#region Invoke-FormConfiguration
	# Function that initializes and performs all operations.
	Function Invoke-CSRListFormConfiguration()
	{
		try
		{
			#Load SharePoint PowerShell Assemblies
			If ((Get-PSSnapin "Microsoft.SharePoint.PowerShell" -ErrorAction SilentlyContinue) -eq $null) 
			{
				Add-PSSnapin "Microsoft.SharePoint.PowerShell" -ErrorAction SilentlyContinue
			}
		
			
			Write-Host "OPERATIONS: Starting to Setup CSR-JS Link" -ForegroundColor Magenta
			Write-Host ""
			Write-Host "***************************************************************************************************************************"

			Write-Host "Fetching Site Collection URL from CSV File Data" -ForegroundColor Green 
			Write-Host "------------------------------------------------------------------------------------------------------------------------" 
			$csvData = Import-csv -path $csvFilePath
			# Perform the operations for each row of the CSV file.
			Foreach ($row In $csvData) 
			{
					# Upload artefacts to the master page gallery of the site collection and configure listFormWebProperties of the SharePoint List Form.
						Write-Host "Executing operations for Site Collection URL: "$row.SiteCollectionUrl"" -ForegroundColor Yellow	
						Invoke-UploadArtefactsToMasterPageGallery -siteCollectionURL $row.SiteCollectionUrl
						Invoke-ConfigureListFormWebPartProperties -siteCollectionURL $row.SiteCollectionUrl -ListTitle $row.ListTitle -FormTypeName "PAGE_DISPLAYFORM" -JsLinkPath $DisplayFormJsLinks
						Invoke-ConfigureListFormWebPartProperties -siteCollectionURL $row.SiteCollectionUrl -ListTitle $row.ListTitle -FormTypeName "PAGE_NEWFORM" -JsLinkPath $NewFormJsLinks
					    Invoke-ConfigureListFormWebPartProperties -siteCollectionURL $row.SiteCollectionUrl -ListTitle $row.ListTitle -FormTypeName "PAGE_EDITFORM" -JsLinkPath $EditFormJsLinks
						Write-Host "Completed operations for Site Collection URL: "$row.SiteCollectionUrl""  -ForegroundColor Yellow
						Write-Host ""
						Write-Host "***************************************************************************************************************************" 
			}					
			
			Write-Host "OPERATIONS: Completed successfully" -ForegroundColor Magenta
			$AdminContext.Dispose()
		}
		catch [System.Exception]
		{
			Write-Host "Unknown error occurred." -ForegroundColor Red
			Write-Host ""
			Write-Host $_.Exception.ToString() -ForegroundColor Red
		}
		finally
		{
			Write-Host ""
		}
	}
#endregion

#Call the Start Operations function.
Invoke-CSRListFormConfiguration
