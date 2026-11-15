Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\shaik\Desktop\mscurechain\Mscurechain-Frontend-Latest\public\assets\logo.png"
$resDir = "C:\Users\shaik\Desktop\mscurechain\Mscurechain-Frontend-Latest\android\app\src\main\res"

function Resize-And-Save {
    param (
        [string]$outputPath,
        [int]$canvasWidth,
        [int]$canvasHeight,
        [double]$scaleRatio = 0.54,
        [System.Drawing.Color]$bgColor = [System.Drawing.Color]::Transparent,
        [bool]$isRound = $false
    )

    $srcImg = [System.Drawing.Image]::FromFile($sourcePath)
    $bmp = New-Object System.Drawing.Bitmap($canvasWidth, $canvasHeight)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($isRound) {
        # Fill circle with white background
        $g.Clear([System.Drawing.Color]::Transparent)
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $g.FillEllipse($brush, 0, 0, $canvasWidth - 1, $canvasHeight - 1)
        $brush.Dispose()
    } elseif ($bgColor -ne [System.Drawing.Color]::Transparent) {
        $g.Clear($bgColor)
    } else {
        $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    }

    # Calculate aspect ratio
    $srcRatio = $srcImg.Width / $srcImg.Height
    $targetW = [int]($canvasWidth * $scaleRatio)
    $targetH = [int]($targetW / $srcRatio)

    if ($targetH -gt ($canvasHeight * $scaleRatio)) {
        $targetH = [int]($canvasHeight * $scaleRatio)
        $targetW = [int]($targetH * $srcRatio)
    }

    $destX = [int](($canvasWidth - $targetW) / 2)
    $destY = [int](($canvasHeight - $targetH) / 2)

    $g.DrawImage($srcImg, $destX, $destY, $targetW, $targetH)
    $g.Dispose()
    $srcImg.Dispose()

    # Save PNG
    $destDir = [System.IO.Path]::GetDirectoryName($outputPath)
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Generated: $outputPath ($canvasWidth x $canvasHeight)"
}

# 1. Generate Mipmap Icons with exact safe-zone padding
$densities = @(
    @{ Name = "mipmap-mdpi";    Icon = 48;  Fg = 108 },
    @{ Name = "mipmap-hdpi";    Icon = 72;  Fg = 162 },
    @{ Name = "mipmap-xhdpi";   Icon = 96;  Fg = 216 },
    @{ Name = "mipmap-xxhdpi";  Icon = 144; Fg = 324 },
    @{ Name = "mipmap-xxxhdpi"; Icon = 192; Fg = 432 }
)

foreach ($d in $densities) {
    $dir = Join-Path $resDir $d.Name
    
    # Adaptive Foreground (transparent, centered 54% safe zone for 1.295 aspect ratio)
    Resize-And-Save -outputPath (Join-Path $dir "ic_launcher_foreground.png") `
                    -canvasWidth $d.Fg -canvasHeight $d.Fg -scaleRatio 0.54 `
                    -bgColor ([System.Drawing.Color]::Transparent)

    # Legacy / fallback Launcher (white background, 72% logo)
    Resize-And-Save -outputPath (Join-Path $dir "ic_launcher.png") `
                    -canvasWidth $d.Icon -canvasHeight $d.Icon -scaleRatio 0.72 `
                    -bgColor ([System.Drawing.Color]::White)

    # Round Launcher (white circular background, 60% logo)
    Resize-And-Save -outputPath (Join-Path $dir "ic_launcher_round.png") `
                    -canvasWidth $d.Icon -canvasHeight $d.Icon -scaleRatio 0.60 `
                    -bgColor ([System.Drawing.Color]::White) -isRound $true
}

# 2. Generate Splash Screens
$splashes = @(
    @{ Dir = "drawable";             W = 480;  H = 800 },
    @{ Dir = "drawable-port-mdpi";   W = 320;  H = 480 },
    @{ Dir = "drawable-port-hdpi";   W = 480;  H = 800 },
    @{ Dir = "drawable-port-xhdpi";  W = 720;  H = 1280 },
    @{ Dir = "drawable-port-xxhdpi"; W = 960;  H = 1600 },
    @{ Dir = "drawable-port-xxxhdpi";W = 1280; H = 1920 },
    @{ Dir = "drawable-land-mdpi";   W = 480;  H = 320 },
    @{ Dir = "drawable-land-hdpi";   W = 800;  H = 480 },
    @{ Dir = "drawable-land-xhdpi";  W = 1280; H = 720 },
    @{ Dir = "drawable-land-xxhdpi"; W = 1600; H = 960 },
    @{ Dir = "drawable-land-xxxhdpi";W = 1920; H = 1280 }
)

foreach ($s in $splashes) {
    $dir = Join-Path $resDir $s.Dir
    Resize-And-Save -outputPath (Join-Path $dir "splash.png") `
                    -canvasWidth $s.W -canvasHeight $s.H -scaleRatio 0.38 `
                    -bgColor ([System.Drawing.Color]::White)
}

Write-Output "All icons and splash screens successfully generated with perfect safe-zone fit!"
