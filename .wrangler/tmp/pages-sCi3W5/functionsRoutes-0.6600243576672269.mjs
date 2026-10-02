import { onRequestPost as __api_forum_posts__id__follow_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\forum\\posts\\[id]\\follow.ts"
import { onRequestPost as __api_forum_posts__id__replies_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\forum\\posts\\[id]\\replies.ts"
import { onRequestPost as __api_forum_posts__id__upvote_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\forum\\posts\\[id]\\upvote.ts"
import { onRequestGet as __api_community_avatar__id__ts_onRequestGet } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\community\\avatar\\[id].ts"
import { onRequestGet as __api_forum_posts__id__ts_onRequestGet } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\forum\\posts\\[id].ts"
import { onRequestDelete as __api_auth_avatar_ts_onRequestDelete } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\avatar.ts"
import { onRequestOptions as __api_auth_avatar_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\avatar.ts"
import { onRequestPost as __api_auth_avatar_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\auth\\avatar.ts"
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
import { onRequestGet as __api_community_leaderboard_ts_onRequestGet } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\community\\leaderboard.ts"
import { onRequestGet as __api_forum_posts_index_ts_onRequestGet } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\forum\\posts\\index.ts"
import { onRequestPost as __api_forum_posts_index_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\forum\\posts\\index.ts"
import { onRequestOptions as __api_pawn_record_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\pawn\\record.ts"
import { onRequestPost as __api_pawn_record_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\pawn\\record.ts"
import { onRequestOptions as __api_puzzles_solve_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\puzzles\\solve.ts"
import { onRequestPost as __api_puzzles_solve_ts_onRequestPost } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\puzzles\\solve.ts"
import { onRequestGet as __api_puzzles_ts_onRequestGet } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\puzzles.ts"
import { onRequestOptions as __api_puzzles_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\puzzles.ts"
import { onRequest as __api__middleware_ts_onRequest } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\_middleware.ts"

export const routes = [
    {
      routePath: "/api/forum/posts/:id/follow",
      mountPath: "/api/forum/posts/:id",
      method: "POST",
      middlewares: [],
      modules: [__api_forum_posts__id__follow_ts_onRequestPost],
    },
  {
      routePath: "/api/forum/posts/:id/replies",
      mountPath: "/api/forum/posts/:id",
      method: "POST",
      middlewares: [],
      modules: [__api_forum_posts__id__replies_ts_onRequestPost],
    },
  {
      routePath: "/api/forum/posts/:id/upvote",
      mountPath: "/api/forum/posts/:id",
      method: "POST",
      middlewares: [],
      modules: [__api_forum_posts__id__upvote_ts_onRequestPost],
    },
  {
      routePath: "/api/community/avatar/:id",
      mountPath: "/api/community/avatar",
      method: "GET",
      middlewares: [],
      modules: [__api_community_avatar__id__ts_onRequestGet],
    },
  {
      routePath: "/api/forum/posts/:id",
      mountPath: "/api/forum/posts",
      method: "GET",
      middlewares: [],
      modules: [__api_forum_posts__id__ts_onRequestGet],
    },
  {
      routePath: "/api/auth/avatar",
      mountPath: "/api/auth",
      method: "DELETE",
      middlewares: [],
      modules: [__api_auth_avatar_ts_onRequestDelete],
    },
  {
      routePath: "/api/auth/avatar",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_avatar_ts_onRequestOptions],
    },
  {
      routePath: "/api/auth/avatar",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_avatar_ts_onRequestPost],
    },
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
      routePath: "/api/community/leaderboard",
      mountPath: "/api/community",
      method: "GET",
      middlewares: [],
      modules: [__api_community_leaderboard_ts_onRequestGet],
    },
  {
      routePath: "/api/forum/posts",
      mountPath: "/api/forum/posts",
      method: "GET",
      middlewares: [],
      modules: [__api_forum_posts_index_ts_onRequestGet],
    },
  {
      routePath: "/api/forum/posts",
      mountPath: "/api/forum/posts",
      method: "POST",
      middlewares: [],
      modules: [__api_forum_posts_index_ts_onRequestPost],
    },
  {
      routePath: "/api/pawn/record",
      mountPath: "/api/pawn",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_pawn_record_ts_onRequestOptions],
    },
  {
      routePath: "/api/pawn/record",
      mountPath: "/api/pawn",
      method: "POST",
      middlewares: [],
      modules: [__api_pawn_record_ts_onRequestPost],
    },
  {
      routePath: "/api/puzzles/solve",
      mountPath: "/api/puzzles",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_puzzles_solve_ts_onRequestOptions],
    },
  {
      routePath: "/api/puzzles/solve",
      mountPath: "/api/puzzles",
      method: "POST",
      middlewares: [],
      modules: [__api_puzzles_solve_ts_onRequestPost],
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
  {
      routePath: "/api",
      mountPath: "/api",
      method: "",
      middlewares: [__api__middleware_ts_onRequest],
      modules: [],
    },
  ]