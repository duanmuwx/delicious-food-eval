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

Three-tab layout: Home (今日菜品), Leaderboard (排行榜), My (我的). Seven additional non-tab pages.

- `pages/home/` — Today's dishes list, filtered by breakfast/lunch/dinner toggle; supports sharing via `onShareAppMessage`
- `pages/rate/` — Star rating (1-5, half-star supported) + optional comment for a dish
- `pages/rank/` — Top 10 dishes by average score, weekly/monthly toggle
- `pages/my/` — User's own rating history with delete capability
- `pages/admin/` — Admin-only: add dishes (with optional photo upload), delete dishes, batch-reuse historical dishes via search
- `pages/admin-ratings/` — Admin view of all ratings for a dish with delete capability
- `pages/dish-comments/` — View all comments/ratings for a dish
- `pages/profile/` — Edit user nickname and avatar
- `pages/weekly/` — Weekly menu progress view with paginated dish fetching
- `pages/share-landing/` — Landing page for shared links (accepts `date` and `meal` query params)
- `components/` — `dish-card`, `star-rating` (half-star support), `empty-state`
- `utils/auth.js` — Login flow, admin status check, profile caching
- `utils/cloud.js` — Wrapper for `wx.cloud.callFunction` (expects `{ code: 0, ... }` response format)
- `utils/date.js` — Date formatting helpers (`getToday`, `getWeekRange`, `getMonthRange`, `formatDateChinese`, `getWeekRangeByOffset`, `getDayOfWeekLabel`)
- `utils/share.js` — Share utilities (`generateShareTitle`, `getFirstImageUrl`)

### Backend (cloudfunctions/)

Each subdirectory is an independent cloud function:

| Function | Role |
|---|---|
| `login` | Returns openid, checks admin status against `admins` collection, fetches user profile |
| `submitRating` | Creates or updates a rating, recalculates dish `avgScore` from all ratings |
| `addDish` | Admin-only: adds a dish record |
| `batchAddDish` | Admin-only: batch add multiple dishes in one call (supports reusing historical images) |
| `deleteDish` | Admin-only: deletes dish, all associated ratings, and cloud storage image |
| `deleteRating` | Deletes a rating (own or admin), recalculates dish score |
| `updateDish` | Admin-only: updates dish description/image, deletes old image |
| `updateProfile` | Creates or updates user record with nickname and avatar |
| `getRanking` | Returns top 10 dishes by avg score for a given week/month |
| `getDishRatings` | Returns all ratings for a dish with user info (supports multiple dish IDs) |
| `searchDishHistory` | Queries historical dishes by meal type and keyword, returns deduplicated list |
| `uploadDishImage` | User-contributed image upload with contributor tracking |

### Database Collections (Cloud DB)

- **dishes** — `name`, `meal` (breakfast/lunch/dinner), `date`, `imageFileId`, `description`, `avgScore`, `ratingCount`, `createdBy`, `createdAt`
- **ratings** — `dishId`, `userId`, `score` (1-5), `comment`, `date`, `nickName`, `avatarUrl` (denormalized), `createdAt`, `updatedAt`
- **admins** — `userId` (openid)
- **users** — `userId`, `nickName`, `avatarUrl`, `createdAt`, `updatedAt`

### Key Patterns

- Admin authorization is enforced server-side in cloud functions by checking the `admins` collection
- One rating per user per dish per day; submitting again updates the existing rating
- Average score is recalculated from all ratings on each submission (not incremental)
- Image uploads go to WeChat Cloud Storage; `imageFileId` is stored on the dish record; old images are deleted on update/delete
- User-contributed images tracked via `imageContributor` (openid) and `imageContributorName` fields on dish records
- User nickname and avatar are denormalized into rating records for display
- Cloud DB queries use 100-item pagination and 500-item limits for `in()` operations
- Sharing uses `onShareAppMessage` with meal-aware titles and first dish image; shared links land on `share-landing` page
- Global state (`openid`, `isAdmin`, `hasProfile`, `nickName`, `avatarUrl`) is stored on `app.globalData`
- UI theme: orange primary (#FF8C42), warm background (#FFF5EE)
