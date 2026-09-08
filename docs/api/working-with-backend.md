# Working with Backend & Swagger UI

## Problem

When connecting a mobile app to a backend, manually writing TypeScript interfaces and API endpoints is time-consuming, prone to typos, and fragile when APIs change. Furthermore, when an endpoint's request payload or response structure is modified on the backend, tracking down what broke across the frontend can be difficult.

## Solution

We leverage **Swagger / OpenAPI** combined with **`openapi-typescript`** and **`openapi-fetch`** to automate type generation and API requests. This gives us:
1. Full TypeScript autocompletion for all endpoints, HTTP methods, route params, query params, request bodies, and responses.
2. Instant compile-time error detection when the backend changes.
3. Zero manual boilerplate for writing API interfaces.

---

## Step-by-Step Guide

### Step 1: Open Swagger UI
1. Ensure your backend server is running (or open the hosted documentation URL).
2. Open the Swagger UI documentation in your web browser (typically at `http://localhost:3000/docs` or `http://localhost:8000/docs`).

---

### Step 2: Extract `swagger.json` via Browser Console

If Swagger UI does not display a direct download button or a visible link to the raw OpenAPI JSON specification, you can extract it directly from Swagger UI's internal JavaScript state.

1. Open your browser's Developer Tools by pressing **F12** (or right-click anywhere on the page and select **Inspect**).
2. Go to the **Console** tab.
3. Run the following command in the console:

```javascript
copy(JSON.stringify(ui.spec().toJSON(), null, 2));
```

> [!TIP]
> This command copies the complete, beautifully formatted OpenAPI / Swagger JSON specification directly to your clipboard.

*(Alternatively, to trigger an automatic file download directly from the browser console, run:)*

```javascript
const blob = new Blob([JSON.stringify(ui.spec().toJSON(), null, 2)], { type: "application/json" });
const a = document.createElement("a");
a.href = URL.createObjectURL(blob);
a.download = "swagger.json";
a.click();
```

4. Save the copied or downloaded file into your project at:
```
src/services/api/swagger.json
```

*(Note: You can also find the raw spec URL in the console by running `ui.getConfigs().url` or checking the Network tab for the JSON file request).*

---

### Step 3: Install Type Generation Tools

Install `openapi-typescript` as a developer dependency:

```bash
npm install -D openapi-typescript
```

And install `openapi-fetch` for type-safe requests:

```bash
npm install openapi-fetch
```

---

### Step 4: Generate TypeScript Schemas

Run `openapi-typescript` in your terminal to generate TypeScript types from your saved `swagger.json`:

```bash
npx openapi-typescript src/services/api/swagger.json -o src/services/api/schema.ts
```

*(If the backend server is running and accessible over HTTP, you can also generate directly from the URL without saving `swagger.json`:)*
```bash
npx openapi-typescript http://localhost:3000/docs-json -o src/services/api/schema.ts
```

This generates `src/services/api/schema.ts`, which contains:
- `paths`: All available endpoints, methods, parameters, and responses.
- `components["schemas"]`: All DTO (Data Transfer Object) models.

---

### Step 5: Configure the API Client

Create `src/services/api/client.ts` and initialize `createClient` using the generated `paths` interface:

```typescript
import createClient from 'openapi-fetch';
import { paths } from './schema';

export const api = createClient<paths>({
  baseUrl: process.env.EXPO_PUBLIC_API_URL,
});
```

---

### Step 6: Using Generated Types & Endpoints in Features

#### 1. Extracting DTO Types Directly
You do not need to manually write types for requests or responses. Extract them directly from `components["schemas"]`:

```typescript
import type { components } from "@/services/api/schema";

// Request and response types
export type RequestOtpInput = components["schemas"]["RequestOtpDto"];
export type OtpChallenge = components["schemas"]["OtpChallengeResponseDto"];
export type UserResponse = components["schemas"]["UserResponseDto"];
```

#### 2. Type-Safe API Requests
When calling `api.POST`, `api.GET`, `api.PATCH`, or `api.DELETE`, the endpoint path autocompletes, and TypeScript enforces the exact parameter and body structure:

```typescript
import { api } from "@/services/api/client";
import { useMutation } from "@tanstack/react-query";
import type { RequestOtpInput, OtpChallenge } from "./types";

export function useRequestOtp() {
  return useMutation({
    mutationFn: async (payload: RequestOtpInput): Promise<OtpChallenge> => {
      // api.POST autocompletes '/v1/auth/otp/request' and checks payload shape
      const { data, error } = await api.POST("/v1/auth/otp/request", {
        body: payload,
      });

      if (error) {
        throw new Error(
          (error as { message?: string }).message || "Failed to send OTP"
        );
      }

      return data;
    },
  });
}
```

---

### Step 7: Updating When the Backend Changes

When backend endpoints or schemas are updated:
1. Re-run the console snippet in Swagger UI to copy the new `swagger.json` (or use the endpoint URL directly).
2. Regenerate the schema:
   ```bash
   npx openapi-typescript src/services/api/swagger.json -o src/services/api/schema.ts
   ```
3. Run TypeScript check or build. TypeScript will instantly highlight any breaking changes across your application.
