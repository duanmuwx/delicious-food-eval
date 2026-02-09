# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WeChat Mini Program (微信小程序) for cafeteria food rating. Pure native mini program frontend with WeChat Cloud Development serverless backend. No third-party frameworks.

- **AppID:** `wx4e6f395dd184124b`
- **Cloud Environment:** `cloud1-5g6irawxd736c90e`

## Development

This project is developed and built entirely within **WeChat DevTools (微信开发者工具)**. There is no npm/yarn build pipeline or CLI test runner.

- Open the project root in WeChat DevTools
- Frontend source: `miniprogram/`
- Cloud functions: `cloudfunctions/` — each function is deployed individually via right-click → "Upload and Deploy" in WeChat DevTools
- Cloud functions use Node.js with the `wx-server-sdk` package; run `npm install` inside each cloud function directory before deploying

## Architecture

### Frontend (miniprogram/)

Three-tab layout: Home (今日菜品), Leaderboard (排行榜), My (我的). Two additional non-tab pages: Rate (rate) and Admin (admin).

- `pages/home/` — Today's dishes list, filtered by lunch/dinner toggle
- `pages/rate/` — Star rating (1-5) + optional comment for a dish
- `pages/rank/` — Top 10 dishes by average score, weekly/monthly toggle
- `pages/my/` — User's own rating history
- `pages/admin/` — Admin-only: add dishes (with optional photo upload), delete dishes, search historical dishes for reuse
- `components/` — `dish-card`, `star-rating`, `empty-state`
- `utils/auth.js` — Login flow and admin status check
- `utils/cloud.js` — Wrapper for `wx.cloud.callFunction`
- `utils/date.js` — Date formatting helpers

### Backend (cloudfunctions/)

Each subdirectory is an independent cloud function:

| Function | Role |
|---|---|
| `login` | Returns openid, checks admin status against `admins` collection |
| `submitRating` | Creates or updates a rating, recalculates dish `avgScore` |
| `addDish` | Admin-only: adds a dish record |
| `deleteDish` | Admin-only: deletes dish and all associated ratings |
| `getRanking` | Returns top 10 dishes by avg score for a given week/month |

### Database Collections (Cloud DB)

- **dishes** — `name`, `meal` (lunch/dinner), `date`, `imageFileId`, `avgScore`, `ratingCount`, `createdBy`, `createdAt`
- **ratings** — `dishId`, `userId`, `score` (1-5), `comment`, `date`, `createdAt`, `updatedAt`
- **admins** — `userId` (openid)

### Key Patterns

- Admin authorization is enforced server-side in cloud functions by checking the `admins` collection
- One rating per user per dish per day; submitting again updates the existing rating
- Average score is recalculated incrementally on each rating submission
- Image uploads go to WeChat Cloud Storage; `imageFileId` is stored on the dish record
- UI theme: orange primary (#FF8C42), warm background (#FFF5EE)
