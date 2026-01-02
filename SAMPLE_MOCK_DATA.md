# Sample Mock Data for ESG Screening API

This document provides sample mock data for testing the new screening endpoints. You can use these examples with tools like Postman, cURL, or the built-in frontend interface.

## Test Credentials

Use these credentials to authenticate:
- **Email:** `admin@example.com`
- **Password:** `admin123`

## Sample Company IDs

From the seed data, here are the available company IDs:

```json
{
  "GreenTech Corp": "0dd09684-e763-4b82-baae-b22a5deafba6",
  "OilCo Industries": "48a15da8-13eb-42e0-9cd6-f662f30e2312",
  "CleanEnergy Inc": "c3cc9061-0b49-4c3f-92e0-01cdcea2baaa",
  "FastFashion Ltd": "4df7b2c8-4c50-4b64-a552-a95849f9545b",
  "SustainableGoods Co": "90c147eb-ef0e-4463-a544-7ba8338be4f9"
}
```

## Sample Criteria Set ID

```json
{
  "Standard ESG Screen": "d87a02a8-6009-44e6-af2c-4af61462ea44"
}
```

## Sample Requests and Expected Responses

### 1. Individual Company Screening

**Request:**
```bash
curl -X POST http://localhost:3000/screen/company \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "0dd09684-e763-4b82-baae-b22a5deafba6",
    "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"
  }'
```

**Expected Response (GreenTech Corp - should PASS):**
```json
{
  "companyResult": {
    "companyId": "0dd09684-e763-4b82-baae-b22a5deafba6",
    "companyName": "GreenTech Corp",
    "passed": true,
    "ruleResults": [
      {
        "ruleId": "...",
        "ruleName": "Carbon Emissions Limit",
        "passed": true,
        "severity": "exclude",
        "failureReason": null
      },
      {
        "ruleId": "...",
        "ruleName": "Board Diversity Minimum",
        "passed": true,
        "severity": "exclude",
        "failureReason": null
      },
      {
        "ruleId": "...",
        "ruleName": "Environmental Policy Required",
        "passed": true,
        "severity": "warn",
        "failureReason": null
      },
      {
        "ruleId": "...",
        "ruleName": "No High Controversies",
        "passed": true,
        "severity": "exclude",
        "failureReason": null
      }
    ]
  },
  "criteriaSet": {
    "id": "d87a02a8-6009-44e6-af2c-4af61462ea44",
    "name": "Standard ESG Screen",
    "version": "1.0",
    "isGlobal": true,
    "client": null
  },
  "screenedAt": "2024-01-01T00:00:00.000Z",
  "asOfDate": "2024-01-01T00:00:00.000Z"
}
```

**Test with OilCo Industries (should FAIL):**
```bash
curl -X POST http://localhost:3000/screen/company \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "48a15da8-13eb-42e0-9cd6-f662f30e2312",
    "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"
  }'
```

### 2. Multiple Companies Screening

**Request:**
```bash
curl -X POST http://localhost:3000/screen/companies \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyIds": [
      "0dd09684-e763-4b82-baae-b22a5deafba6",
      "48a15da8-13eb-42e0-9cd6-f662f30e2312",
      "c3cc9061-0b49-4c3f-92e0-01cdcea2baaa"
    ],
    "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"
  }'
```

**Expected Response (Mixed results):**
```json
{
  "criteriaSet": {
    "id": "d87a02a8-6009-44e6-af2c-4af61462ea44",
    "name": "Standard ESG Screen",
    "version": "1.0",
    "isGlobal": true,
    "client": null
  },
  "results": [
    {
      "companyId": "0dd09684-e763-4b82-baae-b22a5deafba6",
      "companyName": "GreenTech Corp",
      "passed": true,
      "ruleResults": [...]
    },
    {
      "companyId": "48a15da8-13eb-42e0-9cd6-f662f30e2312",
      "companyName": "OilCo Industries",
      "passed": false,
      "ruleResults": [...]
    },
    {
      "companyId": "c3cc9061-0b49-4c3f-92e0-01cdcea2baaa",
      "companyName": "CleanEnergy Inc",
      "passed": true,
      "ruleResults": [...]
    }
  ],
  "summary": {
    "totalHoldings": 3,
    "passed": 2,
    "failed": 1,
    "passRate": 67
  },
  "screenedAt": "2024-01-01T00:00:00.000Z",
  "asOfDate": "2024-01-01T00:00:00.000Z"
}
```

### 3. Sector Screening

**Request (Consumer sector):**
```bash
curl -X POST http://localhost:3000/screen/sector \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sector": "Consumer",
    "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"
  }'
```

**Expected Response (2 companies in Consumer sector):**
```json
{
  "sector": "Consumer",
  "criteriaSet": {
    "id": "d87a02a8-6009-44e6-af2c-4af61462ea44",
    "name": "Standard ESG Screen",
    "version": "1.0",
    "isGlobal": true,
    "client": null
  },
  "results": [
    {
      "companyId": "c3cc9061-0b49-4c3f-92e0-01cdcea2baaa",
      "companyName": "SustainableGoods Co",
      "passed": true,
      "ruleResults": [...]
    },
    {
      "companyId": "4df7b2c8-4c50-4b64-a552-a95849f9545b",
      "companyName": "FastFashion Ltd",
      "passed": true,
      "ruleResults": [...]
    }
  ],
  "summary": {
    "totalHoldings": 2,
    "passed": 2,
    "failed": 0,
    "passRate": 100
  },
  "screenedAt": "2024-01-01T00:00:00.000Z",
  "asOfDate": "2024-01-01T00:00:00.000Z"
}
```

### 4. Region Screening (Placeholder)

**Request:**
```bash
curl -X POST http://localhost:3000/screen/region \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "region": "Global",
    "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"
  }'
```

**Expected Response (All companies - placeholder implementation):**
```json
{
  "region": "Global",
  "criteriaSet": {
    "id": "d87a02a8-6009-44e6-af2c-4af61462ea44",
    "name": "Standard ESG Screen",
    "version": "1.0",
    "isGlobal": true,
    "client": null
  },
  "results": [
    {
      "companyId": "0dd09684-e763-4b82-baae-b22a5deafba6",
      "companyName": "GreenTech Corp",
      "passed": true,
      "ruleResults": [...]
    },
    {
      "companyId": "48a15da8-13eb-42e0-9cd6-f662f30e2312",
      "companyName": "OilCo Industries",
      "passed": false,
      "ruleResults": [...]
    },
    {
      "companyId": "c3cc9061-0b49-4c3f-92e0-01cdcea2baaa",
      "companyName": "SustainableGoods Co",
      "passed": true,
      "ruleResults": [...]
    },
    {
      "companyId": "4df7b2c8-4c50-4b64-a552-a95849f9545b",
      "companyName": "CleanEnergy Inc",
      "passed": true,
      "ruleResults": [...]
    },
    {
      "companyId": "90c147eb-ef0e-4463-a544-7ba8338be4f9",
      "companyName": "FastFashion Ltd",
      "passed": true,
      "ruleResults": [...]
    }
  ],
  "summary": {
    "totalHoldings": 5,
    "passed": 4,
    "failed": 1,
    "passRate": 80
  },
  "screenedAt": "2024-01-01T00:00:00.000Z",
  "asOfDate": "2024-01-01T00:00:00.000Z"
}
```

### 5. Custom Screening

**Request:**
```bash
curl -X POST http://localhost:3000/screen/custom \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"
  }'
```

**Expected Response (Same as region screening - all companies):**
```json
{
  "criteriaSet": {
    "id": "d87a02a8-6009-44e6-af2c-4af61462ea44",
    "name": "Standard ESG Screen",
    "version": "1.0",
    "isGlobal": true,
    "client": null
  },
  "results": [...],
  "summary": {
    "totalHoldings": 5,
    "passed": 4,
    "failed": 1,
    "passRate": 80
  },
  "screenedAt": "2024-01-01T00:00:00.000Z",
  "asOfDate": "2024-01-01T00:00:00.000Z"
}
```

## Expected Company Performance

Based on the seed data, here's what to expect:

### Companies That Should PASS (Good ESG):
- **GreenTech Corp**: Low carbon emissions (50), high board diversity (40%), has environmental policy, no controversies
- **CleanEnergy Inc**: Low carbon emissions (20), high board diversity (50%), has environmental policy, no controversies
- **SustainableGoods Co**: Low carbon emissions (30), high board diversity (45%), has environmental policy, low controversies
- **FastFashion Ltd**: Medium carbon emissions (200), medium board diversity (25%), has environmental policy, medium controversies

### Companies That Should FAIL (Poor ESG):
- **OilCo Industries**: Very high carbon emissions (5000), low board diversity (15%), no environmental policy, high controversies

## Test Scenarios

### Scenario 1: Individual Company Analysis
**Goal:** Analyze a single company's ESG performance
**Steps:**
1. Use GreenTech Corp (good ESG) - should PASS
2. Use OilCo Industries (poor ESG) - should FAIL
3. Examine rule-by-rule results to understand why

### Scenario 2: Company Comparison
**Goal:** Compare multiple companies
**Steps:**
1. Select 3 companies with different ESG profiles
2. Run multiple companies screening
3. Compare pass/fail rates and rule results

### Scenario 3: Sector Analysis
**Goal:** Analyze ESG performance by sector
**Steps:**
1. Screen Consumer sector (2 companies)
2. Screen Technology sector (1 company)
3. Compare sector performance

### Scenario 4: Comprehensive Analysis
**Goal:** Full database screening
**Steps:**
1. Run custom screening on all companies
2. Analyze overall pass rate
3. Identify best and worst performers

### Scenario 5: Region Analysis (Placeholder)
**Goal:** Test region screening (future enhancement)
**Steps:**
1. Use "Global" as region
2. Verify it screens all companies
3. Note: This will be enhanced when region data is available

## Using the Frontend Interface

The enhanced frontend includes a new "Advanced Screening" section with tabs for each screening type:

1. **Individual Company**: Select a company and criteria set
2. **Multiple Companies**: Select multiple companies (hold Ctrl/Cmd to select multiple)
3. **Sector Analysis**: Select a sector and criteria set
4. **Region Analysis**: Enter a region name and criteria set
5. **Custom Screening**: Select criteria set to screen all companies

## Error Cases to Test

1. **Invalid Company ID**: Use a non-existent company ID
2. **Invalid Criteria Set ID**: Use a non-existent criteria set ID
3. **Missing Parameters**: Omit required fields
4. **Unauthorized Access**: Try without authentication token
5. **Empty Selection**: Try multiple companies screening with no companies selected

## Performance Testing

For larger datasets, test:
- Response times with multiple companies
- Memory usage with sector screening
- Concurrent requests handling

## Mock Data for Development

If you need to create additional mock data, you can extend the seed script or use the import functionality to upload CSV files with company data.