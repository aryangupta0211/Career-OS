
#requires -Version 5.1
<#
.SYNOPSIS
    Generates an AI-readable snapshot of a software repository.

.DESCRIPTION
    - Detects the project root using $PSScriptRoot.
    - Creates project-context/project-context.txt.
    - Includes a directory tree, metadata, and relevant text files.
    - Excludes dependencies, generated output, environment files, and binaries.
    - Skips files suspected of containing hardcoded secrets.
    - Applies per-file and total-output size limits.
    - Does not execute project code, install packages, or modify source files.

.COMPATIBILITY
    Windows PowerShell 5.1 and PowerShell 7+.
#>

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

# ----------------------------- Configuration -----------------------------

$OutputDirectoryName = 'project-context'
$OutputFileName = 'project-context.txt'

# Maximum size of an individual source file to include.
$MaxFileSizeBytes = 256KB

# Maximum approximate output size before a warning is displayed.
$MaxOutputSizeBytes = 5MB

# Set to $true to include hidden text files, excluding protected paths.
$IncludeHiddenFiles = $true

# Directory names that are never traversed.
$ExcludedDirectoryNames = @(
    '.git', '.svn', '.hg',
    'node_modules', 'bower_components',
    '.next', '.nuxt', '.output', '.turbo',
    'dist', 'build', 'out', 'release',
    'coverage', '.nyc_output',
    '__pycache__', '.pytest_cache', '.mypy_cache',
    '.ruff_cache', '.tox', '.venv', 'venv', 'env',
    'vendor', 'target', 'bin', 'obj',
    '.idea', '.vscode-test',
    'playwright-report', 'test-results',
    'storybook-static',
    $OutputDirectoryName
)

# Extensions commonly useful for software architecture and debugging.
$IncludedExtensions = @(
    '.ts', '.tsx', '.mts', '.cts',
    '.js', '.jsx', '.mjs', '.cjs',
    '.py', '.pyi',
    '.java', '.kt', '.kts', '.scala',
    '.c', '.h', '.cpp', '.hpp', '.cc',
    '.cs', '.fs', '.go', '.rs', '.php',
    '.rb', '.rake', '.swift', '.dart',
    '.vue', '.svelte', '.astro',
    '.html', '.htm', '.css', '.scss', '.sass', '.less',
    '.json', '.jsonc', '.json5',
    '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
    '.xml', '.xsd', '.xsl',
    '.sql', '.prisma', '.graphql', '.gql',
    '.md', '.mdx', '.rst', '.txt',
    '.ps1', '.psm1', '.psd1', '.sh', '.bash',
    '.bat', '.cmd',
    '.dockerfile', '.tf', '.hcl',
    '.properties', '.gradle',
    '.make', '.mk', '.cmake',
    '.proto', '.ipynb',
    '.editorconfig', '.gitignore', '.gitattributes',
    '.npmrc', '.nvmrc', '.prettierrc', '.eslintrc',
    '.lock'
)

# Important extensionless or specially named files.
$IncludedFileNames = @(
    'README', 'README.md', 'README.txt',
    'LICENSE', 'LICENSE.md', 'NOTICE',
    'CHANGELOG', 'CHANGELOG.md',
    'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md',
    'SECURITY.md', 'SUPPORT.md',
    'Dockerfile', 'Containerfile',
    'Makefile', 'GNUmakefile',
    'Procfile', 'Justfile',
    'Jenkinsfile', 'Vagrantfile',
    'CMakeLists.txt',
    'package.json', 'package-lock.json',
    'npm-shrinkwrap.json', 'yarn.lock',
    'pnpm-lock.yaml', 'bun.lock', 'bun.lockb',
    'composer.json', 'composer.lock',
    'Cargo.toml', 'Cargo.lock',
    'go.mod', 'go.sum',
    'requirements.txt', 'Pipfile', 'Pipfile.lock',
    'poetry.lock', 'pyproject.toml',
    'uv.lock', 'PDM.lock',
    'Gemfile', 'Gemfile.lock',
    'mix.exs', 'mix.lock',
    'pubspec.yaml', 'pubspec.lock',
    'pom.xml', 'build.gradle', 'build.gradle.kts',
    'settings.gradle', 'settings.gradle.kts',
    'gradlew', 'mvnw',
    'global.json', 'NuGet.config',
    'Directory.Build.props', 'Directory.Build.targets',
    'tsconfig', 'jsconfig',
    '.gitignore', '.gitattributes', '.gitmodules',
    '.dockerignore', '.npmrc', '.nvmrc',
    '.editorconfig', '.prettierrc', '.eslintrc',
    '.env.example', '.env.sample', '.env.template',
    '.env.development.example', '.env.production.example',
    'LICENSE-MIT', 'LICENSE-APACHE'
)

# Never include real environment files, private keys, or certificate files.
$ExcludedFileNames = @(
    '.env', '.env.local', '.env.development', '.env.production',
    '.env.test', '.env.development.local', '.env.production.local',
    '.env.test.local', '.env.staging', '.env.staging.local',
    'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519',
    'known_hosts', 'authorized_keys',
    'credentials', 'credentials.json',
    'secrets.json', 'service-account.json',
    'serviceaccount.json'
)

$ExcludedExtensions = @(
    '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico',
    '.webp', '.avif', '.tif', '.tiff',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.ppt', '.pptx', '.zip', '.7z', '.rar', '.tar',
    '.gz', '.bz2', '.xz', '.woff', '.woff2', '.ttf',
    '.otf', '.eot', '.mp3', '.mp4', '.mov', '.avi',
    '.wav', '.sqlite', '.db', '.class', '.jar', '.war',
    '.pyc', '.pyo', '.pyd', '.pem', '.key', '.p12',
    '.pfx', '.cer', '.crt', '.der'
)

# ----------------------------- Initialization -----------------------------

if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) {
    throw 'Cannot determine the script directory. Save this script as a .ps1 file and run it from PowerShell.'
}

$ProjectRoot = [System.IO.Path]::GetFullPath($PSScriptRoot).TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
)

$OutputDirectory = Join-Path $ProjectRoot $OutputDirectoryName
$OutputPath = Join-Path $OutputDirectory $OutputFileName

$IncludedFiles = New-Object 'System.Collections.Generic.List[object]'
$SkippedFiles = New-Object 'System.Collections.Generic.List[object]'
$ManualReviewFiles = New-Object 'System.Collections.Generic.List[string]'
$Errors = New-Object 'System.Collections.Generic.List[string]'

$Utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
$Utf8Output = New-Object System.Text.UTF8Encoding($true)

$GeneratedAt = Get-Date
$OutputBuffer = New-Object System.Text.StringBuilder

# ----------------------------- Helper functions -----------------------------

function Write-ProgressMessage {
    param([string]$Message)
    Write-Host ('[Context] ' + $Message) -ForegroundColor Cyan
}

function Get-RelativePathCompat {
    param(
        [string]$BasePath,
        [string]$FullPath
    )

    # Avoid Path.GetRelativePath because it is unavailable on older .NET.
    $Base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    ) + [System.IO.Path]::DirectorySeparatorChar

    $Full = [System.IO.Path]::GetFullPath($FullPath)

    if ($Full.StartsWith($Base, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $Full.Substring($Base.Length).Replace('\', '/')
    }

    if ($Full.Equals($Base.TrimEnd('\'), [System.StringComparison]::OrdinalIgnoreCase)) {
        return '.'
    }

    return $Full.Replace('\', '/')
}

function Test-IsUnderPath {
    param(
        [string]$Path,
        [string]$ParentPath
    )

    $Parent = [System.IO.Path]::GetFullPath($ParentPath).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    ) + [System.IO.Path]::DirectorySeparatorChar

    $Full = [System.IO.Path]::GetFullPath($Path)

    return $Full.StartsWith(
        $Parent,
        [System.StringComparison]::OrdinalIgnoreCase
    )
}

function Test-IsEnvironmentFile {
    param([string]$Name)

    # Allow only explicitly named example/sample/template environment files.
    if ($Name -match '^\.env(\..+)?$') {
        return ($Name -notmatch '\.(example|sample|template)$')
    }

    return $false
}

function Test-IsExcludedPath {
    param([System.IO.FileInfo]$File)

    $Relative = Get-RelativePathCompat $ProjectRoot $File.FullName
    $Parts = $Relative -split '/'

    foreach ($Part in $Parts) {
        if ($Part -eq $OutputDirectoryName) {
            return $true
        }
    }

    if ($ExcludedFileNames -contains $File.Name) {
        return $true
    }

    if (Test-IsEnvironmentFile $File.Name) {
        return $true
    }

    if ($ExcludedExtensions -contains $File.Extension.ToLowerInvariant()) {
        return $true
    }

    # Private-key blocks are never suitable for an AI context snapshot.
    if ($File.Name -match '(?i)\.(pem|key|p12|pfx|keystore|jks)$') {
        return $true
    }

    # Common credential or secret file names.
    if ($File.Name -match '(?i)(secret|credential|private.?key|service.?account)' -and
        $File.Name -notmatch '(?i)(example|sample|template|schema|test)') {
        return $true
    }

    return $false
}

function Test-IsLikelyBinary {
    param([byte[]]$Bytes)

    if ($null -eq $Bytes -or $Bytes.Length -eq 0) {
        return $false
    }

    $CheckLength = [Math]::Min($Bytes.Length, 8192)

    for ($i = 0; $i -lt $CheckLength; $i++) {
        if ($Bytes[$i] -eq 0) {
            return $true
        }
    }

    return $false
}

function Get-TextFromBytes {
    param([byte[]]$Bytes)

    if ($null -eq $Bytes -or $Bytes.Length -eq 0) {
        return ''
    }

    # Recognize common Unicode byte-order marks first.
    if ($Bytes.Length -ge 3 -and
        $Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF) {
        return [System.Text.Encoding]::UTF8.GetString($Bytes, 3, $Bytes.Length - 3)
    }

    if ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFF -and $Bytes[1] -eq 0xFE) {
        return [System.Text.Encoding]::Unicode.GetString($Bytes, 2, $Bytes.Length - 2)
    }

    if ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFE -and $Bytes[1] -eq 0xFF) {
        return [System.Text.Encoding]::BigEndianUnicode.GetString($Bytes, 2, $Bytes.Length - 2)
    }

    try {
        return $Utf8Strict.GetString($Bytes)
    }
    catch {
        # Fallback for older Windows files saved using the active code page.
        return [System.Text.Encoding]::Default.GetString($Bytes)
    }
}

function Test-LikelySecretContent {
    param([string]$Content)

    # Heuristic patterns only. This is not a complete secret scanner.
    $Patterns = @(
        '(?im)-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
        '(?im)\bAKIA[0-9A-Z]{16}\b',
        '(?im)\bASIA[0-9A-Z]{16}\b',
        '(?im)\bgh[pousr]_[A-Za-z0-9_]{20,}\b',
        '(?im)\bgithub_pat_[A-Za-z0-9_]{20,}\b',
        '(?im)\bsk-[A-Za-z0-9_-]{20,}\b',
        '(?im)\bAIza[0-9A-Za-z_-]{30,}\b',
        '(?im)\bxox[baprs]-[A-Za-z0-9-]{10,}\b',
        '(?im)\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b',
        '(?im)\b(password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key)\b\s*[:=]\s*["''][^"'']{8,}["'']',
        '(?im)\bBearer\s+[A-Za-z0-9._~+/=-]{20,}',
        '(?im)\bpostgres(?:ql)?://[^/\s:]+:[^@\s]+@[^/\s]+',
        '(?im)\bmongodb(?:\+srv)?://[^/\s:]+:[^@\s]+@[^/\s]+'
    )

    foreach ($Pattern in $Patterns) {
        if ($Content -match $Pattern) {
            return $true
        }
    }

    return $false
}

function Add-OutputLine {
    param([string]$Line)

    [void]$OutputBuffer.AppendLine($Line)
}

function Add-Section {
    param([string]$Title)

    Add-OutputLine ''
    Add-OutputLine ('=' * 88)
    Add-OutputLine $Title
    Add-OutputLine ('=' * 88)
}

function Get-TreeLines {
    param([string]$Root)

    $Lines = New-Object 'System.Collections.Generic.List[string]'
    $Queue = New-Object 'System.Collections.Generic.Queue[object]'
    $Queue.Enqueue(@{ Path = $Root; Prefix = '' })

    while ($Queue.Count -gt 0) {
        $Item = $Queue.Dequeue()
        $CurrentPath = [string]$Item.Path
        $Prefix = [string]$Item.Prefix

        try {
            $Children = @(Get-ChildItem -LiteralPath $CurrentPath -Force -ErrorAction Stop |
                Where-Object {
                    $ExcludedDirectoryNames -notcontains $_.Name -and
                    -not ($_.PSIsContainer -and $_.Name -eq $OutputDirectoryName) -and
                    -not (Test-IsEnvironmentFile $_.Name) -and
                    ($IncludeHiddenFiles -or $_.Name -notlike '.*')
                } |
                Sort-Object @{ Expression = { if ($_.PSIsContainer) { 0 } else { 1 } } }, Name)
        }
        catch {
            [void]$Lines.Add($Prefix + '[Unable to read directory]')
            continue
        }

        foreach ($Child in $Children) {
            if ($Child.PSIsContainer) {
                [void]$Lines.Add($Prefix + '+-- ' + $Child.Name + '/')
                $Queue.Enqueue(@{
                    Path = $Child.FullName
                    Prefix = $Prefix + '    '
                })
            }
            else {
                $LengthLabel = ''
                try {
                    $LengthLabel = ' (' + $Child.Length + ' bytes)'
                }
                catch {}

                [void]$Lines.Add($Prefix + '+-- ' + $Child.Name + $LengthLabel)
            }
        }
    }

    return $Lines
}

# ----------------------------- File collection -----------------------------

try {
    Write-ProgressMessage ('Project root: ' + $ProjectRoot)
    Write-ProgressMessage 'Preparing output directory...'

    if (-not (Test-Path -LiteralPath $OutputDirectory -PathType Container)) {
        New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
    }

    # Resolve output paths before enumeration to avoid accidental self-inclusion.
    $OutputFullPath = [System.IO.Path]::GetFullPath($OutputPath)

    Write-ProgressMessage 'Scanning repository files...'

    $AllFiles = New-Object 'System.Collections.Generic.List[System.IO.FileInfo]'
    $DirectoryQueue = New-Object 'System.Collections.Generic.Queue[string]'
    $DirectoryQueue.Enqueue($ProjectRoot)

    while ($DirectoryQueue.Count -gt 0) {
        $CurrentDirectory = $DirectoryQueue.Dequeue()

        try {
            $Children = @(Get-ChildItem -LiteralPath $CurrentDirectory -Force -ErrorAction Stop |
                Sort-Object Name)

            foreach ($Child in $Children) {
                if ($Child.PSIsContainer) {
                    if ($ExcludedDirectoryNames -contains $Child.Name) {
                        continue
                    }

                    if (-not $IncludeHiddenFiles -and $Child.Name.StartsWith('.')) {
                        continue
                    }

                    if (Test-IsUnderPath $Child.FullName $OutputDirectory) {
                        continue
                    }

                    $DirectoryQueue.Enqueue($Child.FullName)
                }
                else {
                    if ($Child.FullName -eq $OutputFullPath) {
                        continue
                    }

                    if (-not $IncludeHiddenFiles -and $Child.Name.StartsWith('.')) {
                        continue
                    }

                    if (Test-IsExcludedPath $Child) {
                        $SkippedFiles.Add([PSCustomObject]@{
                            Path = Get-RelativePathCompat $ProjectRoot $Child.FullName
                            Reason = 'Excluded by safety or file-type rules'
                        }) | Out-Null
                        continue
                    }

                    $IsNamed = $IncludedFileNames -contains $Child.Name
                    $IsExtensionIncluded = $IncludedExtensions -contains $Child.Extension.ToLowerInvariant()

                    if ($IsNamed -or $IsExtensionIncluded) {
                        $AllFiles.Add($Child)
                    }
                    else {
                        $SkippedFiles.Add([PSCustomObject]@{
                            Path = Get-RelativePathCompat $ProjectRoot $Child.FullName
                            Reason = 'File type not selected'
                        }) | Out-Null
                    }
                }
            }
        }
        catch {
            $RelativeDirectory = Get-RelativePathCompat $ProjectRoot $CurrentDirectory
            $Message = 'Cannot enumerate directory "' + $RelativeDirectory + '": ' + $_.Exception.Message
            $Errors.Add($Message) | Out-Null
            Write-Warning $Message
        }
    }

    # Stable ordering makes repeated runs predictable.
    $AllFiles = @($AllFiles | Sort-Object {
        Get-RelativePathCompat $ProjectRoot $_.FullName
    })

    Write-ProgressMessage ('Found ' + $AllFiles.Count + ' candidate text files.')

    # ----------------------------- Build snapshot -----------------------------

    Add-OutputLine 'PROJECT CONTEXT SNAPSHOT'
    Add-OutputLine ('Generated: ' + $GeneratedAt.ToString('yyyy-MM-dd HH:mm:ss zzz'))
    Add-OutputLine ('Project root: ' + $ProjectRoot)
    Add-OutputLine ('Output file: ' + $OutputDirectoryName + '/' + $OutputFileName)
    Add-OutputLine ('PowerShell version: ' + $PSVersionTable.PSVersion.ToString())
    Add-OutputLine ('Operating system: ' + [System.Environment]::OSVersion.VersionString)
    Add-OutputLine ''
    Add-OutputLine 'SECURITY NOTICE'
    Add-OutputLine 'Real .env files, common private-key files, binary files, and files matching'
    Add-OutputLine 'secret heuristics are excluded. Detection is heuristic and cannot guarantee'
    Add-OutputLine 'that every secret is found. Review the generated snapshot before uploading.'
    Add-OutputLine ''
    Add-OutputLine 'REPOSITORY OVERVIEW'
    Add-OutputLine ('Candidate files: ' + $AllFiles.Count)
    Add-OutputLine ('Excluded/skipped files so far: ' + $SkippedFiles.Count)

    Add-Section 'PROJECT DIRECTORY TREE'

    $TreeLines = @(Get-TreeLines -Root $ProjectRoot)
    foreach ($TreeLine in $TreeLines) {
        Add-OutputLine $TreeLine
    }

    Add-Section 'FILE CONTENTS'

    $IncludedCount = 0
    $IncludedBytes = 0
    $TotalSkippedForSize = 0

    foreach ($File in $AllFiles) {
        $RelativePath = Get-RelativePathCompat $ProjectRoot $File.FullName

        Write-ProgressMessage ('Inspecting: ' + $RelativePath)

        try {
            $CurrentFile = Get-Item -LiteralPath $File.FullName -ErrorAction Stop

            if ($CurrentFile.Length -gt $MaxFileSizeBytes) {
                $SkippedFiles.Add([PSCustomObject]@{
                    Path = $RelativePath
                    Reason = 'File exceeds per-file limit of ' + $MaxFileSizeBytes + ' bytes'
                }) | Out-Null
                $TotalSkippedForSize++
                continue
            }

            # Avoid reading the generated snapshot or any other file under output.
            if (([System.IO.Path]::GetFullPath($CurrentFile.FullName)) -eq $OutputFullPath) {
                continue
            }

            $Bytes = [System.IO.File]::ReadAllBytes($CurrentFile.FullName)

            if (Test-IsLikelyBinary -Bytes $Bytes) {
                $SkippedFiles.Add([PSCustomObject]@{
                    Path = $RelativePath
                    Reason = 'Binary content detected'
                }) | Out-Null
                continue
            }

            $Content = Get-TextFromBytes -Bytes $Bytes

            if (Test-LikelySecretContent -Content $Content) {
                $ManualReviewFiles.Add($RelativePath) | Out-Null
                $SkippedFiles.Add([PSCustomObject]@{
                    Path = $RelativePath
                    Reason = 'Possible hardcoded secret; excluded for manual review'
                }) | Out-Null
                continue
            }

            # Enforce the overall output budget before adding each file.
            $FileHeader = @(
                ''
                ('-' * 88)
                ('FILE: ' + $RelativePath)
                ('SIZE: ' + $CurrentFile.Length + ' bytes')
                ('-' * 88)
            ) -join [Environment]::NewLine

            $EstimatedAddition = [System.Text.Encoding]::UTF8.GetByteCount(
                $FileHeader + [Environment]::NewLine + $Content + [Environment]::NewLine
            )

            $CurrentOutputBytes = [System.Text.Encoding]::UTF8.GetByteCount(
                $OutputBuffer.ToString()
            )

            if (($CurrentOutputBytes + $EstimatedAddition) -gt $MaxOutputSizeBytes) {
                $SkippedFiles.Add([PSCustomObject]@{
                    Path = $RelativePath
                    Reason = 'Total output size limit reached'
                }) | Out-Null
                $TotalSkippedForSize++
                continue
            }

            [void]$OutputBuffer.AppendLine($FileHeader)
            [void]$OutputBuffer.AppendLine($Content)
            [void]$OutputBuffer.AppendLine('')

            $IncludedCount++
            $IncludedBytes += $CurrentFile.Length
        }
        catch {
            $ErrorMessage = 'Could not process "' + $RelativePath + '": ' + $_.Exception.Message
            $Errors.Add($ErrorMessage) | Out-Null
            $SkippedFiles.Add([PSCustomObject]@{
                Path = $RelativePath
                Reason = 'Read/processing error'
            }) | Out-Null
            Write-Warning $ErrorMessage
        }
    }

    # ----------------------------- Final report -----------------------------

    Add-Section 'GENERATION REPORT'
    Add-OutputLine ('Generation time: ' + $GeneratedAt.ToString('yyyy-MM-dd HH:mm:ss zzz'))
    Add-OutputLine ('Project root: ' + $ProjectRoot)
    Add-OutputLine ('Included file count: ' + $IncludedCount)
    Add-OutputLine ('Skipped file count: ' + $SkippedFiles.Count)
    Add-OutputLine ('Included source bytes: ' + $IncludedBytes)
    Add-OutputLine ('Per-file size limit: ' + $MaxFileSizeBytes + ' bytes')
    Add-OutputLine ('Configured total-output limit: ' + $MaxOutputSizeBytes + ' bytes')
    Add-OutputLine ('Files skipped because of size limits: ' + $TotalSkippedForSize)
    Add-OutputLine ('Files requiring manual secret review: ' + $ManualReviewFiles.Count)
    Add-OutputLine ('Processing errors: ' + $Errors.Count)

    if ($ManualReviewFiles.Count -gt 0) {
        Add-OutputLine ''
        Add-OutputLine 'FILES EXCLUDED FOR POSSIBLE SECRETS - REVIEW MANUALLY'
        foreach ($ReviewPath in ($ManualReviewFiles | Sort-Object -Unique)) {
            Add-OutputLine (' - ' + $ReviewPath)
        }
        Add-OutputLine 'These files were not copied into the snapshot.'
    }

    if ($SkippedFiles.Count -gt 0) {
        Add-OutputLine ''
        Add-OutputLine 'SKIPPED FILES'
        foreach ($Skipped in ($SkippedFiles | Sort-Object Path)) {
            Add-OutputLine (' - ' + $Skipped.Path + ' :: ' + $Skipped.Reason)
        }
    }

    if ($Errors.Count -gt 0) {
        Add-OutputLine ''
        Add-OutputLine 'PROCESSING ERRORS'
        foreach ($ErrorEntry in $Errors) {
            Add-OutputLine (' - ' + $ErrorEntry)
        }
    }

    # Write once, replacing the previous snapshot instead of appending.
    $FinalText = $OutputBuffer.ToString()
    [System.IO.File]::WriteAllText($OutputFullPath, $FinalText, $Utf8Output)

    $FinalSize = (Get-Item -LiteralPath $OutputFullPath).Length

    Write-Host ''
    Write-Host 'Context generation complete.' -ForegroundColor Green
    Write-Host ('Output: ' + $OutputFullPath)
    Write-Host ('Included files: ' + $IncludedCount)
    Write-Host ('Skipped files: ' + $SkippedFiles.Count)
    Write-Host ('Files flagged for manual review: ' + $ManualReviewFiles.Count)
    Write-Host ('Final output size: ' + [Math]::Round($FinalSize / 1KB, 2) + ' KB')

    if ($FinalSize -gt $MaxOutputSizeBytes) {
        Write-Warning ('Final snapshot exceeds the configured total-output limit of ' +
            $MaxOutputSizeBytes + ' bytes. Consider lowering the limit or splitting the context.')
    }

    if ($ManualReviewFiles.Count -gt 0) {
        Write-Warning 'Some files were excluded because they may contain secrets. Review the report in the snapshot.'
    }

    Write-Host ''
    Write-Host 'Important: manually review the snapshot before uploading it to an AI service.' -ForegroundColor Yellow
}
catch {
    Write-Error ('Context generation failed: ' + $_.Exception.Message)
    exit 1
}
