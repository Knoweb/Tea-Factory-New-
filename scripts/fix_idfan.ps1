$file = Join-Path $PSScriptRoot "..\app\trough\[id]\page.tsx"
$allLines = [System.IO.File]::ReadAllLines($file)
$total = $allLines.Length
Write-Host "Total lines: $total"
# Keep lines 0..1109 (index) and 1415..end (index), removing 1110..1414
$kept = @()
for ($i = 0; $i -lt $total; $i++) {
    if ($i -le 1109 -or $i -ge 1415) {
        $kept += $allLines[$i]
    }
}
[System.IO.File]::WriteAllLines($file, $kept, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done. New line count: $($kept.Count)"
