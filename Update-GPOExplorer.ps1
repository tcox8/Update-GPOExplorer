#############################################################################
# Author  : Tyler Cox
# https://github.com/tcox8
#
# Version : 1.0
# Created : 09/03/2025
# Modified: 
#
# Purpose : This script will create a webpage that can display group policies and search through all GPOs.
#
# Requirements:  PowerShell 5+, HTMLAgilityPack.dll (included in SupportFiles folder)
#
# Special Thanks: https://html-agility-pack.net/ for their excellent HTML parsing 
#             
# Change Log:  Ver 1.0 - Initial release
#
#############################################################################



# ---- Variables to Edit ---- #
# Folder where you want to save the reports
$reportDir = "C:\inetpub\gpo\reports"





# ---- Script Start (don't edit below this) ---- #
$output = @()

# Create the directory if it doesn't exist
if (!(Test-Path -Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force
}

# Get all GPOs
$gpos = Get-GPO -All

# Export each GPO as an HTML report
foreach ($gpo in $gpos) {
    $fileName = ($gpo.DisplayName -replace '[\\\/:*?"<>|]', '_') + ".html"
    $filePath = Join-Path $reportDir $fileName

    Get-GPOReport -Guid $gpo.Id -ReportType Html -Path $filePath
}



Add-Type -Path "C:\inetpub\gpo\supportfiles\HtmlAgilityPack.dll"  # Only needed if you want to use HtmlAgilityPack (included in SupportFiles folder)


# Loop through HTML files
Get-ChildItem -LiteralPath $reportDir -Filter *.html | ForEach-Object {
    $path = $_.FullName
    $name = $_.BaseName
    $file = "reports/$($_.Name)"

    # Load HTML and remove script/style content
    $html = Get-Content -LiteralPath $path -Raw

    # Use .NET HtmlAgilityPack 
    $doc = New-Object -TypeName "HtmlAgilityPack.HtmlDocument"
    $doc.LoadHtml($html)

    # Remove script and style nodes
    $doc.DocumentNode.SelectNodes('//script|//style') | ForEach-Object { $_.Remove() }

    # Get visible text only
    $textOnly = $doc.DocumentNode.InnerText -replace '\s+', ' ' -replace '&nbsp;', ' '

    $output += [PSCustomObject]@{
        name = $name
        file = $file
        #content = $textOnly.Substring(0, [Math]::Min(10000, $textOnly.Length)) #used for testing, returns only partial of GPO (not great for searching)
        content = $textOnly
    }
}

# Save search index as JSON
$output | ConvertTo-Json -Depth 5 | Set-Content -Path "$reportDir\..\searchIndex.json" -Encoding UTF8