# Import/Export Settings and Backup/Restore Database

Use the **Import / Export ...** button in **Settings** to either transfer DCC configuration in JSON format or create/restore full SQLite database backups.

## Open the menu

1. Open **Settings**.
2. In the top-right actions area, click **Import / Export ...**.
3. Choose one of the following actions:
   - **Import Settings...**
   - **Export Settings...**
   - **Backup Database...**
   - **Restore Database...**

---

## Export Settings...

Use this when you want a portable JSON file containing configuration values.

1. Click **Import / Export ... → Export Settings...**.
2. In the modal, enter a destination file path (for example: `/tmp/dcc-settings.json`).
3. Click **Export Settings**.

### What is exported

- Key/value entries from DCC `settings`.
- Asset repository configuration (`asset_repos`).
- Development project roots (`dev_project_roots`).

---

## Import Settings...

Use this to load a previously exported settings JSON file.

1. Click **Import / Export ... → Import Settings...**.
2. In the modal, enter the source JSON file path.
3. Click **Import Settings**.
4. DCC reloads the Settings page after a successful import.

### Notes

- Import expects valid JSON with the DCC export structure.
- Existing settings/repo/root values are replaced by imported values.

---

## Backup Database...

Use this to create a full backup copy of the DCC SQLite database file.

1. Click **Import / Export ... → Backup Database...**.
2. Enter the destination database file path (for example: `/tmp/dcc-backup.sqlite`).
3. Click **Backup Database**.

### When to use it

- Before major changes to settings or definitions.
- Before upgrades or migration testing.
- For emergency recovery snapshots.

---

## Restore Database...

Use this to restore DCC from a previously backed-up SQLite file.

1. Click **Import / Export ... → Restore Database...**.
2. Enter the source backup file path.
3. Click **Restore Database**.
4. DCC reloads the page after restore.

### Important

- Restore replaces the current database file.
- Make a fresh backup first if you might need to roll back.
