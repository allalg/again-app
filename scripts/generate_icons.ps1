Add-Type -AssemblyName System.Drawing

$iconsDir = Join-Path $PSScriptRoot "..\public\icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null
}

$sizes = 72, 96, 128, 144, 152, 192, 384, 512

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Gradient background
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $color1 = [System.Drawing.ColorTranslator]::FromHtml('#7c3aed')
    $color2 = [System.Drawing.ColorTranslator]::FromHtml('#2563eb')
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $color1, $color2, 45.0
    
    # Rounded corners
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $radius = [int]($size * 0.22)
    $dia = $radius * 2
    $path.AddArc(0, 0, $dia, $dia, 180, 90)
    $path.AddArc($size - $dia, 0, $dia, $dia, 270, 90)
    $path.AddArc($size - $dia, $size - $dia, $dia, $dia, 0, 90)
    $path.AddArc(0, $size - $dia, $dia, $dia, 90, 90)
    $path.CloseFigure()
    
    $g.FillPath($brush, $path)

    # Checkmark/streak
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), ([float]($size * 0.08))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $p1 = New-Object System.Drawing.PointF ([float]($size * 0.28)), ([float]($size * 0.52))
    $p2 = New-Object System.Drawing.PointF ([float]($size * 0.44)), ([float]($size * 0.68))
    $p3 = New-Object System.Drawing.PointF ([float]($size * 0.72)), ([float]($size * 0.34))
    $points = [System.Drawing.PointF[]]@($p1, $p2, $p3)
    $g.DrawLines($pen, $points)

    # Accent flame dot
    $dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#f59e0b'))
    $dotDia = [float]($size * 0.12)
    $g.FillEllipse($dotBrush, [float]($size * 0.68 - $dotDia/2), [float]($size * 0.34 - $dotDia/2), $dotDia, $dotDia)

    $destPath = Join-Path $iconsDir "icon-${size}x${size}.png"
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

$icon192 = Join-Path $iconsDir "icon-192x192.png"
$appleTouch = Join-Path $PSScriptRoot "..\public\apple-touch-icon.png"
Copy-Item $icon192 $appleTouch -Force

# Create og-image (1200x630)
$ogBmp = New-Object System.Drawing.Bitmap 1200, 630
$ogG = [System.Drawing.Graphics]::FromImage($ogBmp)
$ogG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$ogRect = New-Object System.Drawing.Rectangle 0, 0, 1200, 630
$ogBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $ogRect, ([System.Drawing.ColorTranslator]::FromHtml('#0a0a0f')), ([System.Drawing.ColorTranslator]::FromHtml('#1e1035')), 45.0
$ogG.FillRectangle($ogBrush, $ogRect)

$titleFont = [System.Drawing.Font]::new("Arial", [float]54, [System.Drawing.FontStyle]::Bold)
$subFont = [System.Drawing.Font]::new("Arial", [float]22, [System.Drawing.FontStyle]::Regular)
$accentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#a855f7'))
$textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$subBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#a1a1aa'))

$ogG.DrawString("STREAKPACT", $titleFont, $accentBrush, 100, 200)
$ogG.DrawString("Social Accountability Challenge Platform", $subFont, $textBrush, 100, 280)
$ogG.DrawString("Form 90-day pacts with friends. Submit daily photo proof. Stay accountable or pay penalties.", $subFont, $subBrush, 100, 330)

$ogPath = Join-Path $PSScriptRoot "..\public\og-image.png"
$ogBmp.Save($ogPath, [System.Drawing.Imaging.ImageFormat]::Png)
$ogG.Dispose()
$ogBmp.Dispose()

Write-Output "PWA assets generated successfully"
