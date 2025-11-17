import { Injectable } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';


export const Auth: HttpInterceptorFn = (req, next) => {
      const token = localStorage.getItem('token');
  
  // Define public endpoints that don't need authorization
  const publicEndpoints = ['/auth/', '/ussd_callback', '/billing/webhook'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => req.url.includes(endpoint));
  
  // Only add Authorization header if token exists AND it's NOT a public endpoint
  if (token && !isPublicEndpoint) {
    const cloned = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
      }
    });
    return next(cloned);
  }
  
  // For public endpoints or when no token, pass the request as-is
  // Don't add any headers - let Angular HttpClient handle Content-Type automatically
  return next(req);
}
