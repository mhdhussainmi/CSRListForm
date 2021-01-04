using System;
using System.IO;
using System.Security;
using System.Threading;
using System.Xml;
using System.Xml.Linq;
using Microsoft.SharePoint.Client;
using OfficeDevPnP.Core.Framework.Provisioning.Connectors;
using OfficeDevPnP.Core.Framework.Provisioning.Model;
using OfficeDevPnP.Core.Framework.Provisioning.ObjectHandlers;
using OfficeDevPnP.Core.Framework.Provisioning.Providers.Xml;

namespace CustomListForm
{
    class Program
    {
        static void Main(string[] args)
        {
            try
            {
                // Collect information 
                ConsoleColor defaultForeground = Console.ForegroundColor;
                string targetWebUrl = GetInput("Enter the URL of the template site: ", false, defaultForeground);
                string userName = GetInput("Enter your user name:", false, defaultForeground);
                string password = GetInput("Enter your password:", true, defaultForeground);

                //Provision Site Columns, Site Content Types, List Instances & Document Libraries 
                ApplyProvisioningTemplateSchema(targetWebUrl, userName, password, Constants.CountryXmlFile);
                ApplyProvisioningTemplateSchema(targetWebUrl, userName, password, Constants.CSRListFormsXmlFile);

                Console.ReadLine();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Exception occured in Main method: " + ex.Message);
            }
        }

        /// <summary>
        /// This method is to retrieve the Input from the user to connect to SP Online.
        /// </summary>
        /// <param name="label"></param>
        /// <param name="isPassword"></param>
        /// <param name="defaultForeground"></param>
        /// <returns></returns>
        private static string GetInput(string label, bool isPassword, ConsoleColor defaultForeground)
        {
            string value = "";
            try
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("{0} : ", label);
                Console.ForegroundColor = defaultForeground;
                for (ConsoleKeyInfo keyInfo = Console.ReadKey(true); keyInfo.Key != ConsoleKey.Enter; keyInfo = Console.ReadKey(true))
                {
                    if (keyInfo.Key == ConsoleKey.Backspace)
                    {
                        if (value.Length > 0)
                        {
                            value = value.Remove(value.Length - 1);
                            Console.SetCursorPosition(Console.CursorLeft - 1, Console.CursorTop);
                            Console.Write(" ");
                            Console.SetCursorPosition(Console.CursorLeft - 1, Console.CursorTop);
                        }
                    }
                    else if (keyInfo.Key != ConsoleKey.Enter)
                    {
                        if (isPassword)
                        {
                            Console.Write("*");
                        }
                        else
                        {
                            Console.Write(keyInfo.KeyChar);
                        }
                        value += keyInfo.KeyChar;
                    }
                }
                Console.WriteLine("");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Exception occured in GetInput Method: " + ex.Message);
            }
            return value;
        }

        /// <summary>
        /// This method is to provision site pages, content editor web part and site navigation
        /// </summary>
        /// <param name="webUrl"></param>
        /// <param name="userName"></param>
        /// <param name="password"></param>
        /// <param name="templatePath"></param>
        private static void ApplyProvisioningTemplateSchema(string webUrl, string userName, string password, string templatePath)
        {
            try
            {
                // Create secure string
                SecureString pwd = new SecureString();
                foreach (char c in password.ToCharArray()) pwd.AppendChar(c);

                // Get current execution directory
                string path = System.Reflection.Assembly.GetExecutingAssembly().Location;
                var directory = Path.GetDirectoryName(path);
                var configPathRes = Path.Combine(directory, Constants.ConfigFolderPath);
                Console.WriteLine("Apply Provisioning Template Started for " + templatePath + "...");
                Console.WriteLine();

                // Create Provisioning Template object using current directory Path
                XMLTemplateProvider provider = new XMLFileSystemTemplateProvider(directory, "");
                ProvisioningTemplate template = provider.GetTemplate(configPathRes + "\\" + templatePath);

                // File System Connector is intended to add Config path as default path when PnP Core read the XML Templates. 
                // On this way, we can put relative references inside the XML Templates.  
                FileSystemConnector connector = new FileSystemConnector(configPathRes, "");
                template.Connector = connector;

                using (var ctx = new ClientContext(webUrl))
                {
                    ctx.Credentials = new SharePointOnlineCredentials(userName, pwd);
                    ctx.RequestTimeout = Timeout.Infinite;

                    Web web = ctx.Web;
                    ctx.Load(web);
                    ctx.ExecuteQueryRetry();

                    Console.WriteLine("Site URL to which template is applied: " + ctx.Web.Url);
                    Console.WriteLine();

                    // Create this object to track the provisioning stages
                    ProvisioningTemplateApplyingInformation ptai = new ProvisioningTemplateApplyingInformation
                    {
                        ProgressDelegate = (message, progress, total) =>
                        {
                            Console.WriteLine("{0:00}/{1:00} - {2}", progress, total, message);
                        },
                        MessagesDelegate = (message, messageType) =>
                        {
                            Console.WriteLine("{0} - {1}", messageType, message);
                        }
                    };
                    // Apply Provisioning Template to Web Object (Not to Site object).
                    web.ApplyProvisioningTemplate(template, ptai);
                    Console.WriteLine("Done! " + templatePath + " applied.");
                    Console.WriteLine("");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Exception occured while ApplyProvisioningTemplate for" + templatePath + ": " + ex.Message);
            }
        }

    }
}
