# Live Google Sheet for the billing sheet

The billing sheet (Summary / Entries / Change Log, one set of tabs per month) can be mirrored into a Google Sheet that
refreshes by itself within about 15 seconds of any time-entry change.

> **Privacy first.** Use a *personal* Google account only with **test data**. Patient names and HCAI numbers must not go
> to a Google account your company does not control. For real data, use a location your company has approved
> (for example Excel on SharePoint) - the sync engine is built so only the connector changes.

## One-time setup (about 10 minutes)
1. Go to <https://console.cloud.google.com>, create a project.
2. **APIs & Services -> Library**: enable **Google Sheets API**.
3. **IAM & Admin -> Service Accounts -> Create**: any name. Open it, **Keys -> Add key -> JSON**. A `.json` file downloads.
4. Put the key on the API server as **one line**. On Windows, in a terminal in the project folder:
   ```
   node -e "console.log(JSON.stringify(require('C:/path/to/key.json')))"
   ```
   Copy the output into `apps/api/.env` wrapped in single quotes:
   ```
   GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account", ... }'
   ```
   Restart the API. (On Render/any host: add it as an environment variable. Treat it like a password.)
5. Create an empty Google Sheet. **Share** it with the service account's `client_email` (looks like
   `name@project.iam.gserviceaccount.com`) as **Editor**.
6. In TimeFlow open **Billing Sheet**, paste the sheet's link into the *Live Google Sheet* box, click **Connect**.

## How it behaves
| Tab | Who writes it |
|---|---|
| `YYYY-MM Entries` | the system (every approved entry) |
| `YYYY-MM Change Log` | the system (every create / edit / move / approve / reject / delete) |
| `YYYY-MM Summary` | the system, **except** Prev. Pay Hrs. Incl., Invoice #, Amount $, Notes - type those by hand |

* Hand-typed cells stay attached to their plan + task row (matched by the hidden *Plan ID* / *Task ID* columns), even if
  you sort the sheet or hours change. Do not delete those two columns.
* Anything typed in any other column is overwritten on the next refresh.
* A value typed on the TimeFlow website is pushed to the sheet once; after that the sheet is the source again.
* If the connection breaks (sheet unshared, key removed) the page shows the error and retries every minute.
* Run the sync on **one** API instance; set `BILLING_SHEET_WORKER=off` on any others.
