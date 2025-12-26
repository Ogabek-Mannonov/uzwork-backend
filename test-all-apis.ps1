# test-all-apis.ps1
# Автоматическое тестирование всех API endpoints UzWork Backend

$baseUrl = "http://localhost:3000"
$results = @()
$clientToken = ""
$freelancerToken = ""
$clientId = 0
$freelancerId = 0
$projectId = 0
$proposalId = 0
$contractId = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    $result = @{
        Name = $Name
        Method = $Method
        Url = $Url
        Status = "FAILED"
        StatusCode = 0
        Message = ""
        Time = ""
    }
    
    try {
        $startTime = Get-Date
        
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        $result.StatusCode = 200
        $result.Status = if ($response.success -ne $false) { "PASSED" } else { "PARTIAL" }
        $result.Message = $response.message -or "OK"
        $result.Time = "$([math]::Round($duration, 2))ms"
        
        return @{ Result = $result; Response = $response }
    }
    catch {
        $result.Status = "FAILED"
        $result.Message = $_.Exception.Message
        if ($_.Exception.Response) {
            $result.StatusCode = [int]$_.Exception.Response.StatusCode
            try {
                $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
                $result.Message = $errorBody.message -or $errorBody.error -or $_.Exception.Message
            } catch {
                $result.Message = $_.Exception.Message
            }
        }
        return @{ Result = $result; Response = $null }
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UzWork Backend API Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Health Check
Write-Host "[1] Health Check..." -ForegroundColor Yellow
$test = Test-Endpoint -Name "Health Check" -Method "GET" -Url "$baseUrl/"
$results += $test.Result
Write-Host "   $($test.Result.Status) - $($test.Result.Message)" -ForegroundColor $(if ($test.Result.Status -eq "PASSED") { "Green" } else { "Red" })
Write-Host ""

# 2. Signup Client
Write-Host "[2] Signup Client..." -ForegroundColor Yellow
$randomEmail = "client_$(Get-Random -Minimum 1000 -Maximum 9999)@test.com"
$signupClient = Test-Endpoint -Name "Signup Client" -Method "POST" -Url "$baseUrl/auth/signup" `
    -Body @{
        email = $randomEmail
        phone = "+998901234567"
        password = "password123"
        role = "client"
    } -ExpectedStatus 201

$results += $signupClient.Result
if ($signupClient.Response -and $signupClient.Response.data) {
    $clientToken = $signupClient.Response.data.accessToken
    $clientId = $signupClient.Response.data.user.id
    Write-Host "   PASSED - Client ID: $clientId" -ForegroundColor Green
} else {
    Write-Host "   FAILED - Cannot get token" -ForegroundColor Red
}
Write-Host ""

# 3. Signup Freelancer
Write-Host "[3] Signup Freelancer..." -ForegroundColor Yellow
$randomEmailFreelancer = "freelancer_$(Get-Random -Minimum 1000 -Maximum 9999)@test.com"
$signupFreelancer = Test-Endpoint -Name "Signup Freelancer" -Method "POST" -Url "$baseUrl/auth/signup" `
    -Body @{
        email = $randomEmailFreelancer
        phone = "+998901234568"
        password = "password123"
        role = "freelancer"
    } -ExpectedStatus 201

$results += $signupFreelancer.Result
if ($signupFreelancer.Response -and $signupFreelancer.Response.data) {
    $freelancerToken = $signupFreelancer.Response.data.accessToken
    $freelancerId = $signupFreelancer.Response.data.user.id
    Write-Host "   PASSED - Freelancer ID: $freelancerId" -ForegroundColor Green
} else {
    Write-Host "   FAILED - Cannot get token" -ForegroundColor Red
}
Write-Host ""

if (-not $clientToken -or -not $freelancerToken) {
    Write-Host "WARNING: Cannot get tokens. Some tests will be skipped." -ForegroundColor Yellow
    Write-Host ""
}

# 4. Get Me (Client)
if ($clientToken) {
    Write-Host "[4] Get Me (Client)..." -ForegroundColor Yellow
    $getMe = Test-Endpoint -Name "Get Me (Client)" -Method "GET" -Url "$baseUrl/auth/me" `
        -Headers @{ Authorization = "Bearer $clientToken" }
    $results += $getMe.Result
    Write-Host "   $($getMe.Result.Status)" -ForegroundColor $(if ($getMe.Result.Status -eq "PASSED") { "Green" } else { "Red" })
    Write-Host ""
}

# 5. Create Project
if ($clientToken) {
    Write-Host "[5] Create Project..." -ForegroundColor Yellow
    $createProject = Test-Endpoint -Name "Create Project" -Method "POST" -Url "$baseUrl/projects" `
        -Headers @{ Authorization = "Bearer $clientToken" } `
        -Body @{
            title = "Test Project $(Get-Date -Format 'HHmmss')"
            description = "Test project description"
            category = "web"
            skills = @("JavaScript", "React")
            budget_type = "fixed"
            budget_min = 1000000
            budget_max = 2000000
            duration = "1 month"
        } -ExpectedStatus 201
    
    $results += $createProject.Result
    if ($createProject.Response -and $createProject.Response.data) {
        $projectId = $createProject.Response.data.project.id
        Write-Host "   PASSED - Project ID: $projectId" -ForegroundColor Green
    } else {
        Write-Host "   FAILED" -ForegroundColor Red
    }
    Write-Host ""
}

# 6. Get Projects
Write-Host "[6] Get Projects..." -ForegroundColor Yellow
$getProjects = Test-Endpoint -Name "Get Projects" -Method "GET" -Url "$baseUrl/projects"
$results += $getProjects.Result
Write-Host "   $($getProjects.Result.Status)" -ForegroundColor $(if ($getProjects.Result.Status -eq "PASSED") { "Green" } else { "Red" })
Write-Host ""

# 7. Get Freelancers
Write-Host "[7] Get Freelancers..." -ForegroundColor Yellow
$getFreelancers = Test-Endpoint -Name "Get Freelancers" -Method "GET" -Url "$baseUrl/freelancers"
$results += $getFreelancers.Result
Write-Host "   $($getFreelancers.Result.Status)" -ForegroundColor $(if ($getFreelancers.Result.Status -eq "PASSED") { "Green" } else { "Red" })
Write-Host ""

# 8. Create Proposal
if ($freelancerToken -and $projectId) {
    Write-Host "[8] Create Proposal..." -ForegroundColor Yellow
    $createProposal = Test-Endpoint -Name "Create Proposal" -Method "POST" -Url "$baseUrl/proposals" `
        -Headers @{ Authorization = "Bearer $freelancerToken" } `
        -Body @{
            project_id = $projectId
            cover_letter = "I can do this project perfectly!"
            proposed_amount = 1500000
            estimated_days = 14
        } -ExpectedStatus 201
    
    $results += $createProposal.Result
    if ($createProposal.Response -and $createProposal.Response.data) {
        $proposalId = $createProposal.Response.data.proposal.id
        Write-Host "   PASSED - Proposal ID: $proposalId" -ForegroundColor Green
    } else {
        Write-Host "   FAILED" -ForegroundColor Red
    }
    Write-Host ""
}

# 9. Get My Proposals
if ($freelancerToken) {
    Write-Host "[9] Get My Proposals..." -ForegroundColor Yellow
    $getMyProposals = Test-Endpoint -Name "Get My Proposals" -Method "GET" -Url "$baseUrl/proposals/me" `
        -Headers @{ Authorization = "Bearer $freelancerToken" }
    $results += $getMyProposals.Result
    Write-Host "   $($getMyProposals.Result.Status)" -ForegroundColor $(if ($getMyProposals.Result.Status -eq "PASSED") { "Green" } else { "Red" })
    Write-Host ""
}

# 10. Accept Proposal
if ($clientToken -and $proposalId) {
    Write-Host "[10] Accept Proposal..." -ForegroundColor Yellow
    $acceptProposal = Test-Endpoint -Name "Accept Proposal" -Method "POST" -Url "$baseUrl/proposals/$proposalId/accept" `
        -Headers @{ Authorization = "Bearer $clientToken" }
    $results += $acceptProposal.Result
    Write-Host "   $($acceptProposal.Result.Status)" -ForegroundColor $(if ($acceptProposal.Result.Status -eq "PASSED") { "Green" } else { "Red" })
    Write-Host ""
}

# 11. Create Contract
if ($clientToken -and $proposalId) {
    Write-Host "[11] Create Contract..." -ForegroundColor Yellow
    $createContract = Test-Endpoint -Name "Create Contract" -Method "POST" -Url "$baseUrl/contracts" `
        -Headers @{ Authorization = "Bearer $clientToken" } `
        -Body @{ proposal_id = $proposalId } -ExpectedStatus 201
    $results += $createContract.Result
    if ($createContract.Response -and $createContract.Response.data) {
        $contractId = $createContract.Response.data.contract.id
        Write-Host "   PASSED - Contract ID: $contractId" -ForegroundColor Green
    } else {
        Write-Host "   FAILED" -ForegroundColor Red
    }
    Write-Host ""
}

# 12. Get Balance
if ($clientToken) {
    Write-Host "[12] Get Balance..." -ForegroundColor Yellow
    $getBalance = Test-Endpoint -Name "Get Balance" -Method "GET" -Url "$baseUrl/payments/balance" `
        -Headers @{ Authorization = "Bearer $clientToken" }
    $results += $getBalance.Result
    Write-Host "   $($getBalance.Result.Status)" -ForegroundColor $(if ($getBalance.Result.Status -eq "PASSED") { "Green" } else { "Red" })
    Write-Host ""
}

# 13. Deposit
if ($clientToken) {
    Write-Host "[13] Deposit..." -ForegroundColor Yellow
    $deposit = Test-Endpoint -Name "Deposit" -Method "POST" -Url "$baseUrl/payments/deposit" `
        -Headers @{ Authorization = "Bearer $clientToken" } `
        -Body @{
            amount = 1000000
            payment_method = "payme"
            currency = "UZS"
        } -ExpectedStatus 201
    $results += $deposit.Result
    Write-Host "   $($deposit.Result.Status)" -ForegroundColor $(if ($deposit.Result.Status -eq "PASSED") { "Green" } else { "Red" })
    Write-Host ""
}

# 14. Get Marketplace
Write-Host "[14] Get Marketplace..." -ForegroundColor Yellow
$getMarketplace = Test-Endpoint -Name "Get Marketplace" -Method "GET" -Url "$baseUrl/marketplace"
$results += $getMarketplace.Result
Write-Host "   $($getMarketplace.Result.Status)" -ForegroundColor $(if ($getMarketplace.Result.Status -eq "PASSED") { "Green" } else { "Red" })
Write-Host ""

# 15. Get Marketplace Categories
Write-Host "[15] Get Marketplace Categories..." -ForegroundColor Yellow
$getCategories = Test-Endpoint -Name "Get Marketplace Categories" -Method "GET" -Url "$baseUrl/marketplace/categories"
$results += $getCategories.Result
Write-Host "   $($getCategories.Result.Status)" -ForegroundColor $(if ($getCategories.Result.Status -eq "PASSED") { "Green" } else { "Red" })
Write-Host ""

# 16. Get Notifications
if ($clientToken) {
    Write-Host "[16] Get Notifications..." -ForegroundColor Yellow
    $getNotifications = Test-Endpoint -Name "Get Notifications" -Method "GET" -Url "$baseUrl/notifications/me" `
        -Headers @{ Authorization = "Bearer $clientToken" }
    $results += $getNotifications.Result
    Write-Host "   $($getNotifications.Result.Status)" -ForegroundColor $(if ($getNotifications.Result.Status -eq "PASSED") { "Green" } else { "Red" })
    Write-Host ""
}

# 17. Send Message
if ($clientToken -and $freelancerId) {
    Write-Host "[17] Send Message..." -ForegroundColor Yellow
    $sendMessage = Test-Endpoint -Name "Send Message" -Method "POST" -Url "$baseUrl/messages" `
        -Headers @{ Authorization = "Bearer $clientToken" } `
        -Body @{
            receiver_id = $freelancerId
            message_text = "Hello! I'm interested in working with you."
        } -ExpectedStatus 201
    $results += $sendMessage.Result
    Write-Host "   $($sendMessage.Result.Status)" -ForegroundColor $(if ($sendMessage.Result.Status -eq "PASSED") { "Green" } else { "Red" })
    Write-Host ""
}

# 18. Get Chats
if ($clientToken) {
    Write-Host "[18] Get Chats..." -ForegroundColor Yellow
    $getChats = Test-Endpoint -Name "Get Chats" -Method "GET" -Url "$baseUrl/messages" `
        -Headers @{ Authorization = "Bearer $clientToken" }
    $results += $getChats.Result
    Write-Host "   $($getChats.Result.Status)" -ForegroundColor $(if ($getChats.Result.Status -eq "PASSED") { "Green" } else { "Red" })
    Write-Host ""
}

# 19. Global Search
Write-Host "[19] Global Search..." -ForegroundColor Yellow
$globalSearch = Test-Endpoint -Name "Global Search" -Method "GET" -Url "$baseUrl/search?q=javascript"
$results += $globalSearch.Result
Write-Host "   $($globalSearch.Result.Status)" -ForegroundColor $(if ($globalSearch.Result.Status -eq "PASSED") { "Green" } else { "Red" })
Write-Host ""

# 20. AI Translate
Write-Host "[20] AI Translate..." -ForegroundColor Yellow
$aiTranslate = Test-Endpoint -Name "AI Translate" -Method "POST" -Url "$baseUrl/ai/translate" `
    -Body @{
        text = "Salom"
        from_lang = "uz"
        to_lang = "ru"
    }
$results += $aiTranslate.Result
Write-Host "   $($aiTranslate.Result.Status)" -ForegroundColor $(if ($aiTranslate.Result.Status -eq "PASSED") { "Green" } else { "Red" })
Write-Host ""

# 21. Get Currency Rates
Write-Host "[21] Get Currency Rates..." -ForegroundColor Yellow
$getRates = Test-Endpoint -Name "Get Currency Rates" -Method "GET" -Url "$baseUrl/currencies/rates?from=UZS"
$results += $getRates.Result
Write-Host "   $($getRates.Result.Status)" -ForegroundColor $(if ($getRates.Result.Status -eq "PASSED") { "Green" } else { "Red" })
Write-Host ""

# 22. Recommended Projects
if ($freelancerToken) {
    Write-Host "[22] Recommended Projects..." -ForegroundColor Yellow
    $recommendedProjects = Test-Endpoint -Name "Recommended Projects" -Method "GET" -Url "$baseUrl/projects/recommended" `
        -Headers @{ Authorization = "Bearer $freelancerToken" }
    $results += $recommendedProjects.Result
    Write-Host "   $($recommendedProjects.Result.Status)" -ForegroundColor $(if ($recommendedProjects.Result.Status -eq "PASSED") { "Green" } else { "Red" })
    Write-Host ""
}

# 23. Recommended Freelancers
if ($projectId) {
    Write-Host "[23] Recommended Freelancers..." -ForegroundColor Yellow
    $recommendedFreelancers = Test-Endpoint -Name "Recommended Freelancers" -Method "GET" -Url "$baseUrl/freelancers/recommended?project_id=$projectId"
    $results += $recommendedFreelancers.Result
    Write-Host "   $($recommendedFreelancers.Result.Status)" -ForegroundColor $(if ($recommendedFreelancers.Result.Status -eq "PASSED") { "Green" } else { "Red" })
    Write-Host ""
}

# 24. Save Project
if ($freelancerToken -and $projectId) {
    Write-Host "[24] Save Project..." -ForegroundColor Yellow
    $saveProject = Test-Endpoint -Name "Save Project" -Method "POST" -Url "$baseUrl/projects/$projectId/save" `
        -Headers @{ Authorization = "Bearer $freelancerToken" }
    $results += $saveProject.Result
    Write-Host "   $($saveProject.Result.Status)" -ForegroundColor $(if ($saveProject.Result.Status -eq "PASSED") { "Green" } else { "Red" })
    Write-Host ""
}

# 25. AI Job Match
if ($freelancerToken) {
    Write-Host "[25] AI Job Match..." -ForegroundColor Yellow
    $aiJobMatch = Test-Endpoint -Name "AI Job Match" -Method "POST" -Url "$baseUrl/ai/job-match" `
        -Headers @{ Authorization = "Bearer $freelancerToken" }
    $results += $aiJobMatch.Result
    Write-Host "   $($aiJobMatch.Result.Status)" -ForegroundColor $(if ($aiJobMatch.Result.Status -eq "PASSED") { "Green" } else { "Red" })
    Write-Host ""
}

# ========== ОТЧЕТ ==========
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FINAL REPORT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passed = ($results | Where-Object { $_.Status -eq "PASSED" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAILED" }).Count
$partial = ($results | Where-Object { $_.Status -eq "PARTIAL" }).Count
$total = $results.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Partial: $partial" -ForegroundColor Yellow
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host ""

$successRate = [math]::Round(($passed / $total) * 100, 2)
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" })
Write-Host ""

Write-Host "Test Details:" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray

foreach ($result in $results) {
    $color = switch ($result.Status) {
        "PASSED" { "Green" }
        "PARTIAL" { "Yellow" }
        "FAILED" { "Red" }
        default { "White" }
    }
    
    Write-Host "$($result.Status) - $($result.Name)" -ForegroundColor $color
    Write-Host "   URL: $($result.Method) $($result.Url)" -ForegroundColor Gray
    if ($result.StatusCode -ne 0) {
        Write-Host "   Status Code: $($result.StatusCode)" -ForegroundColor Gray
    }
    if ($result.Time) {
        Write-Host "   Time: $($result.Time)" -ForegroundColor Gray
    }
    if ($result.Message) {
        Write-Host "   Message: $($result.Message)" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing completed!" -ForegroundColor Green
Write-Host ""

# Сохранить отчет в файл
$reportFile = "test-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$reportContent = @"
UzWork Backend API Test Report
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

SUMMARY:
Total Tests: $total
Passed: $passed
Partial: $partial
Failed: $failed
Success Rate: $successRate%

DETAILS:
$($results | ForEach-Object {
    "$($_.Status) - $($_.Name)`n   Method: $($_.Method)`n   URL: $($_.Url)`n   Status Code: $($_.StatusCode)`n   Message: $($_.Message)`n   Time: $($_.Time)`n"
} | Out-String)
"@

$reportContent | Out-File -FilePath $reportFile -Encoding UTF8
Write-Host "Report saved to: $reportFile" -ForegroundColor Cyan
Write-Host ""
