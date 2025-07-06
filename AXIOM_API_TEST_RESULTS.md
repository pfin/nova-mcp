# Axiom API Corner Case Test Results

**Test Date**: July 5, 2025  
**API Version**: Axiom 1.0.0 / QuantLib 1.38

## Executive Summary

The Axiom API endpoints were tested with various corner cases and edge scenarios. The API shows good resilience with most tests passing, but there are several areas where error handling could be improved.

## Key Findings

### 1. **Curve Building Endpoint** (`/api/axiom/curve`)

#### Successful Handling:
- ✅ **Negative rates**: Accepted and processed (-0.5% to 0.25%)
- ✅ **Zero rates**: Accepted and processed
- ✅ **Very high rates**: Accepted and processed (50%)
- ✅ **Empty quotes array**: Returns success with default curve
- ✅ **Invalid quote types**: Silently ignored (no error)
- ✅ **Missing fields**: Silently uses undefined values
- ✅ **String values for numbers**: Coerced or ignored
- ✅ **Special characters**: Accepted without sanitization

#### Issues Found:
- ❌ **Missing quotes array**: Returns 400 error (correct behavior)
- ⚠️ **Type validation**: No validation for rate values (strings accepted)
- ⚠️ **Silent failures**: Invalid data often ignored without warning

### 2. **Swap Pricing Endpoint** (`/api/axiom/swap`)

#### Successful Handling:
- ✅ **Zero notional**: Returns valid NPV calculation
- ✅ **Negative notional**: Processes without error
- ✅ **Past maturity dates**: Accepts historical dates
- ✅ **Very large notionals**: Handles 1 trillion notional

#### Issues Found:
- ❌ **Missing required fields**: Returns 400 error (correct)
- ⚠️ **Mock implementation**: All tests return same NPV (-12435.67)
- ⚠️ **No date validation**: Past dates accepted without warning

### 3. **Swaption Pricing Endpoint** (`/api/axiom/swaption`)

#### Successful Handling:
- ✅ **Extreme volatility**: Accepts 200% volatility
- ✅ **Zero volatility**: Processes without error
- ✅ **Negative strikes**: Accepts negative values
- ✅ **Extreme vol smile parameters**: Handles -50% skew

#### Issues Found:
- ⚠️ **Mock implementation**: All tests return same premium (125435)
- ⚠️ **No parameter validation**: Accepts unrealistic values
- ⚠️ **No bounds checking**: Extreme values processed silently

### 4. **General API Behavior**

#### Positive Aspects:
- ✅ **JSON parsing errors**: Returns 500 with clear error message
- ✅ **GET endpoints**: Provide helpful example data
- ✅ **Error structure**: Consistent error response format

#### Areas for Improvement:
- ⚠️ **Input validation**: Minimal validation on input parameters
- ⚠️ **Mock responses**: Static values indicate mock implementation
- ⚠️ **Security**: No input sanitization for special characters
- ⚠️ **Type coercion**: Silent type conversions without warnings

## Detailed Test Results

### Corner Case Categories

1. **Extreme Values**
   - Negative rates: PASS (but should these be allowed?)
   - Zero rates: PASS
   - Very high rates (50%): PASS
   - Very large notionals ($1T): PASS

2. **Invalid Data Types**
   - String instead of number: PASS (coerced)
   - Missing required fields: FAIL (400 error - correct)
   - Invalid enum values: PASS (ignored)

3. **Malformed Requests**
   - Invalid JSON: FAIL (500 error with details - correct)
   - Wrong content type: FAIL (500 error - correct)
   - Empty body: FAIL (400 error - correct)

4. **Security Concerns**
   - Special characters: PASS (not sanitized)
   - SQL injection attempts: PASS (accepted as string)
   - Unicode characters: PASS (accepted)

## Recommendations

### High Priority:
1. **Implement Real Calculations**: Replace mock values with actual QuantLib calculations
2. **Add Input Validation**: Validate ranges for rates, dates, and notionals
3. **Type Checking**: Enforce strict type checking for numeric fields
4. **Date Validation**: Reject past dates for new trades

### Medium Priority:
1. **Parameter Bounds**: Set reasonable limits (e.g., vol 0-100%, rates -5% to 50%)
2. **Warning System**: Return warnings for unusual but valid inputs
3. **Input Sanitization**: Clean special characters from string inputs
4. **Better Error Messages**: Provide specific validation failure reasons

### Low Priority:
1. **Rate Limiting**: Implement rate limiting for API endpoints
2. **Request Logging**: Log unusual requests for monitoring
3. **Documentation**: Document acceptable parameter ranges
4. **Response Compression**: Compress large daily forward arrays

## Test Script Locations

- Full test script: `/test-corner-cases.sh`
- Summary test script: `/test-corner-cases-summary.sh`
- This report: `/AXIOM_API_TEST_RESULTS.md`

## Conclusion

The Axiom API demonstrates basic functionality and handles many edge cases gracefully. However, the prevalence of mock responses (identical values across different inputs) suggests the implementation is not yet complete. The main areas for improvement are:

1. Completing the actual QuantLib integration
2. Adding comprehensive input validation
3. Implementing proper error handling for edge cases
4. Adding security measures for input sanitization

The API structure is sound, but it needs the actual quantitative finance calculations to be production-ready.