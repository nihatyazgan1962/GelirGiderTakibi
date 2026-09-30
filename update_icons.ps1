Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Nihat\.gemini\antigravity-ide\brain\61606600-7b9c-47ff-9f3c-00a825a7faa3\hesabim_app_icon_1790356815247.jpg"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image($img, $width, $height, $outPath) {
    $destRect = [System.Drawing.Rectangle]::new(0, 0, $width, $height)
    $destImg = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destImg)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($img, $destRect, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $destImg.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destImg.Dispose()
}

function Create-AdaptiveForeground($img, $size, $outPath) {
    $destImg = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destImg)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # In adaptive icons, center 68% contains the visible artwork so "HESABIM" stays inside the round/squircle mask
    $contentSize = [int]($size * 0.70)
    $offset = [int](($size - $contentSize) / 2)
    $destRect = [System.Drawing.Rectangle]::new($offset, $offset, $contentSize, $contentSize)
    
    $g.DrawImage($img, $destRect, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $destImg.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destImg.Dispose()
}

function Create-SolidBackground($size, $outPath, $hexColor) {
    $destImg = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destImg)
    $color = [System.Drawing.ColorTranslator]::FromHtml($hexColor)
    $brush = [System.Drawing.SolidBrush]::new($color)
    $g.FillRectangle($brush, 0, 0, $size, $size)
    $brush.Dispose()
    $g.Dispose()
    $destImg.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destImg.Dispose()
}

# 1. Update Assets
Resize-Image $srcImg 1024 1024 "assets/icon.png"
Create-AdaptiveForeground $srcImg 1024 "assets/android-icon-foreground.png"
Create-SolidBackground 1024 "assets/android-icon-background.png" "#0B4730"
Create-AdaptiveForeground $srcImg 512 "assets/splash-icon.png"
Resize-Image $srcImg 196 196 "assets/favicon.png"

# 2. Update Android Mipmap Folders
$densities = @(
    @{ name = "mdpi"; icon = 48; fg = 108 },
    @{ name = "hdpi"; icon = 72; fg = 162 },
    @{ name = "xhdpi"; icon = 96; fg = 216 },
    @{ name = "xxhdpi"; icon = 144; fg = 324 },
    @{ name = "xxxhdpi"; icon = 192; fg = 432 }
)

foreach ($d in $densities) {
    $dir = "android/app/src/main/res/mipmap-" + $d.name
    if (Test-Path $dir) {
        Get-ChildItem -Path $dir -Filter "*.webp" | Remove-Item -Force
        
        Resize-Image $srcImg $d.icon $d.icon "$dir/ic_launcher.png"
        Resize-Image $srcImg $d.icon $d.icon "$dir/ic_launcher_round.png"
        Create-AdaptiveForeground $srcImg $d.fg "$dir/ic_launcher_foreground.png"
        Create-SolidBackground $d.fg "$dir/ic_launcher_background.png" "#0B4730"
        Create-AdaptiveForeground $srcImg $d.fg "$dir/ic_launcher_monochrome.png"
        Write-Host "Updated mipmap-$($d.name)"
    }
}

$srcImg.Dispose()
Write-Host "Successfully generated all launcher icons with HESABIM design!"
