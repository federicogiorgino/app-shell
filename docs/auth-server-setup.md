# Hooking up the auth API

Only needed when sign-in is on (`EXPO_PUBLIC_AUTH_ENABLED=1`, see [auth.md](auth.md)). With it off, the app has no server.

The app signs users in through [Better Auth](https://www.better-auth.com). You provide the backend; this guide lists exactly what it must do for the app to work. The client side is already set up in `src/lib/auth-client.ts`.

## Checklist

1. A Better Auth server with email and password enabled and the Expo plugin.
2. The app's URL scheme listed in `trustedOrigins`.
3. The server reachable from the device at the URL in `EXPO_PUBLIC_API_URL`.
4. Optional features switched on: password length rule, account deletion.

## 1. Server setup

On the API (any framework Better Auth supports: Hono, Express, Next.js, Elysia...). Better Auth also needs a database; follow its [installation guide](https://www.better-auth.com/docs/installation) for the adapter and migrations.

```ts
// auth.ts
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";

export const auth = betterAuth({
  // The public URL of this server (the same value as the app's EXPO_PUBLIC_API_URL).
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: /* your adapter: drizzleAdapter(...), prismaAdapter(...), ... */,

  plugins: [expo()],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10, // the app enforces 10 when signing up (MIN_PASSWORD_LENGTH)
  },

  // Required for "Delete account".
  user: { deleteUser: { enabled: true } },

  trustedOrigins: [
    "appshell://", // this app's scheme, from app.identity.json
    "appshell://*",
    // "exp://", // only if you test in Expo Go
  ],
});
```

Mount the handler on the default path `/api/auth/*`. The app's client uses the default base path, so no extra client config is needed. Example with Hono:

```ts
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
```

Install the server packages on the API: `better-auth` and `@better-auth/expo`. Keep their versions in line with the app's (see `package.json`).

## 2. Point the app at it

| Where                | Value                                                                               |
| -------------------- | ----------------------------------------------------------------------------------- |
| `.env.local`         | `EXPO_PUBLIC_API_URL=<your server URL>` (restart Expo after changing it)            |
| `eas.json`           | `build.base.env.EXPO_PUBLIC_API_URL` for cloud builds; `.env.local` is not uploaded |
| API `trustedOrigins` | the scheme from `app.identity.json`, followed by `://`                              |

URL to use while developing:

| Running on       | `EXPO_PUBLIC_API_URL`                                             |
| ---------------- | ----------------------------------------------------------------- |
| iOS simulator    | `http://localhost:3000`                                           |
| Android emulator | `http://10.0.2.2:3000`                                            |
| Physical device  | `http://<your computer's LAN IP>:3000`, or a deployed `https` URL |

Preview and production builds should use `https`. Release builds of Android and iOS block plain `http` by default.

If you rename the app with `pnpm run init`, update `trustedOrigins` with the new scheme.

## What the app calls

| Screen                | Better Auth call                            | Server requirement                                    |
| --------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Sign in               | `signIn.email`                              | `emailAndPassword.enabled`                            |
| Sign up               | `signUp.email` (email, password, name)      | same; `minPasswordLength` should match the app's rule |
| Session and app start | `useSession`                                | none                                                  |
| Sign out              | `signOut`                                   | none                                                  |
| Change password       | `changePassword` with `revokeOtherSessions` | none                                                  |
| Delete account        | `authClient.deleteUser({ password })`       | `user.deleteUser.enabled: true`                       |

The session cookie is stored in the device keychain by the client plugin, so you do not handle tokens in the app.

## Your own endpoints

`api()` (`src/lib/api.ts`) attaches the session cookie to every request, so your server can identify the user:

```ts
// server, for example in a Hono route
const session = await auth.api.getSession({ headers: c.req.raw.headers });
if (!session) return c.json({ message: "Unauthorized" }, 401);
```

A `401` response makes the app sign the user out and return to the sign-in screen. Return errors as JSON with a `message` (and optionally a `code`); the app shows the message to the user. See [api-and-storage.md](api-and-storage.md).

No CORS setup is needed for the native app. If you also serve a web client, add its origin to `trustedOrigins` and your CORS rules.

## Test the server without the app

```bash
curl -i -X POST "$API_URL/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -H "Origin: appshell://" \
  -d '{"name":"Test","email":"test@example.com","password":"a-long-password"}'
```

A `200` response with a `set-cookie` header means signup and the origin check both work.

## Troubleshooting

| Symptom                                                    | Cause and fix                                                                                                                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sign-in fails with "Invalid origin" or `403`               | The scheme is missing from `trustedOrigins`. Add `<scheme>://` and `<scheme>://*`.                                                                                       |
| "Couldn't reach the server"                                | Wrong `EXPO_PUBLIC_API_URL` for the device (see the table above), the server is not running, or it listens only on `localhost`. Restart Expo after editing `.env.local`. |
| Works in development, fails in a release build             | The URL is plain `http`. Use `https`.                                                                                                                                    |
| Signed in, but the app returns to sign-in on every request | The endpoint returns `401`: the server is not reading the cookie, or `BETTER_AUTH_SECRET` or the database changed.                                                       |
| "Delete account" fails                                     | `user.deleteUser.enabled` is not set on the server, or the password is wrong.                                                                                            |
| Password accepted in the app but rejected by the server    | `minPasswordLength` differs from the app's `MIN_PASSWORD_LENGTH` in `src/lib/schemas.ts`.                                                                                |
| Changing the secret or database logs everyone out          | Expected. Sessions are tied to both.                                                                                                                                     |

## Adding more sign-in features

Forgot-password, email verification and social sign-in are not built into the app. Each needs server configuration first (an email sender for the first two, provider keys for social). Enable it in Better Auth, then call the matching `authClient` method from a new screen. Better Auth's [documentation](https://www.better-auth.com/docs) lists the methods.
