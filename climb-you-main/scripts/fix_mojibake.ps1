param(
  [string]$Root = (Join-Path $PSScriptRoot '..')
)

Write-Host "Fixing mojibake under: $Root"

$enc = New-Object System.Text.UTF8Encoding($false)
$files = Get-ChildItem -Path $Root -Recurse -File | Where-Object {
  $_.Extension -in '.ts','.tsx','.js','.json','.md','.plist'
}

foreach ($f in $files) {
  try {
    $text = [System.IO.File]::ReadAllText($f.FullName)
    $orig = $text
    # Remove Unicode replacement char (U+FFFD)
    $text = $text -replace "`uFFFD", ''
    # Targeted fix for common corrupted JSX closing
    $text = $text -replace "✁E/Text>", '✓</Text>'
    if ($text -ne $orig) {
      [System.IO.File]::WriteAllText($f.FullName, $text, $enc)
      Write-Host ("  fixed: " + $f.FullName)
    }
  } catch {
    Write-Warning ("  skip (read/write error): " + $f.FullName)
  }
}

Write-Host "Done."

