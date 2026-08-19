# scripts/gen-assets.ps1
#
# Gera todos os icones e cards de compartilhamento a partir de public/Mlogo.png.
#
# Rode do Windows, na raiz do Meninger-Front:
#   npm run og:routes                        # atualiza scripts/categorias.txt
#   powershell -File scripts/gen-assets.ps1
#
# Nao roda no build: os PNGs sao commitados. Isso mantem o build da Vercel
# limpo e independente de Windows.
#
# Regras que parecem detalhe mas nao sao:
#   - Mlogo.png e BRANCO com fundo transparente. Todo icone precisa de fundo
#     solido, senao some na aba do navegador e vira quadrado branco no preview.
#   - apple-touch-icon vai QUADRADO e sem canal alfa: o iOS aplica a propria
#     mascara por cima, e cantos ja arredondados sobrepoem feio.
#   - maskable pede logo menor: o Android corta ate 20% de cada borda.

Add-Type -AssemblyName System.Drawing

$root   = Split-Path -Parent $PSScriptRoot
$public = Join-Path $root "public"
$src    = [System.Drawing.Image]::FromFile((Join-Path $public "Mlogo.png"))
$bgHex  = "#020617"
$bg     = [System.Drawing.ColorTranslator]::FromHtml($bgHex)

function Get-RoundedPath {
    param([int]$Size, [int]$R)
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $R * 2
    $p.AddArc(0, 0, $d, $d, 180, 90)
    $p.AddArc($Size - $d, 0, $d, $d, 270, 90)
    $p.AddArc($Size - $d, $Size - $d, $d, $d, 0, 90)
    $p.AddArc(0, $Size - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    return $p
}

function New-Icon {
    param([int]$Size, [double]$Ratio, [string]$Out, [double]$Round = 0)

    if ($Round -gt 0) {
        $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    } else {
        $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    }
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'; $g.PixelOffsetMode = 'HighQuality'

    if ($Round -gt 0) {
        $g.Clear([System.Drawing.Color]::Transparent)
        $path  = Get-RoundedPath -Size $Size -R ([int]($Size * $Round))
        $brush = New-Object System.Drawing.SolidBrush($bg)
        $g.FillPath($brush, $path)
        $brush.Dispose(); $path.Dispose()
    } else {
        $g.Clear($bg)
    }

    $box = $Size * $Ratio
    $sc  = [Math]::Min($box / $src.Width, $box / $src.Height)
    $w = [int]($src.Width * $sc); $h = [int]($src.Height * $sc)
    $g.DrawImage($src, [int](($Size - $w) / 2), [int](($Size - $h) / 2), $w, $h)

    $bmp.Save((Join-Path $public $Out), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Write-Output ("  icone  {0}" -f $Out)
}

function New-OgCard {
    param([string]$Label, [string]$Out)

    $W = 1200; $H = 630
    $bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode='AntiAlias'; $g.InterpolationMode='HighQualityBicubic'
    $g.PixelOffsetMode='HighQuality'; $g.TextRenderingHint='ClearTypeGridFit'
    $g.Clear($bg)

    # M gigante, quase apagado, no canto direito
    $wm = New-Object System.Drawing.Imaging.ImageAttributes
    $cm = New-Object System.Drawing.Imaging.ColorMatrix
    $cm.Matrix33 = 0.05
    $wm.SetColorMatrix($cm)
    $wmH = 720; $wmW = [int]($src.Width / $src.Height * $wmH)
    $rect = New-Object System.Drawing.Rectangle(820, -60, $wmW, $wmH)
    $g.DrawImage($src, $rect, 0, 0, $src.Width, $src.Height, 'Pixel', $wm)

    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $muted = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#94a3b8"))
    $accent = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#2563eb"))
    $fSite = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $sub = "Sistema de gestão da Menin Engenharia"

    if ($Label) {
        # Card de categoria: logo pequeno no topo, nome da categoria embaixo.
        $logoH = 62; $logoW = [int]($src.Width / $src.Height * $logoH)
        $g.DrawImage($src, 90, 96, $logoW, $logoH)
        $fKick = New-Object System.Drawing.Font("Segoe UI Semibold", 22, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        $g.DrawString("MENIN OFFICE", $fKick, $muted, 90 + $logoW + 24, 114)
        $fCat = New-Object System.Drawing.Font("Segoe UI Semibold", 62, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        $g.DrawString($Label, $fCat, $white, 88, 300)
        $g.DrawString($sub, $fSite, $muted, 90, 392)
        $g.FillRectangle($accent, 90, 480, 96, 6)
    } else {
        # Card padrao do sistema.
        $logoH = 150; $logoW = [int]($src.Width / $src.Height * $logoH)
        $g.DrawImage($src, 90, 175, $logoW, $logoH)
        $fTitle = New-Object System.Drawing.Font("Segoe UI Semibold", 52, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        $g.DrawString("Menin Office", $fTitle, $white, 88, 372)
        $fSub2 = New-Object System.Drawing.Font("Segoe UI", 28, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        $g.DrawString($sub, $fSub2, $muted, 90, 448)
        $g.FillRectangle($accent, 90, 520, 96, 6)
    }

    $bmp.Save((Join-Path $public $Out), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Write-Output ("  card   {0}" -f $Out)
}

Write-Output "Gerando icones..."
New-Icon -Size 32  -Ratio 0.68 -Out "favicon-32.png" -Round 0.20
New-Icon -Size 192 -Ratio 0.58 -Out "pwa-192.png"    -Round 0.18
New-Icon -Size 512 -Ratio 0.58 -Out "pwa-512.png"    -Round 0.18
New-Icon -Size 180 -Ratio 0.58 -Out "apple-touch-icon.png"
New-Icon -Size 167 -Ratio 0.58 -Out "apple-touch-icon-167.png"
New-Icon -Size 152 -Ratio 0.58 -Out "apple-touch-icon-152.png"
New-Icon -Size 512 -Ratio 0.55 -Out "pwa-512-maskable.png"

Write-Output "Gerando cards de compartilhamento..."
New-OgCard -Label $null -Out "og-image.png"

$catFile = Join-Path $PSScriptRoot "categorias.txt"
if (Test-Path $catFile) {
    foreach ($line in Get-Content $catFile -Encoding UTF8) {
        if (-not $line.Trim()) { continue }
        $parts = $line.Split('|')
        New-OgCard -Label $parts[1] -Out ("og-" + $parts[0] + ".png")
    }
} else {
    Write-Warning "scripts/categorias.txt nao encontrado. Rode 'npm run og:routes' antes."
}

$src.Dispose()
Write-Output "Pronto."
