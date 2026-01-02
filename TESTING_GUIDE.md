# ESG Screening API - Testing Guide

This guide provides comprehensive instructions for testing the new screening endpoints that have been implemented.

## 🎯 Overview

The ESG Portfolio Screening API has been enhanced with 5 new screening endpoints that provide flexible, granular screening capabilities beyond the original portfolio-based screening.

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- Database seeded (run `npm run db:seed`)
- API server running (run `npm run dev`)

### Test Credentials
- **Email:** `admin@example.com`
- **Password:** `admin123`

## 📱 Testing Methods

You can test the API using:

1. **cURL Commands** - Direct API testing
2. **Postman** - API client for comprehensive testing
3. **Browser** - Direct endpoint testing
4. **Backend Test Script** - Automated API testing

## 🧪 Backend Test Script

The backend test script provides automated testing of all API endpoints without requiring a frontend interface.

### Running the Test Script

```bash
# Make sure the backend server is running first
npm run dev

# In a separate terminal, run the tests
node test_backend.js
```

### What the Test Script Does

1. **Health Check** - Verifies the API is running
2. **Authentication** - Tests login functionality
3. **Data Endpoints** - Tests companies, clients, and criteria sets endpoints
4. **Screening Endpoints** - Tests all 5 new screening endpoints
5. **Error Handling** - Verifies proper error responses

### Expected Output

```
🧪 Testing Backend API...
========================

🩺 Testing health endpoint...
✅ Health check passed: ok

🔐 Testing authentication...
✅ Authentication successful

📊 Testing data endpoints...
✅ Companies endpoint: 10 companies found
✅ Clients endpoint: 3 clients found
✅ Criteria sets endpoint: 2 criteria sets found

🔍 Testing screening endpoints...
✅ Individual company screening: Working
✅ Multiple companies screening: Working
✅ Sector screening: Working
✅ Region screening: Working
✅ Custom screening: Working

========================
🎉 Backend API tests completed successfully!
```



## 🐍 cURL Testing

For direct API testing, use these cURL commands:

### Get Authentication Token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'
```

### 1. Individual Company Screening
```bash
curl -X POST http://localhost:3000/screen/company \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"companyId": "0dd09684-e763-4b82-baae-b22a5deafba6", "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"}'
```

### 2. Multiple Companies Screening
```bash
curl -X POST http://localhost:3000/screen/companies \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"companyIds": ["0dd09684-e763-4b82-baae-b22a5deafba6", "48a15da8-13eb-42e0-9cd6-f662f30e2312"], "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"}'
```

### 3. Sector Screening
```bash
curl -X POST http://localhost:3000/screen/sector \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"sector": "Consumer", "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"}'
```

### 4. Region Screening
```bash
curl -X POST http://localhost:3000/screen/region \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"region": "Global", "criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"}'
```

### 5. Custom Screening
```bash
curl -X POST http://localhost:3000/screen/custom \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"criteriaSetId": "d87a02a8-6009-44e6-af2c-4af61462ea44"}'
```

## 🧪 Test Scenarios

### Scenario 1: Individual Company Analysis
**Objective:** Verify single company screening works correctly

**Steps:**
1. Test with GreenTech Corp (good ESG)
2. Verify it PASSES all rules
3. Test with OilCo Industries (poor ESG)
4. Verify it FAILS relevant rules
5. Check failure reasons are meaningful

**Expected Results:**
- ✅ GreenTech Corp: PASSED (4/4 rules)
- ❌ OilCo Industries: FAILED (carbon emissions, board diversity, environmental policy, controversies)

### Scenario 2: Company Comparison
**Objective:** Compare multiple companies with different ESG profiles

**Steps:**
1. Select 3 companies: GreenTech Corp, OilCo Industries, CleanEnergy Inc
2. Run multiple companies screening
3. Compare pass/fail rates
4. Analyze rule-by-rule differences

**Expected Results:**
- ✅ GreenTech Corp: PASSED
- ❌ OilCo Industries: FAILED
- ✅ CleanEnergy Inc: PASSED
- Summary: 2 passed, 1 failed, 67% pass rate

### Scenario 3: Sector Analysis
**Objective:** Analyze ESG performance by sector

**Steps:**
1. Screen Consumer sector (2 companies)
2. Screen Technology sector (1 company)
3. Compare sector performance
4. Identify sector trends

**Expected Results:**
- ✅ Consumer: 2/2 companies pass (100%)
- ✅ Technology: 1/1 company passes (100%)
- ❌ Energy: 0/1 company passes (0%)

### Scenario 4: Comprehensive Analysis
**Objective:** Full database screening

**Steps:**
1. Run custom screening on all companies
2. Analyze overall pass rate
3. Identify best and worst performers
4. Review failure reasons

**Expected Results:**
- 5 companies screened
- 4 passed, 1 failed
- 80% overall pass rate
- OilCo Industries is the worst performer

### Scenario 5: Region Analysis (Placeholder)
**Objective:** Test region screening functionality

**Steps:**
1. Use "Global" as region
2. Verify it screens all companies
3. Check results match custom screening
4. Note placeholder implementation

**Expected Results:**
- All 5 companies screened
- Same results as custom screening
- 80% pass rate

## ⚠️ Error Testing

### Test Cases:
1. **Invalid Company ID:** Use non-existent company ID
2. **Invalid Criteria Set ID:** Use non-existent criteria set ID
3. **Missing Parameters:** Omit required fields
4. **Unauthorized Access:** Try without authentication token
5. **Empty Selection:** Multiple companies with no selection

**Expected Errors:**
- `404 Not Found`: Company or criteria set not found
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Permission denied

## 📊 Expected Results Summary

### Company ESG Profiles:

| Company | Carbon Emissions | Board Diversity | Environmental Policy | Controversies | Expected Result |
|---------|------------------|-----------------|----------------------|---------------|-----------------|
| GreenTech Corp | 50 (low) | 40% (high) | ✅ Yes | None | ✅ PASS |
| OilCo Industries | 5000 (very high) | 15% (low) | ❌ No | High | ❌ FAIL |
| CleanEnergy Inc | 20 (low) | 50% (high) | ✅ Yes | None | ✅ PASS |
| FastFashion Ltd | 200 (medium) | 25% (medium) | ✅ Yes | Medium | ✅ PASS |
| SustainableGoods Co | 30 (low) | 45% (high) | ✅ Yes | Low | ✅ PASS |

### Criteria Set Rules:
1. **Carbon Emissions Limit**: Must be < 500 tons/year
2. **Board Diversity Minimum**: Must be ≥ 30%
3. **Environmental Policy Required**: Must have policy (warn severity)
4. **No High Controversies**: Must not have high controversies

### Expected Failures:
- **OilCo Industries**: Fails all 4 rules (3 exclude, 1 warn)
- **FastFashion Ltd**: Fails board diversity rule (25% < 30%)

## 🔍 Validation Checklist

### Functional Testing:
- [ ] Individual company screening works
- [ ] Multiple companies screening works
- [ ] Sector screening works
- [ ] Region screening works (placeholder)
- [ ] Custom screening works
- [ ] All endpoints require authentication
- [ ] Input validation works
- [ ] Error handling is appropriate

### Data Accuracy:
- [ ] GreenTech Corp passes all rules
- [ ] OilCo Industries fails all rules
- [ ] Summary statistics are correct
- [ ] Pass rates are calculated correctly
- [ ] Failure reasons are meaningful

### UI Testing:
- [ ] Tab switching works
- [ ] Company dropdowns are populated
- [ ] Sector dropdown is populated
- [ ] Criteria set dropdowns are populated
- [ ] Multiple selection works (hold Ctrl/Cmd)
- [ ] Results display correctly
- [ ] Status indicators show correctly (✅/❌)

### Performance:
- [ ] Response times are reasonable (< 1s)
- [ ] No memory leaks
- [ ] Handles concurrent requests
- [ ] Scales with more companies

## 📈 Sample Test Results

### Individual Company Screening:
```
✅ GreenTech Corp: PASSED (4/4 rules)
  - Carbon Emissions: ✅ 50 < 500
  - Board Diversity: ✅ 40% ≥ 30%
  - Environmental Policy: ✅ Has policy
  - Controversies: ✅ None (not high)

❌ OilCo Industries: FAILED (1/4 rules)
  - Carbon Emissions: ❌ 5000 ≥ 500
  - Board Diversity: ❌ 15% < 30%
  - Environmental Policy: ❌ No policy
  - Controversies: ❌ High level
```

### Sector Screening (Consumer):
```
📊 Consumer Sector Results:
- Total Companies: 2
- Passed: 2 (100%)
- Failed: 0 (0%)
- Pass Rate: 100%

✅ SustainableGoods Co: PASSED
✅ FastFashion Ltd: PASSED
```

### Custom Screening (All Companies):
```
📊 Overall ESG Performance:
- Total Companies: 5
- Passed: 4 (80%)
- Failed: 1 (20%)
- Pass Rate: 80%

✅ GreenTech Corp: PASSED
❌ OilCo Industries: FAILED
✅ CleanEnergy Inc: PASSED
✅ FastFashion Ltd: PASSED
✅ SustainableGoods Co: PASSED
```

## 🎓 Tips for Effective Testing

1. **Start Small:** Test individual endpoints before complex scenarios
2. **Use Frontend First:** The UI provides visual feedback and is easier to use
3. **Check Console:** Look for JavaScript errors in browser console
4. **Verify Data:** Cross-check results with expected outcomes
5. **Test Edge Cases:** Try unusual inputs and boundary conditions
6. **Clear Cache:** Sometimes browser cache can cause issues
7. **Use Incognito:** Test in incognito mode to avoid cached data
8. **Check Network Tab:** Monitor API requests in browser dev tools

## 🐛 Common Issues & Solutions

### Issue: Authentication Fails
**Solution:**
- Check token is valid
- Verify credentials
- Clear localStorage and relogin
- Check server is running

### Issue: No Companies Showing
**Solution:**
- Run database seed: `npm run db:seed`
- Restart server
- Check database connection

### Issue: Screening Results Empty
**Solution:**
- Verify company and criteria set IDs
- Check API response in network tab
- Ensure proper authentication
- Verify data exists in database

### Issue: CORS Errors
**Solution:**
- Ensure frontend and backend are on same domain
- Check server CORS configuration
- Use proper headers in requests

## 📚 Additional Resources

- **API Documentation:** `NEW_ENDPOINTS_DOCUMENTATION.md`
- **Sample Data:** `SAMPLE_MOCK_DATA.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`
- **Postman Collection:** Import `postman-collection.json`

## 🎉 Success Criteria

Testing is complete when:
- ✅ All endpoints return correct responses
- ✅ Error handling works properly
- ✅ Frontend interface is functional
- ✅ Performance is acceptable
- ✅ Data accuracy is verified
- ✅ All test scenarios pass

## 📝 Test Report Template

```markdown
# ESG Screening API Test Report

## Test Summary
- **Date:** [Date]
- **Tester:** [Your Name]
- **Environment:** [Development/Production]
- **Browser:** [Chrome/Firefox/Safari]

## Test Results

### ✅ Passed Tests
- [ ] Individual company screening
- [ ] Multiple companies screening
- [ ] Sector screening
- [ ] Region screening
- [ ] Custom screening
- [ ] Authentication
- [ ] Input validation
- [ ] Error handling

### ❌ Failed Tests
- [ ] [List any failed tests]

### 📊 Performance Metrics
- **Average Response Time:** [X]ms
- **Max Response Time:** [X]ms
- **Memory Usage:** [X]MB
- **Concurrent Requests:** [X]

### 🐛 Issues Found
- [ ] [List any issues found]

## Recommendations
- [ ] [Any recommendations for improvement]

## Sign-off
**Tester:** [Your Name]
**Date:** [Date]
**Status:** [PASS/FAIL]
```

## 🎯 Conclusion

This testing guide provides comprehensive instructions for verifying the new ESG screening endpoints. The implementation includes:

- **5 New Endpoints:** Individual, Multiple, Sector, Region, Custom screening
- **Enhanced Frontend:** User-friendly interface with tabs
- **Comprehensive Testing:** Sample data, expected results, test scenarios
- **Error Handling:** Proper validation and error responses
- **Documentation:** Complete API documentation and guides

The system is ready for thorough testing and production deployment!