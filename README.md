# Broos 2.0 - Next.js & Firebase App

This is a Next.js application built with Firebase, ShadCN UI, Tailwind CSS, and Genkit for AI features. This README provides instructions on how to set up, run, and test the project.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## End-to-End (E2E) Testing with Playwright

This project uses [Playwright](https://playwright.dev/) for end-to-end testing. The tests simulate real user interactions to ensure the application works as expected from start to finish.

### 1. Setting up Test Environment Variables

Before you can run the tests, you need to provide your Firebase project's admin credentials. This allows the test setup script to create authenticated test users directly in your Firebase project.

1.  **Create a `.env` file** in the root of your project if it doesn't already exist.
2.  **Generate a Firebase Service Account Key:**
    *   Go to your Firebase project settings in the Firebase Console.
    *   Navigate to the "Service accounts" tab.
    *   Click "Generate new private key". A JSON file will be downloaded.
3.  **Add the key to your `.env` file:**
    *   Open the downloaded JSON file and copy its entire content.
    *   In your `.env` file, add the following line, pasting the JSON content as a single-line string:

    ```env
    # WARNING: Treat this key as a password. Do not commit it to version control.
    FIREBASE_ADMIN_SERVICE_ACCOUNT='{"type": "service_account", "project_id": "...", ...}'
    ```

    **Important:** The `.env` file is listed in `.gitignore` by default to prevent you from accidentally committing sensitive credentials.

### 2. Running the Tests

Once your `.env` file is set up, you can run the entire E2E test suite with the following command:

```bash
npm run test:e2e
```

This command will:
1.  Start the development server.
2.  Run the global setup script (`e2e/global-setup.ts`) to create test users.
3.  Execute all test files in the `e2e` directory using Playwright.

### 3. Viewing the Test Results

After the tests have finished, Playwright generates a detailed HTML report. You can view it by running:

```bash
npx playwright show-report
```

This will open a web page in your browser where you can inspect each test run, see screenshots, view traces of failed tests, and read logs. This is the best way to understand why a test may have failed.
