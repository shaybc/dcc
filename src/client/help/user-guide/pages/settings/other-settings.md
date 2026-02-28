# Theme, Recommendations, Timeout, and AI Logging

This page covers the remaining controls in **Settings** that are not documented in the other Settings help pages.

## Theme

Use **Theme** to switch between dark and light mode.

### How to use

1. Open **Settings**.
2. In the **Theme** card, toggle the switch.
3. The UI updates immediately and keeps your preference for future sessions.

---

## Recommendations

Use **Recommendations** to control how many suggested definitions appear in the Hub.

### Fields

- **Max recommended definitions**: integer from **3** to **8**.

### How to use

1. Enter a number between **3** and **8**.
2. Click **Save recommendation limit**.
3. Return to the Hub and verify the recommendation list size.

---

## Loading Timeout

Use **Loading Timeout** to define how long async operations can run before timeout handling appears.

### Fields

- **Timeout (seconds)**: value from **15** to **300**, in increments of **15**.

### How to use

1. Enter a timeout value.
2. Click **Save timeout**.
3. The new timeout applies to long-running operations (for example sync, scans, or load actions).

---

## AI Logging

Use **AI Logging** to control whether DCC records AI request/response logs for troubleshooting.

### Fields

- **Log OpenAI response**: enables response logging for OpenAI-compatible facade calls.
- **Log Gemini client**: enables request/response logging for Gemini client traffic.
- **Max response length**: limits how many characters are stored for each logged response (**50** to **99999**).

### How to use

1. Check or uncheck the logging toggles as needed.
2. Set **Max response length**.
3. Click **Save logging settings**.

### Notes

- Keeping logs enabled can help with debugging integrations.
- Lower max response length values reduce stored log volume.

---

## Detected Dev Projects

The **Detected Dev Projects** table is a read-only summary of projects found under configured development roots.

### What you can use it for

- Verify scan results after updating root folders.
- Confirm project metadata before installing definitions.
- Quickly check whether a repository has been discovered.

If expected projects are missing, go back to **Development Project Roots**, update folders if needed, and run **Save & rescan projects**.
