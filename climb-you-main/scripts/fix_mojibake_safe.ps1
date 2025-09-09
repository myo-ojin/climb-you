param(
  [string]$BasePath = (Join-Path $PSScriptRoot '..')
)

Write-Host "Safe mojibake fix under: $BasePath (excluding node_modules/.git)"

$targets = @(
  (Join-Path $BasePath 'src'),
  (Join-Path $BasePath 'project-docs')
)

$enc = New-Object System.Text.UTF8Encoding($false)

foreach ($target in $targets) {
  if (-not (Test-Path $target)) { continue }

  $files = Get-ChildItem -Path $target -Recurse -File |
    Where-Object { $_.FullName -notmatch "\\node_modules\\" -and $_.FullName -notmatch "\\\.git\\" -and $_.FullName -notmatch "\\assets\\" } |
    Where-Object { $_.Extension -in '.ts','.tsx','.js','.json','.md','.plist' }

  foreach ($f in $files) {
    try {
      $text = [System.IO.File]::ReadAllText($f.FullName)
      $orig = $text

      # Remove Unicode replacement char (U+FFFD)
      $text = $text -replace "`uFFFD", ''
      # Fix common broken closing pattern seen in JSX
      $text = $text -replace "✁E/Text>", '✓</Text>'

      if ($text -ne $orig) {
        [System.IO.File]::WriteAllText($f.FullName, $text, $enc)
        Write-Host ("  fixed: " + $f.FullName)
      }
    } catch {
      Write-Warning ("  skip (read/write error): " + $f.FullName)
    }
  }
}

Write-Host "Safe fix done."

