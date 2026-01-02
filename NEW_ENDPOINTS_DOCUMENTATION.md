# New Screening Endpoints Documentation

This document describes the new screening endpoints that have been added to the ESG Portfolio Screening API.

## Overview

The following new endpoints have been implemented to provide more flexible screening capabilities:

1. **Individual Company Screening** - Screen a single company against a criteria set
2. **Multiple Companies Screening** - Screen multiple companies against a criteria set
3. **Sector-based Screening** - Screen all companies in a specific sector
4. **Region-based Screening** - Screen companies by region (placeholder implementation)
5. **Custom Criteria Screening** - Screen all companies with custom criteria

## Authentication

All endpoints require authentication. Include a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Screen Individual Company

**POST** `/screen/company`

Screen a single company against a criteria set.

**Request Body:**
```json
{
  "companyId": "string (uuid)",
  "criteriaSetId": "string (uuid)",
  "asOfDate": "string (datetime, optional)"
}
```

**Response:**
```json
{
  "companyResult": {
    "companyId": "string",
    "companyName": "string",
    "passed": "boolean",
    "ruleResults": [
      {
        "ruleId": "string",
        "ruleName": "string",
        "passed": "boolean",
        "severity": "string",
        "failureReason": "string (optional)"
      }
    ]
  },
  "criteriaSet": {
    "id": "string",
    "name": "string",
    "version": "string",
    "isGlobal": "boolean",
    "client": {
      "id": "string",
      "name": "string"
    }
  },
  "screenedAt": "string (datetime)",
  "asOfDate": "string (datetime)"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/screen/company \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "0dd09684-e763-4b82-baae-b22a5deafba6",
    "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"
  }'
```

### 2. Screen Multiple Companies

**POST** `/screen/companies`

Screen multiple companies against a criteria set.

**Request Body:**
```json
{
  "companyIds": ["string (uuid)"],
  "criteriaSetId": "string (uuid)",
  "asOfDate": "string (datetime, optional)"
}
```

**Response:**
```json
{
  "criteriaSet": {
    "id": "string",
    "name": "string",
    "version": "string",
    "isGlobal": "boolean",
    "client": {
      "id": "string",
      "name": "string"
    }
  },
  "results": [
    {
      "companyId": "string",
      "companyName": "string",
      "passed": "boolean",
      "ruleResults": [
        {
          "ruleId": "string",
          "ruleName": "string",
          "passed": "boolean",
          "severity": "string",
          "failureReason": "string (optional)"
        }
      ]
    }
  ],
  "summary": {
    "totalHoldings": "number",
    "passed": "number",
    "failed": "number",
    "passRate": "number"
  },
  "screenedAt": "string (datetime)",
  "asOfDate": "string (datetime)"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/screen/companies \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyIds": [
      "0dd09684-e763-4b82-baae-b22a5deafba6",
      "48a15da8-13eb-42e0-9cd6-f662f30e2312"
    ],
    "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"
  }'
```

### 3. Screen Companies by Sector

**POST** `/screen/sector`

Screen all companies in a specific sector against a criteria set.

**Request Body:**
```json
{
  "sector": "string",
  "criteriaSetId": "string (uuid)",
  "asOfDate": "string (datetime, optional)"
}
```

**Response:**
```json
{
  "sector": "string",
  "criteriaSet": {
    "id": "string",
    "name": "string",
    "version": "string",
    "isGlobal": "boolean",
    "client": {
      "id": "string",
      "name": "string"
    }
  },
  "results": [
    {
      "companyId": "string",
      "companyName": "string",
      "passed": "boolean",
      "ruleResults": [
        {
          "ruleId": "string",
          "ruleName": "string",
          "passed": "boolean",
          "severity": "string",
          "failureReason": "string (optional)"
        }
      ]
    }
  ],
  "summary": {
    "totalHoldings": "number",
    "passed": "number",
    "failed": "number",
    "passRate": "number"
  },
  "screenedAt": "string (datetime)",
  "asOfDate": "string (datetime)"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/screen/sector \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sector": "Consumer",
    "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"
  }'
```

### 4. Screen Companies by Region

**POST** `/screen/region`

Screen companies by region against a criteria set.

**Note:** This is a placeholder implementation. The current database schema doesn't include a region field on the Company model. In a production environment, you would need to add a region field to the Company model or use a different approach to filter by region.

**Request Body:**
```json
{
  "region": "string",
  "criteriaSetId": "string (uuid)",
  "asOfDate": "string (datetime, optional)"
}
```

**Response:** Same structure as sector screening, but with a `region` field instead of `sector`.

**Example:**
```bash
curl -X POST http://localhost:3000/screen/region \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "region": "Europe",
    "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"
  }'
```

### 5. Screen Companies with Custom Criteria

**POST** `/screen/custom`

Screen all companies with custom criteria.

**Request Body:**
```json
{
  "criteriaSetId": "string (uuid)",
  "asOfDate": "string (datetime, optional)"
}
```

**Response:** Same structure as sector screening, but without a specific filter field.

**Example:**
```bash
curl -X POST http://localhost:3000/screen/custom \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"
  }'
```

## Error Handling

All endpoints follow the same error handling pattern as the existing API:

- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: User doesn't have permission to access the resource
- **404 Not Found**: Company, criteria set, or other resource not found
- **500 Internal Server Error**: Server-side errors

## Implementation Notes

1. **Data Consistency**: All new endpoints use the same screening logic and rules engine as the existing portfolio screening endpoint.

2. **Performance**: The endpoints are optimized to fetch parameter values in bulk and build parameter maps for efficient screening.

3. **Extensibility**: The region screening endpoint is implemented as a placeholder that can be easily extended when the database schema includes region information.

4. **Validation**: All endpoints use Zod for input validation to ensure data consistency.

5. **Authentication**: All endpoints require authentication and support the same user roles as the existing API.

## Testing

The implementation includes:

- TypeScript type checking
- Database seed data for testing
- Test script to verify endpoint functionality
- Comprehensive error handling

## Future Enhancements

1. Add region field to Company model for proper region-based screening
2. Add pagination support for large result sets
3. Add filtering and sorting options
4. Add export functionality for screening results
5. Add more detailed analytics and reporting features