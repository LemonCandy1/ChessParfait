import { onRequestOptions as __api_auth_forgot_password_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\forgot-password.ts"
import { onRequestPost as __api_auth_forgot_password_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\forgot-password.ts"
import { onRequestOptions as __api_auth_google_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\google.ts"
import { onRequestPost as __api_auth_google_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\google.ts"
import { onRequestOptions as __api_auth_link_email_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\link-email.ts"
import { onRequestPost as __api_auth_link_email_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\link-email.ts"
import { onRequestOptions as __api_auth_login_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\login.ts"
import { onRequestPost as __api_auth_login_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\login.ts"
import { onRequestOptions as __api_auth_logout_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\logout.ts"
import { onRequestPost as __api_auth_logout_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\logout.ts"
import { onRequestGet as __api_auth_me_ts_onRequestGet } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\me.ts"
import { onRequestOptions as __api_auth_me_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\me.ts"
import { onRequestOptions as __api_auth_register_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\register.ts"
import { onRequestPost as __api_auth_register_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\register.ts"
import { onRequestOptions as __api_auth_session_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\session.ts"
import { onRequestPost as __api_auth_session_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\session.ts"
import { onRequestOptions as __api_auth_setup_profile_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\setup-profile.ts"
import { onRequestPost as __api_auth_setup_profile_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\setup-profile.ts"
import { onRequestGet as __api_puzzles_ts_onRequestGet } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\puzzles.ts"
import { onRequestOptions as __api_puzzles_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\puzzles.ts"

export const routes = [
    {
      routePath: "/api/auth/forgot-password",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_forgot_password_ts_onRequestOptions],
    },
  {
      routePath: "/api/auth/forgot-password",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_forgot_password_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/google",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_google_ts_onRequestOptions],
    },
  {
      routePath: "/api/auth/google",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_google_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/link-email",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_link_email_ts_onRequestOptions],
    },
  {
      routePath: "/api/auth/link-email",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_link_email_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_login_ts_onRequestOptions],
    },
  {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/logout",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_logout_ts_onRequestOptions],
    },
  {
      routePath: "/api/auth/logout",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_logout_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/me",
      mountPath: "/api/auth",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_me_ts_onRequestGet],
    },
  {
      routePath: "/api/auth/me",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_me_ts_onRequestOptions],
    },
  {
      routePath: "/api/auth/register",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_register_ts_onRequestOptions],
    },
  {
      routePath: "/api/auth/register",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_register_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/session",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_session_ts_onRequestOptions],
    },
  {
      routePath: "/api/auth/session",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_session_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/setup-profile",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_setup_profile_ts_onRequestOptions],
    },
  {
      routePath: "/api/auth/setup-profile",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_setup_profile_ts_onRequestPost],
    },
  {
      routePath: "/api/puzzles",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_puzzles_ts_onRequestGet],
    },
  {
      routePath: "/api/puzzles",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_puzzles_ts_onRequestOptions],
    },
  ]