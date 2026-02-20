# Theme, Recommendations, and Timeout

This page covers the remaining settings controls that are not documented in the other Settings help pages.

## Theme

Use **Theme** to switch between dark and light mode.

### How to use

1. Open **Settings**.
2. In the **Theme** card, toggle the switch.
3. The UI updates immediately and persists your preference.

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

## Detected Dev Projects

The **Detected Dev Projects** table is a read-only summary of projects found under configured development roots.

### What you can use it for

- Verify scan results after updating root folders.
- Confirm project metadata before installing definitions.
- Quickly check whether a repository has been discovered.

If expected projects are missing, go back to **Development Project Roots**, update folders if needed, and run **Save & rescan projects**.
