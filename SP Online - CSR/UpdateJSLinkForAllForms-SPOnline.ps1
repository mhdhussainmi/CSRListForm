#===============================================================================================================================================================================================================
<#This script reads a csv file that contains a list of site collection url's along with the target list Titles; it then uploads the artefacts and sets the ListFormWebPart Properties on the desired List. #>
#===============================================================================================================================================================================================================

#region Global Variables
	$UserName = "" # Provide admin username
	$Password = "" # Provide admin password
	$SPOAdminUrl = "" # Provide SharePoint Online Tenant Admin Site Url
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

#region Get-SPOCredentials
	<#Function that retrieves the SharePoint Online Credentials to generate the Context for operations. #>
	Function Get-SPOCredentials([Parameter(Mandatory=$true)][ValidateNotNullOrEmpty()][string]$UserName,[Parameter(Mandatory=$true)][ValidateNotNullOrEmpty()][string]$Password=$(Throw "Password required."))
	{
		try
		{
		if([string]::IsNullOrEmpty($Password)) {
			$SecurePassword = Read-Host -Prompt "Enter the password" -AsSecureString 
		}
		else {
			$SecurePassword = $Password | ConvertTo-SecureString -AsPlainText -Force
		}
		return New-Object Microsoft.SharePoint.Client.SharePointOnlineCredentials($UserName, $SecurePassword)
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

#region Invoke-UploadArtefacts
	<# This function uploads the custom artefacts into the Master Page Gallery of a target Site Collection.#>
	Function Invoke-UploadArtefactsToMasterPageGallery([Microsoft.SharePoint.Client.ClientContext]$Context)
	{
		try
		{	
			#Retrieve list
			$List = $Context.Web.Lists.GetByTitle($MasterPageGalleryTitle)
			$Context.Load($List)
			$Context.ExecuteQuery()  
			Write-Host "Uploading artefacts. "$List.Title" is found" -ForegroundColor White
		
			#Upload file  
			foreach ($File in (Get-ChildItem $ArtefactsFolderPath -File))
			{	
				$FileStream = New-Object IO.FileStream($File.FullName,[System.IO.FileMode]::Open)
				$FileCreationInfo = New-Object Microsoft.SharePoint.Client.FileCreationInformation
				$FileCreationInfo.Overwrite = $true
				$FileCreationInfo.ContentStream = $FileStream
				$FileCreationInfo.URL = $File  
				$Upload = $List.RootFolder.Files.Add($FileCreationInfo)	
				$Context.Load($Upload)
				$Context.ExecuteQuery()  
				# Check if the file is a JavaScript Display Template. If so, set the metadata accordingly.	
				if($File.BaseName -eq $TemplateNameDisplay -or $File.BaseName -eq $TemplateNameEdit -or $File.BaseName -eq $TemplateNameNew)
				{				
					$item = $Upload.ListItemAllFields			
					$item["Title"] = $File.BaseName	
					$item["ContentTypeId"] = "0x0101002039C03B61C64EC4A04F5361F3851068"	
					$item["DisplayTemplateJSTargetControlType"] = "Form"	
					$item["DisplayTemplateJSTemplateType"] = "Override"	
					$item["DisplayTemplateJSTargetScope"] = "/"			  
					$item.Update()
					$Context.ExecuteQuery()  			 			
					Write-Host "JavaScript Display Template: "$File" uploaded successfully." -ForegroundColor Green
				}
				else
				{				
					$item = $Upload.ListItemAllFields			
					$item["Title"] = $File.BaseName	
					$item["ContentTypeId"] = "0x010100C5033D6CFB8447359FB795C8A73A2B19"			  
					$item.Update()
					$Context.ExecuteQuery()  
					Write-Host "Design file: "$File" uploaded successfully." -ForegroundColor Green
				}			
			}  
			Write-Host "Completed uploading artefacts" -ForegroundColor White	
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

#region Invoke-ListFormWebPartProperties
	<#This function updates the JSLink property of the ListFormWebParts of the desired SharePoint Online Form within a List.
	Example: NewForm.aspx; DispForm.aspx; EditForm.aspx
	#>
	Function Invoke-ConfigureListFormWebPartProperties([Microsoft.SharePoint.Client.ClientContext]$Context, [string]$ListTitle, [string]$FormTypeName, [string]$JsLinkPath)
	{
		try
		{
			Write-Host "Beginning to update JSLink property for List:"$ListTitle" & Page: "$FormTypeName"." -ForegroundColor White
			$Web = $Context.Web
			$context.Load($Web)
			$context.ExecuteQuery()
		
			$List = $Web.Lists.GetByTitle($ListTitle)
			$context.Load($List)
			$context.ExecuteQuery()
			
			$Forms = $List.Forms
			$context.Load($Forms)
			$context.ExecuteQuery()

			$Form = $Forms | Where-Object {$_.FormType -eq $FormTypeName}
			$context.Load($Form)
			$context.ExecuteQuery()

			$Page = $Web.GetFileByServerRelativeUrl($Form.ServerRelativeUrl);
			$context.Load($Page)
			$context.ExecuteQuery()

			$LimitedWebPartManager = $Page.GetLimitedWebPartManager("Shared")
			$context.Load($LimitedWebPartManager)
			$context.ExecuteQuery()

			$WebParts = $LimitedWebPartManager.WebParts
			$context.Load($WebParts)
			$context.ExecuteQuery()

			$WebPart = $WebParts[0]
			$context.Load($WebPart)
			$context.ExecuteQuery()

			$WebPart.WebPart.Properties["TemplateName"] = "ListForm"
			$WebPart.WebPart.Properties["JSLink"] = $JsLinkPath
			$WebPart.WebPart.Properties["CSRRenderMode"] = 2			
			$WebPart.SaveWebPartChanges();
			$context.Load($WebPart);
			$context.ExecuteQuery();
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
#endregion

#region Invoke-FormConfiguration
	# Function that initializes and performs all operations.
	Function Invoke-CSRListFormConfiguration()
	{
		try
		{
			#Load SharePoint CSOM Assemblies
			[System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SharePoint.Client")
			[System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SharePoint.Client.Runtime")	
		
			#SharePoint DLL are also available in DLL folder, Change the below path and map to the excat dll loaction to load dll's 
			#Load SharePoint CSOM Assemblies
			#Add-Type -Path "D:\dll\Microsoft.SharePoint.Client.dll"
			#Add-Type -Path "D:\dll\Microsoft.SharePoint.Client.Runtime.dll"	
		
			Write-Host "`n"
			Write-Host "OPERATIONS: Starting to upload artefacts and updating JSLink ListFormWebPart Property for All Forms" -ForegroundColor Magenta
			Write-Host ""
			Write-Host "***************************************************************************************************************************"

			# Connect to the SP Online Admin Site.
			$AdminContext = New-Object Microsoft.SharePoint.Client.ClientContext($SPOAdminUrl)
			$AdminContext.Credentials = Get-SPOCredentials -UserName $UserName -Password $Password
			if (!$AdminContext.ServerObjectIsNull.Value) 
			{ 
				Write-Host "Connected to SharePoint Online Admin site: '$SPOAdminUrl'" -ForegroundColor Green 
				Write-Host "========================================================================================================================" 
				Write-Host "Importing CSV File Data" -ForegroundColor Green 
				Write-Host "------------------------------------------------------------------------------------------------------------------------" 
				$CsvData = Import-csv -path $CsvFilePath
				# Perform the operations for each row of the CSV file.
				foreach ($row in $CsvData) {
					#Establish context for the site collection url.					
					$Context = New-Object Microsoft.SharePoint.Client.ClientContext($row.SiteCollectionUrl)
					$Context.Credentials = Get-SPOCredentials -UserName $UserName -Password $Password
					if (!$Context.ServerObjectIsNull.Value)
					{
						# Upload artefacts to the master page gallery of the site collection and configure listFormWebProperties of the SharePoint Online List Form.
						Write-Host "Executing operations for Site Collection URL: "$row.SiteCollectionUrl"" -ForegroundColor Yellow	
						Invoke-UploadArtefactsToMasterPageGallery -Context $Context
						Invoke-ConfigureListFormWebPartProperties -Context $Context -ListTitle $row.ListTitle -FormTypeName "DisplayForm" -JsLinkPath $DisplayFormJsLinks
						Invoke-ConfigureListFormWebPartProperties -Context $Context -ListTitle $row.ListTitle -FormTypeName "NewForm" -JsLinkPath $NewFormJsLinks
						Invoke-ConfigureListFormWebPartProperties -Context $Context -ListTitle $row.ListTitle -FormTypeName "EditForm" -JsLinkPath $EditFormJsLinks
						Write-Host "Completed operations for Site Collection URL: "$row.SiteCollectionUrl""  -ForegroundColor Yellow
						Write-Host ""
						Write-Host "***************************************************************************************************************************" 
					}					
					$Context.Dispose()
				}				
			}
			else
			{
				Write-Host "Unable to connect to SharePoint Online Admin site: '$SPOAdminUrl', Contact your System Administrator." -ForegroundColor Red
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
