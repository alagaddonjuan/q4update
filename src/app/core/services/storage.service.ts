import { Injectable } from '@angular/core';

const STORAGE_KEYS = {
  LOGGEDIN_USER_KEY: 'qvt__5f4eplj',
  TOKEN_KEY: 'xTD_tA21',
  TOKEN_LIFETIME: 'LFRLNGe',
};

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  // storeLoggedInUser(data: MsalUserProfile) {
  // 	localStorage.setItem(STORAGE_KEYS.LOGGEDIN_USER_KEY, JSON.stringify(data));
  // }

  // getLoggedInUser(): string | null {
  // 	const loggedUserData = localStorage.getItem(STORAGE_KEYS.LOGGEDIN_USER_KEY);
  // 	if (loggedUserData === null || loggedUserData === undefined) {
  // 		return null;
  // 	}
  // 	return JSON.parse(loggedUserData) as MsalUserProfile;
  // }

  // isUserLoggedIn(): boolean {
  // 	return !!this.getLoggedInUser();
  // }

  getLoggedInUser(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LOGGEDIN_USER_KEY);
  }

  storeLoggedInUser(user: string): void {
    localStorage.setItem(STORAGE_KEYS.LOGGEDIN_USER_KEY, user);
  }

  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.TOKEN_KEY, token);
  }

  clearStorage(): void {
    localStorage.removeItem(STORAGE_KEYS.LOGGEDIN_USER_KEY);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_KEY);
  }
}
