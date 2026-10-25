// Do not display arbitrary provider query parameters as trusted instructions.
export function redirectAuthError(url) {
 const parsed=new URL(url),hash=new URLSearchParams(parsed.hash.slice(1));
 const code=parsed.searchParams.get('error_code')||hash.get('error_code');
 if(code==='otp_expired')return 'This sign-in link has expired or was already used. Use the newest email link once. If email is rate-limited, wait before requesting another.';
 if(parsed.searchParams.has('error')||hash.has('error'))return 'Email sign-in could not be completed. Request a fresh link and open it in the same browser profile.';
 return '';
}
export function authErrorMessage(error) {
 const message=error?.message||'Sign-in failed. Please try again.';
 if(error?.status===429||/rate limit|only request this after/i.test(message))return 'Email requests are temporarily limited by the authentication provider. Wait before trying again. Team-wide testing may require a configured email provider (SMTP).';
 return message;
}
