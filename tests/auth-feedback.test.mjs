import test from 'node:test';
import assert from 'node:assert/strict';
import {redirectAuthError,authErrorMessage} from '../lib/cloud/auth-feedback.mjs';
test('expired callback links explain recovery without echoing arbitrary provider text',()=>{
 assert.match(redirectAuthError('https://example.com/?error_code=otp_expired&error_description=untrusted'),/already used/);
 assert.match(redirectAuthError('https://example.com/#error=access_denied&error_code=otp_expired'),/expired/);
 assert.equal(redirectAuthError('https://example.com/?code=valid-code'), '');
 assert.doesNotMatch(redirectAuthError('https://example.com/?error=bad&error_description=untrusted'),/untrusted/);
});
test('provider throttling has actionable feedback and other errors retain their message',()=>{
 assert.match(authErrorMessage({status:429,message:'over_email_send_rate_limit'}),/temporarily limited/);
 assert.match(authErrorMessage({message:'email rate limit exceeded'}),/SMTP/);
 assert.equal(authErrorMessage({message:'Network unavailable'}),'Network unavailable');
});
