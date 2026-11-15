$pages = Get-ChildItem -Recurse -Filter "page.tsx" C:\Users\shaik\Desktop\mscurechain\Mscurechain-Frontend-Latest\app
$baseDir = "C:\Users\shaik\Desktop\mscurechain\Mscurechain-Frontend-Latest\app"

$report = @()
foreach ($p in $pages) {
    $rel = $p.DirectoryName.Substring($baseDir.Length).Replace("\", "/")
    if ($rel -eq "") { $rel = "/" }
    
    # Strip Next.js route groups like (portals)
    $cleanRoute = $rel -replace '/\([^)]+\)', ''
    if ($cleanRoute -eq "") { $cleanRoute = "/" }
    
    $htmlPath = ""
    $rscPath = ""
    if ($cleanRoute -eq "/") {
        $htmlPath = "C:\Users\shaik\Desktop\mscurechain\Mscurechain-Frontend-Latest\dist-mobile\index.html"
        $rscPath = "C:\Users\shaik\Desktop\mscurechain\Mscurechain-Frontend-Latest\dist-mobile\pages\index.rsc"
    } elseif ($cleanRoute.StartsWith("/[hospitalId]/")) {
        $sub = $cleanRoute.Substring("/[hospitalId]/".Length)
        $htmlPath = "C:\Users\shaik\Desktop\mscurechain\Mscurechain-Frontend-Latest\dist-mobile\pages\portal\$sub.html"
        $rscPath = "C:\Users\shaik\Desktop\mscurechain\Mscurechain-Frontend-Latest\dist-mobile\pages\portal\$sub.rsc"
    } elseif ($cleanRoute -eq "/[hospitalId]") {
        $htmlPath = "C:\Users\shaik\Desktop\mscurechain\Mscurechain-Frontend-Latest\dist-mobile\pages\portal\dashboard.html"
        $rscPath = "C:\Users\shaik\Desktop\mscurechain\Mscurechain-Frontend-Latest\dist-mobile\pages\portal\dashboard.rsc"
    } else {
        $trimmed = $cleanRoute.TrimStart("/")
        $htmlPath = "C:\Users\shaik\Desktop\mscurechain\Mscurechain-Frontend-Latest\dist-mobile\pages\$trimmed.html"
        $rscPath = "C:\Users\shaik\Desktop\mscurechain\Mscurechain-Frontend-Latest\dist-mobile\pages\$trimmed.rsc"
    }
    
    $hasHtml = if ($htmlPath -ne "") { Test-Path -LiteralPath $htmlPath } else { $false }
    $hasRsc = if ($rscPath -ne "") { Test-Path -LiteralPath $rscPath } else { $false }
    
    $report += [PSCustomObject]@{
        RawRoute = $rel
        CleanRoute = $cleanRoute
        HtmlExists = $hasHtml
        RscExists = $hasRsc
        HtmlPath = $htmlPath
        RscPath = $rscPath
    }
}

$missingHtml = $report | Where-Object { -not $_.HtmlExists }
$missingRsc = $report | Where-Object { -not $_.RscExists }

Write-Host "Total Next.js App Routes: $($report.Count)"
Write-Host "Routes with HTML existing: $(($report | Where-Object { $_.HtmlExists }).Count)"
Write-Host "Routes with RSC existing: $(($report | Where-Object { $_.RscExists }).Count)"
Write-Host "Missing HTML count: $($missingHtml.Count)"
Write-Host "Missing RSC count: $($missingRsc.Count)"
if ($missingHtml.Count -gt 0) {
    Write-Host "`nTruly Missing HTML routes:"
    $missingHtml | ForEach-Object { Write-Host "  $($_.CleanRoute)" }
}
if ($missingRsc.Count -gt 0) {
    Write-Host "`nTruly Missing RSC routes:"
    $missingRsc | ForEach-Object { Write-Host "  $($_.CleanRoute)" }
}
