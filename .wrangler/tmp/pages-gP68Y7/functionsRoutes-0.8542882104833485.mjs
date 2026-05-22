import { onRequestGet as __api_puzzles_ts_onRequestGet } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\puzzles.ts"
import { onRequestOptions as __api_puzzles_ts_onRequestOptions } from "C:\\Users\\luisc\\chessparfait\\functions\\api\\puzzles.ts"

export const routes = [
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