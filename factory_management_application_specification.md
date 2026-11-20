# Factory Management Application --- Product Requirements & Feature Specification

**Document purpose:** Detailed description of the proposed mobile-first
factory management application, based on the requirements discussed.

**Status:** Planning/specification only. This document does not
represent an implementation or a final technical commitment.

------------------------------------------------------------------------

## 1. Product Overview

The application is a mobile-first factory management system for a small
plastic manufacturing business. The factory owner is the only
worker/operator and will use a phone to manage the business.

The application will bring together:

-   Raw-material setup and inventory
-   Purchases and supplier records
-   Production and production-yield tracking
-   Finished-product inventory
-   Sales and customer records
-   Multi-currency buy/sell records with one AFN cash balance
-   Business expense tracking
-   A separate personal expense tracker
-   Dashboards, graphs, history lists, and reports
-   Daily reminders and low-stock notifications
-   Authentication, settings, data protection, and backup

The system should be straightforward for one person to operate. Avoid
unnecessary employee, payroll, multi-branch, or complex enterprise
workflows unless they become future requirements.

### 1.1 Primary device and usability

-   Phone-first interface.
-   Simple forms with as few unnecessary fields as possible.
-   Clear dashboard cards and readable charts.
-   Fast access to add a purchase, sale, production entry, or expense.
-   Support for reviewing and searching historical records.
-   Consider Android-first delivery, while keeping the product design
    portable to other mobile platforms.
-   Consider English and Dari language support, including right-to-left
    layout for Dari, as a product requirement to validate.

### 1.2 Business and reporting currency

-   Main reporting currency: Afghan Afghani (AFN).
-   Transaction currencies: AFN and US Dollar (USD).
-   The app must retain the original transaction amount and currency as
    well as the calculated AFN equivalent.
-   The application must preserve the exchange rate used for each
    historical transaction.

------------------------------------------------------------------------

## 2. Authentication, Account, and Access

Although the application is intended for one owner, it should have
authentication to protect business and personal financial information.

### 2.1 Sign-in and account setup

Recommended account features:

-   Owner account registration or administrator-provisioned account
    setup.
-   Secure sign-in using an appropriate method, such as phone/email and
    password, subject to the final authentication provider.
-   Password reset or account recovery.
-   Sign out.
-   Optional biometric or device-level app lock, if supported by the
    chosen platform.
-   Session expiry and secure session handling.
-   No public registration requirement if the app is deployed privately
    for one client.

### 2.2 Owner permissions

-   The owner is the primary and initially sole user.
-   The owner can create and edit setup data, enter transactions, view
    reports, configure reminders, and manage backups.
-   If additional users are introduced in the future, role-based
    permissions should be designed as a future extension, not required
    for the first version.

### 2.3 Account and security settings

-   Change password or authentication method where supported.
-   Manage account details.
-   Sign out from the device.
-   App lock option.
-   Display last successful backup/synchronization time, if backup/sync
    is enabled.

------------------------------------------------------------------------

## 3. First-Time Setup and Initial Configuration

The first-use experience should guide the owner through essential
configuration before normal operation.

### 3.1 Business profile

Collect the information needed for reports and documents, such as:

-   Factory/business name.
-   Owner/contact details, if required.
-   Preferred app language.
-   Main reporting currency (AFN by default).
-   Time zone and local date/time settings.
-   Optional address and logo for future invoices or reports.

### 3.2 Raw-material configuration

Raw-material types must be configurable by the owner. Do not hardcode a
fixed list.

Examples only (not confirmed as the client's actual materials):

-   PP
-   PE
-   PVC
-   Color masterbatch
-   Additives

For each material, allow the owner to configure:

-   Material name.
-   Optional description or category.
-   Unit of measure (KG for the current factory workflow).
-   Initial stock, if known.
-   Minimum stock threshold for low-stock alerts.
-   Expected production yield: how many KG of finished product one KG of
    this raw material is expected to produce.
-   Active/inactive status.

The owner must be able to add, edit, deactivate, and view material
types. Existing historical transactions must not be corrupted if a
material is renamed or deactivated.

### 3.3 Finished product configuration

The factory currently manufactures one finished product. The app should
support one product profile initially, while keeping the data model
extensible if more products are added later.

Collect:

-   Finished product name.
-   Description, if useful.
-   Unit of measure: KG.
-   Optional minimum finished-stock threshold.
-   Active status.

### 3.4 Production-yield setup

For each raw-material type, the owner enters the expected amount of
finished product obtained from 1 KG of that material.

Illustrative example only:

  Raw material     Input basis   Expected finished output
  -------------- ------------- --------------------------
  PP                      1 KG                    0.95 KG
  PE                      1 KG                    0.90 KG
  PVC                     1 KG                    0.92 KG

These are owner-configured assumptions, not fixed defaults. They provide
an expected output benchmark for daily production.

If multiple raw materials are used in one production entry, the proposed
expected output is calculated by summing each material's configured
expected output for the quantity consumed. For example, if 100 KG of a
material is expected to produce 95 KG and 50 KG of another is expected
to produce 45 KG, expected combined output is 140 KG.

This additive-yield assumption should be confirmed against the factory's
real manufacturing process. If material interactions make the combined
yield non-additive, the production model may need a recipe/formula
configuration instead.

### 3.5 Daily exchange-rate setup

The owner enters the daily USD-to-AFN exchange rate. The proposed
reminder is at 6:00 AM each day.

-   The owner enters the rate once for the day.
-   Forms should use the saved daily rate automatically when currency
    conversion is required.
-   Do not repeatedly ask for the rate inside every buy/sell form when a
    valid daily rate is available.
-   Keep a history of rates with their effective date/time and who
    entered them (initially the owner).
-   If the owner changes the rate during the day, new transactions use
    the updated rate; existing transactions retain the rate already
    saved with them.
-   If the daily rate is not entered, the system may continue using the
    most recent saved rate, but must clearly identify it as an older
    rate and remind the owner to update it.
-   A transaction that requires conversion should not silently use an
    unknown rate. If no rate has ever been entered, ask for a rate
    before allowing that conversion. Transactions that do not require
    conversion may still proceed.

------------------------------------------------------------------------

## 4. Main Navigation and Dashboard

A suggested mobile navigation structure is:

-   Home / Dashboard
-   Inventory
-   Operations
-   Finance
-   More / Settings

The exact navigation can be refined during UX design. The key sections
must remain easy to reach:

1.  Dashboard
2.  Purchases
3.  Production
4.  Sales
5.  Raw-material inventory
6.  Finished-product inventory
7.  Suppliers
8.  Customers
9.  Business expenses
10. Business cash / finance
11. Personal finance
12. Reports
13. Notifications
14. Settings

### 4.1 Main dashboard

The main dashboard should provide a quick overview of the business, such
as:

-   Total sales in AFN equivalent.
-   Total purchases in AFN equivalent.
-   Business expenses in AFN.
-   Current total cash in AFN.
-   Raw-material stock warnings.
-   Finished-product stock, if configured.
-   Today's production and sales activity.
-   Outstanding customer balances.
-   Outstanding supplier balances, if applicable.
-   Exchange rate currently in use and its date.
-   Recent transactions.
-   Shortcuts for Add Purchase, New Production, Create Sale, and Add
    Expense.

The dashboard should not confuse sales totals with cash received. Sales
are based on sales records; cash balances are based on actual payments
received or made.

------------------------------------------------------------------------

## 5. Raw-Material Inventory

The raw-material inventory section tracks the quantity available for
each configured material.

### 5.1 Inventory list

For each material, display:

-   Material name.
-   Current quantity in KG.
-   Minimum stock threshold.
-   Stock status (normal or below minimum).
-   Recent purchase and consumption activity.
-   Optional inventory valuation/cost information.

### 5.2 Stock increases

Raw-material stock increases when a purchase is posted and decreases
when production consumption is posted.

### 5.3 Stock decreases

Raw-material stock decreases by the exact quantity entered as consumed
in a saved production entry.

### 5.4 Inventory history

Each material should have a movement history showing:

-   Purchase receipts.
-   Production consumption.
-   Stock adjustments.
-   Returns or corrections, if supported.
-   Date, quantity, source transaction, and resulting balance.

The stock movement history should be the authoritative record behind
inventory balances.

### 5.5 Minimum stock and low-stock alert

During material setup, the owner sets a minimum stock level in KG.

-   When available stock falls below the threshold, create a low-stock
    alert.
-   Identify the affected material and show current stock and minimum
    stock.
-   Avoid sending the same alert repeatedly while the material remains
    below threshold.
-   If stock rises above the threshold and later falls below it again, a
    new alert may be sent.
-   Provide a way to open the material record or purchase section from
    the alert.
-   Thresholds should be editable in material settings.

------------------------------------------------------------------------

## 6. Purchases and Supplier Management

Purchases record raw materials bought for the factory. Purchases may be
priced in AFN or USD, and may be paid in full or in installments using
the selected transaction currency.

### 6.1 Purchase section dashboard

The purchase section should include summary figures, a graph, and a list
of purchase records.

Suggested summary figures:

-   Total purchases (AFN equivalent).
-   Purchases today.
-   Total KG of raw material purchased.
-   Supplier balances and outstanding amounts.
-   Purchase totals by material.
-   Purchase totals by supplier.
-   Total cash paid for purchases in AFN equivalent, using the rate saved
    with each payment.

The total purchase figure should include AFN purchases directly and USD
purchases converted to AFN using the exchange rate saved with each
transaction. Historical AFN equivalents must not change when the daily
rate changes. The cash-paid figure is the all-time sum of actual
supplier-payment records, not the purchase total.

### 6.2 Purchase currency entry

The purchase form should guide the owner through one full-page step at a
time, with visible progress and clear back/continue actions. Use this
sequence: transaction currency, supplier, material selection, quantity
and unit price, payment and optional notes, then a review before posting.
Repeat the material and quantity/price steps only when the owner adds
another material. Preserve entered values when moving backward.

Calculate each line total from KG and price per KG, and show the purchase
total before the payment step. Initialize payment to the full total. Use a
slider plus an exact amount field to adjust the amount paid; show the
remaining amount as supplier debt. When the transaction currency is USD,
show the selected payment's live AFN equivalent using today's saved rate;
if today's rate is missing, explain that it must be recorded first.

### 6.3 Purchase form fields

Common fields:

-   Supplier.
-   Purchase date.
-   Raw-material type, with current stock shown for each choice. Select it
    automatically when only one active material is available.
-   Quantity in KG.
-   Price per KG in the selected transaction currency.
-   Calculated line total.
-   Optional multiple materials/items in one purchase.
-   Notes or reference number.
-   Payment details and payment status.

The form should clearly show the selected transaction currency and the
calculated total.

### 6.4 Payment currency and cash handling

The selected purchase currency applies to both the purchase prices and
payments. Mixed-currency payments are out of scope for now. Partial
payments may be recorded later in the same currency as the purchase.
Every USD payment is converted to AFN at the rate saved for its payment
date. Track the remaining supplier debt in the purchase's original
currency; later payments reduce that original-currency balance, regardless
of rate changes. The collection slider starts at the full remaining debt
and shows a live AFN equivalent for USD using today's saved rate.

### 6.5 Purchase posting

When a purchase is posted:

-   Increase the relevant raw-material inventory by the purchased KG.
-   Record the purchase in purchase history.
-   Subtract the AFN equivalent of any actual payment from the single AFN
    cash balance.
-   Preserve original currency, amount, daily exchange rate used, and
    AFN equivalent.
-   Link the stock movement and AFN cash movement to the purchase record.

### 6.6 Purchase history

Show a searchable/filterable list with:

-   Date.
-   Supplier.
-   Material(s).
-   Quantity.
-   Unit price.
-   Original currency and amount.
-   AFN equivalent.
-   Payment status.
-   Details action.

Filters should include date range, supplier, material, currency, and
payment status.

### 6.7 Supplier records

Supplier profiles may include:

-   Supplier name.
-   Contact details.
-   Address or notes.
-   Purchase history.
-   Total purchased.
-   Payments made.
-   Outstanding balance, if supplier credit/partial payment is
    permitted.

Supplier purchases may be paid in installments. Later payments use the
purchase's selected currency and reduce the AFN outstanding balance by
the AFN equivalent recorded for each payment.

------------------------------------------------------------------------

## 7. Production Management

Production is intended to be simple. The owner configures expected
output per KG of each raw material during first-time setup. For daily
production, the owner records how many KG of each raw material were
consumed and how many KG of finished product were actually produced.

### 7.1 Production dashboard

The production section should show summary figures such as:

-   Total finished product produced (KG).
-   Finished product produced today (KG).
-   Total raw materials consumed to date (KG).
-   Consumption by material type.
-   Total actual production loss (KG).
-   Expected output versus actual output.
-   Production history graph.
-   Current finished-product inventory.

### 7.2 Daily production entry

The owner should be able to create a production entry for a date and
enter:

-   Production date.
-   One or more raw-material types used.
-   Quantity consumed for each material (KG).
-   Actual finished product obtained (KG).
-   Optional notes.

The owner may have multiple production entries/batches on the same day.
The app should not assume only one batch per day.

### 7.3 Expected output and production loss

For each material:

`Expected output = raw material quantity consumed × configured expected output per KG`

For a multi-material entry, the proposed combined expected output is the
sum of the expected outputs for all materials in that entry.

`Expected loss = total raw material input − expected finished output`

`Actual loss = total raw material input − actual finished output`

`Additional loss compared with expectation = actual loss − expected loss`

Illustrative example:

-   PP consumed: 100 KG.
-   Configured yield: 0.95 KG finished product per 1 KG PP.
-   Expected output: 95 KG.
-   Actual finished output: 92 KG.
-   Expected loss: 5 KG.
-   Actual loss: 8 KG.
-   Additional loss above expectation: 3 KG.

The system should show expected and actual values separately. The owner
should be able to identify unusually high production loss.

The simple mass-balance calculation assumes all input materials are
included and no reusable scrap is returned to inventory. If scrap can be
reused, the app should record reusable scrap separately rather than
treating it as discarded loss. Whether scrap is reusable is still to be
confirmed.

### 7.4 Production posting and inventory updates

When a production entry is saved/posted:

-   Decrease each raw-material inventory by the quantity consumed.
-   Increase finished-product inventory by actual finished output.
-   Record production loss.
-   Preserve the configured yield assumption used for the calculation at
    the time of the entry, so future edits to a material's expected
    yield do not rewrite old production reports.
-   Record the production batch and its stock movements.

The system should validate that consumed raw-material stock is
available. Negative stock should not be allowed by default; the owner
can be warned or blocked if a production entry would consume more stock
than is available. The final policy should be confirmed.

### 7.5 Production cost

The app should calculate production cost using the cost of raw materials
consumed. A weighted-average cost method was proposed for raw-material
inventory valuation.

The production cost calculation should:

-   Use the cost assigned to the material quantities consumed.
-   Sum the cost of all raw materials used.
-   Divide total batch cost by actual finished KG to estimate
    manufacturing cost per KG.
-   Allow future support for additional production overhead such as
    electricity, fuel, packaging, or maintenance allocations.

The exact overhead allocation method is not yet decided. Since the owner
is the only worker, employee/payroll management is not required
initially. An optional owner-labour cost could be considered for
management reporting later.

### 7.6 Production history and material consumption report

The production history should list:

-   Date/batch number.
-   Raw materials used and quantities.
-   Expected output.
-   Actual finished output.
-   Expected loss.
-   Actual loss.
-   Cost per KG and total batch cost, when costing is enabled.

A cumulative material-consumption view should show how much of each raw
material has been consumed to date, for example:

  Material        Total consumed
  ------------- ----------------
  PP                    2,500 KG
  PE                    1,800 KG
  PVC                     750 KG
  Masterbatch             400 KG

These figures are illustrative only. The app should calculate actual
totals from posted production records.

### 7.7 Daily production reminder

Proposed default reminder:

-   4:00 PM every day except Friday.
-   The schedule must be configurable.
-   If production has already been entered for the current date, skip
    the reminder.
-   If no production entry exists, notify the owner to enter today's raw
    materials consumed and finished product produced.
-   The app should check actual saved production records, not whether
    the owner opened the production screen.
-   If there are multiple production runs per day, the reminder should
    be skipped once the owner's daily entry requirement is met. The
    exact definition of a complete day's entry can be configured or
    clarified.

------------------------------------------------------------------------

## 8. Sales and Customer Management

Sales record finished product sold, normally measured in KG. Sales may
be denominated in AFN or USD.

### 8.1 Sales section dashboard

Show:

-   Total sales in AFN equivalent.
-   Sales today.
-   Total KG sold.
-   Outstanding customer balances.
-   Total cash received from sales in AFN equivalent, using the rate
    saved with each payment.
-   Sales trend graph.
-   Sales by customer.
-   Sales by period.
-   Sales history list.

Total sales should be based on posted sales/invoices, not just cash
received. Partial or unpaid sales must still be represented as sales
while the unpaid portion remains a receivable.

The cash-received figure is the all-time sum of actual customer-payment
records, not the sales total.

### 8.2 Sale currency entry

The sales form should guide the owner through one full-page step at a
time, with visible progress and clear back/continue actions. Use this
sequence: customer, finished product, transaction currency, quantity and
unit price, payment and optional notes, then a review before posting.
Preserve entered values when moving backward.

Calculate the sale total from KG and price per KG, and show it before the
payment step. Initialize customer payment to the full total. Use a slider
plus an exact amount field to adjust the payment; show the remaining
amount as customer debt.
When the transaction currency is USD, show the selected payment's live AFN
equivalent using today's saved rate; if today's rate is missing, explain
that it must be recorded first.

### 8.3 Sales form

Fields should include:

-   Customer.
-   Sale date.
-   Finished product, with available stock shown for each choice. Select it
    automatically when only one product has stock, and prevent sales from
    exceeding that product's available balance.
-   Finished product quantity in KG.
-   Price per KG in the selected transaction currency.
-   Calculated total.
-   Payment received and payment currency.
-   Notes/reference.
-   Payment status and remaining balance.

### 8.4 Payment currency

The selected sale currency applies to both the sale price and payments.
Mixed-currency payments are out of scope for now. Partial customer
payments may be recorded later in the same currency as the sale. Each
USD payment is converted to AFN at the rate saved for its payment date.
Track the remaining customer debt in the sale's original currency; later
payments reduce that original-currency balance, regardless of rate
changes. The collection slider starts at the full remaining debt and shows
a live AFN equivalent for USD using today's saved rate.

### 8.5 Sale posting and inventory

When a sale is posted:

-   Decrease finished-product inventory by the quantity sold.
-   Record the sale and its line items.
-   Add the AFN equivalent of each actual payment to the single AFN cash
    balance.
-   Record any unpaid amount as a customer receivable.
-   Preserve original sale currency, amount, and transaction-day
    exchange rate/AFN equivalent.
-   Link stock and AFN cash movements to the sale.

### 8.6 Sales history

Show a searchable/filterable list with:

-   Date.
-   Customer.
-   Quantity in KG.
-   Unit price.
-   Original currency and amount.
-   AFN equivalent.
-   Amount paid.
-   Outstanding balance.
-   Details action.

Filters should include date, customer, currency, and payment status.

### 8.7 Customer records

Customer profiles may include:

-   Customer name.
-   Contact information.
-   Address/notes.
-   Sales history.
-   Total sales.
-   Payments received.
-   Outstanding balance.

------------------------------------------------------------------------

## 9. Business Expense Tracker

Business expenses should be recorded separately from purchases and
personal expenses.

### 9.1 Currency

The business expense tracker is AFN-only, as requested.

-   Expense amounts are entered in AFN.
-   No USD entry or exchange-rate conversion is required in this
    section.
-   Expense reports and graphs are in AFN.

### 9.2 Expense categories

Allow configurable categories. Example categories:

-   Electricity.
-   Rent.
-   Transport.
-   Machine maintenance and repairs.
-   Fuel.
-   Packaging.
-   Other factory expenses.

The owner should be able to add, rename, deactivate, and organize
categories.

### 9.3 Expense entry

Fields:

-   Date.
-   Expense category.
-   Description.
-   Amount in AFN.
-   Optional receipt/photo attachment.
-   Notes.

### 9.4 Expense dashboard

Show:

-   Total business expenses in AFN.
-   Expenses today.
-   Expenses this week/month/year.
-   Expenses by category.
-   Expense trend graph.
-   Expense history list.

### 9.5 Expense history

Each record should show date, category, description, amount, and
optional attachment. Filters should include date range and category.

### 9.6 Business versus personal spending

A personal purchase paid from business cash must not automatically be
treated as a business operating expense. It should be recorded as an
owner withdrawal/transfer (see Section 11).

------------------------------------------------------------------------

## 10. Single AFN Cash Balance and Multi-Currency Transactions

The app supports AFN and USD as buy/sell transaction currencies, but it
keeps only one spendable business cash balance: AFN. USD amounts are
converted to AFN when the transaction or payment is recorded. Do not
maintain or display separate USD cash.

### 10.1 Single cash balance

-   Setup records an optional opening AFN balance only.
-   Sales add only the AFN equivalent of money actually received.
-   Purchases and business expenses subtract only the AFN amount actually
    paid.
-   Unpaid sale and purchase amounts affect receivables/payables, not
    cash.
-   Every cash movement is stored in AFN.

### 10.2 Daily exchange rate

-   The owner enters one USD-to-AFN rate for the day.
-   AFN transactions do not require an exchange rate.
-   A USD sale or purchase requires a saved rate for its transaction
    date.
-   New USD payments use the saved rate for the payment date.
-   Keep the rate history. A rate change applies to new transactions and
    payments only.
-   Save the rate used with every USD transaction and payment so that
    historical AFN values never change.

### 10.3 Buy/sell currency and payments

-   Each purchase or sale has one currency choice: AFN or USD.
-   The selected currency applies to the item prices and all payments
    for that record, including later partial payments.
-   Mixed-currency payments are out of scope for now.
-   Preserve the original amount and currency in the transaction and
    payment history.
-   Convert each USD amount to AFN using the saved rate for that
    transaction/payment date before updating the AFN cash balance.
-   Track outstanding loans in the transaction's original currency; later
    payments reduce that amount in the same currency.
-   Show the live AFN equivalent for USD payments using today's saved rate
    in both new-transaction and loan-collection sliders.

### 10.4 Transaction totals and actual cash

-   AFN transaction totals remain in AFN.
-   USD transaction totals are converted using their saved transaction
    rate.
-   Sales totals include unpaid amounts; only actual receipts increase
    cash.
-   Purchase totals include unpaid amounts; only actual payments
    decrease cash.
-   Original-currency outstanding balances determine loan status and
    whether a loan is fully settled. AFN loan totals are valued using the
    transaction's saved rate, while cash movements keep each payment's
    saved payment-date AFN equivalent.
-   Customer receivables and supplier payables remain separate from the
    AFN cash balance.

The Purchases and Sales sections show cash-flow totals in AFN by summing
the AFN equivalent saved with each payment. These historical totals do
not use today's rate and do not represent additional cash balances.

------------------------------------------------------------------------

## 11. Personal Finance Tracker and Owner Transfers

The personal expense tracker should be embedded in the app but logically
and visually separated from business finances.

### 11.1 Personal finance features

-   Personal income.
-   Personal expenses.
-   Configurable personal categories.
-   Transaction date and description.
-   Amount and currency (the precise personal currency policy can be
    confirmed; the business expense tracker is AFN-only).
-   Monthly totals.
-   Personal income-versus-expense reports.
-   Optional budgets and savings goals.

### 11.2 Separation from business finances

Personal transactions must not be included in business sales, purchases,
business expenses, or business profit.

### 11.3 Owner withdrawals and contributions

When the owner takes money from the factory for personal use:

-   Record an owner withdrawal/draw.
-   Reduce the single AFN business cash balance.
-   Record the corresponding personal inflow if the owner wants it
    reflected in personal finance.
-   Do not classify the withdrawal as a business operating expense.

When the owner adds personal money to the factory:

-   Record an owner contribution.
-   Increase the single AFN business cash balance.
-   Do not classify it as sales revenue.

------------------------------------------------------------------------

## 12. Reports and Graphs

Each of the four main operating sections---Sales, Purchases, Production,
and Business Expenses---must include all of the following:

1.  Summary/total figures.
2.  A graph/dashboard visualization.
3.  A searchable history list.
4.  Filters and date ranges.
5.  A way to open a summary number and inspect the underlying records.

### 12.1 Sales reports

-   Total sales in AFN equivalent.
-   Sales by day/week/month/year.
-   Sales by customer.
-   KG sold over time.
-   Original-currency breakdown (AFN and USD).
-   Paid versus unpaid sales.
-   Customer balances.

### 12.2 Purchase reports

-   Total purchases in AFN equivalent.
-   Purchases by day/week/month/year.
-   Purchases by supplier.
-   Purchases by raw-material type.
-   KG purchased.
-   Original-currency breakdown.
-   Supplier balances, if applicable.

### 12.3 Production reports

-   Total finished product produced (KG).
-   Total raw materials consumed to date, broken down by material.
-   Production output over time.
-   Expected versus actual output.
-   Expected and actual loss.
-   Average yield/production efficiency.
-   Cost per KG and total production cost, if costing is enabled.
-   Finished-product inventory.

### 12.4 Business expense reports

-   Total expenses in AFN.
-   Expenses by category.
-   Expenses over time.
-   Expense history.
-   Daily, weekly, monthly, yearly, and custom date ranges.

### 12.5 Main business reports

A cross-section report may summarize:

-   Sales paid (AFN equivalent), excluding unpaid customer balances.
-   Purchases paid (AFN equivalent), excluding unpaid supplier balances.
-   Customer sales loans/receivables as a separate total.
-   Supplier purchase loans/payables as a separate total.
-   Business expenses (AFN).
-   Production quantities and costs.
-   Total AFN cash balance.
-   Owner withdrawals and contributions separately.

Do not label sales minus purchases as profit. A proper profit report
must account for cost of goods sold, inventory valuation, business
expenses, and other relevant costs.

### 12.6 Report index and drill-down behavior

Keep the existing Reports overview layout. Make each summary section
selectable and open a separate report index page for its data: purchases,
sales, supplier purchase loans, customer sales loans, business expenses,
production, finished-product stock, and cash movements. Purchase and sale
loan reports must remain separate.

Each report index page begins with a line chart showing the section's
progress over time, followed by a complete, scrollable record list in a
tabular format.

Clicking a dashboard number or graph point should open the relevant
underlying transaction list. For example, selecting Total Purchases
opens the purchases included in that total.

### 12.7 Export

Recommended report export options:

-   PDF.
-   Excel-compatible spreadsheet.
-   Date-range selection.
-   Optional print/share support.

------------------------------------------------------------------------

## 13. Notifications and Reminders

Notifications should be useful and conditional. They must check saved
records and current inventory rather than sending reminders regardless
of whether the task is complete.

### 13.1 Daily exchange-rate reminder

Default schedule: 6:00 AM every day.

-   Notify the owner to enter today's USD-to-AFN rate.
-   If today's rate has already been entered, skip the notification.
-   If not entered, send a reminder.
-   If still missing, the app may continue using the last saved rate
    while clearly warning that it is outdated.
-   Schedule and enable/disable setting should be configurable.

### 13.2 Daily production reminder

Default schedule: 4:00 PM, every day except Friday.

-   Notify the owner to enter today's raw materials consumed and
    finished product produced.
-   If today's production entry has already been saved, skip the
    notification.
-   If not entered, send a reminder.
-   The owner can configure the time and days, including Friday
    behavior.
-   Enable/disable setting should be available.

### 13.3 Low raw-material stock notification

-   Trigger when a material's stock falls below its configured minimum.
-   Show material name, current KG, and minimum KG.
-   Avoid repeated alerts while it remains below threshold.
-   Alert again if it returns above threshold and later falls below it.
-   Provide a shortcut to the material/purchase area.

### 13.4 Optional future notifications

-   Finished-product stock below its minimum.
-   Outstanding customer payment reminders.
-   Supplier payment reminders, if applicable.
-   Backup/synchronization failure warnings.

### 13.5 Notification settings

Provide a dedicated settings page where the owner can:

-   Enable/disable each notification type.
-   Set reminder times.
-   Select days of the week.
-   Configure production Friday behavior.
-   Configure low-stock thresholds per material.
-   Optionally configure a second reminder.
-   Review notification history.

Notifications require device permission. If notifications are disabled
at the operating-system level, the app should explain how to enable
them.

------------------------------------------------------------------------

## 14. Settings

The Settings area should include:

### 14.1 Business settings

-   Business name and profile.
-   Contact information.
-   Logo, if used.
-   Default reporting currency (AFN).
-   Language.
-   Date/time preferences.

### 14.2 Currency settings

-   Current USD-to-AFN rate.
-   Daily rate history.
-   Edit today's rate.
-   Display the date/time of the last rate entry.
-   Configure reminder time.
-   Define rounding rules for currency splits and AFN/USD conversion.

### 14.3 Inventory settings

-   Manage raw-material types.
-   Manage expected yield per KG for each material.
-   Manage minimum stock thresholds.
-   Manage finished product profile and threshold.
-   Manage units of measure.

### 14.4 Production settings

-   Production reminder time and days.
-   Friday exclusion setting.
-   Yield calculation behavior.
-   Waste/scrap handling policy.
-   Production-cost options.

### 14.5 Expense settings

-   Manage business expense categories.
-   Manage personal expense categories.

### 14.6 Notification settings

As described in Section 13.

### 14.7 Security settings

-   Change password/authentication details.
-   App lock/biometric lock where supported.
-   Session/sign-out controls.

### 14.8 Backup and data settings

-   Manual backup.
-   Automatic backup option.
-   Last backup timestamp/status.
-   Restore process with confirmation.
-   Export business data.
-   Export personal finance data.
-   Clear separation of business and personal data in exports.
-   Sync status if offline synchronization is supported.

Destructive operations such as restoring, deleting, or resetting
business data should require explicit confirmation.

------------------------------------------------------------------------

## 15. Data Integrity and Accounting Rules

These rules are important for trustworthy inventory and financial
reports.

### 15.1 Original transaction snapshots

For every buy, sale, payment, and currency conversion, preserve:

-   Original amount.
-   Original currency.
-   Transaction date/time.
-   Exchange rate used, if applicable.
-   AFN equivalent at the time.
-   Payment currency and payment amount.
-   Related customer/supplier.
-   Source transaction reference.

### 15.2 Historical rates

Never overwrite old transaction rates when the daily rate changes. A
corrected rate should affect new transactions only unless the owner
explicitly creates a correction/reversal.

### 15.3 Posted records

Posted financial and stock transactions should not be silently deleted
or rewritten. Corrections should use a reversal, adjustment, or
auditable edit process.

### 15.4 Stock movement ledger

Every stock change should have a source:

-   Purchase receipt.
-   Production consumption.
-   Production output.
-   Inventory adjustment.
-   Sales dispatch.
-   Return or correction.

The stock movement ledger should be the source of truth for inventory
balances.

### 15.5 Financial movement ledger

Every cash balance change should be recorded as a financial movement
linked to its source:

-   Sale payment received.
-   Purchase payment made.
-   Business expense paid.
-   Owner contribution.
-   Owner withdrawal.
-   Refund or correction.

### 15.6 Atomic operations

When a transaction changes multiple records, those changes should
succeed or fail together. For example, posting production should not
reduce raw-material stock without also recording finished output and
production history.

### 15.7 Negative inventory

Default recommendation: do not allow raw-material or finished-product
stock to become negative. Show a clear validation message and require
correction or an authorized adjustment.

### 15.8 Audit trail

Maintain a history of important changes, including:

-   Transaction creation and posting.
-   Reversals and adjustments.
-   Changes to material yield assumptions.
-   Changes to exchange rates.
-   Changes to minimum stock levels.
-   Settings changes.

------------------------------------------------------------------------

## 16. Offline Use, Synchronization, and Data Protection

Because the app is phone-first and used in a factory, unreliable
internet access should be considered.

Recommended requirements to validate:

-   Allow the owner to enter transactions while offline.
-   Store pending records securely on the device.
-   Synchronize when internet becomes available.
-   Avoid duplicate purchases, sales, production entries, or payments
    during synchronization.
-   Show pending/synchronized/error states.
-   Resolve conflicts safely, especially for cash and stock movements.
-   Encrypt sensitive data in transit and use secure local storage.
-   Back up data to a secure remote location when connected.
-   Provide a clear backup/restore workflow.

Offline support and the exact synchronization approach remain product
decisions to confirm.

------------------------------------------------------------------------

## 17. Suggested Technical Direction (Not Yet Approved)

A possible technology direction for a mobile-first application:

-   Flutter/Dart for the mobile application.
-   PostgreSQL for relational data.
-   Supabase or a comparable backend for authentication, database, and
    file storage.
-   Local database/cache for offline entry if offline support is
    required.
-   Server-side transaction handling for financial and inventory
    updates.

This is a proposal only. No technology choice has been approved, and no
implementation is included in this specification.

------------------------------------------------------------------------

## 18. Main Data Areas / Conceptual Database Entities

The eventual database may include entities such as:

### Identity and settings

-   Users/owner account.
-   Business profile.
-   App settings.
-   Notification preferences.
-   Audit log.

### Inventory and production

-   Material categories.
-   Raw materials.
-   Finished products.
-   Material yield configuration/history.
-   Stock movements.
-   Production batches/entries.
-   Production input lines.
-   Inventory adjustments.
-   Scrap/waste records, if reusable scrap is supported.

### Purchases and suppliers

-   Suppliers.
-   Purchases.
-   Purchase items.
-   Purchase payments.

### Sales and customers

-   Customers.
-   Sales.
-   Sale items.
-   Sale payments.
-   Sales returns, if supported.

### Finance

-   AFN cash account and financial movement ledger.
-   Financial transactions.
-   Currency rates and rate history.
-   Business expense categories.
-   Business expenses.
-   Owner contributions/withdrawals.
-   Customer receivables.
-   Supplier payables, if applicable.

### Personal finance

-   Personal categories.
-   Personal income/expense transactions.
-   Personal budgets, if enabled.
-   Personal savings goals, if enabled.

### Supporting data

-   Attachments/receipts.
-   Backup/synchronization records.
-   Notification delivery/history.

This is a conceptual entity list, not a finalized schema.

------------------------------------------------------------------------

## 19. Important Items Still to Confirm

The following details should be decided before implementation:

1.  **Actual finished product:** What exact plastic product does the
    factory manufacture?
2.  **Yield behavior:** Is expected output per KG additive when several
    materials are mixed, or does the factory use a fixed recipe/formula?
3.  **Scrap:** Is production waste discarded, or can some of it be
    reused?
4.  **Production loss:** Should the app allow output to exceed
    configured expected output and show a negative loss/efficiency
    variance?
The following currency choices are already agreed: the business keeps
one AFN cash balance; each sale or purchase uses one currency (AFN or
USD) for its prices and payments; partial payments use that same
currency; USD cents are supported; and USD-to-AFN conversion rounds to
the nearest whole AFN. Mixed-currency payments and separate USD cash are
out of scope.

5.  **Personal finance currency:** Should personal transactions support
    both AFN and USD, or AFN only?
6.  **Daily rate fallback:** If the owner misses the 6 AM rate entry,
    should the previous rate remain usable with a warning, or should
    conversion transactions be blocked until a new rate is entered?
7.  **Daily production completion:** If several production runs happen
    in one day, should the 4 PM reminder be skipped after the first
    entry, or only after the owner confirms all of today's production
    has been recorded?
8.  **Offline use:** Must the app work fully offline, or is internet
    usually available?
9.  **Language:** Is the app required in Dari, English, or both?
10. **Finished-stock threshold:** Should finished product also have a
    minimum-stock alert?
11. **Production overhead:** Should electricity, fuel, and maintenance
    be included in manufacturing cost per KG, or reported only as
    business expenses initially?

------------------------------------------------------------------------

## 20. Summary of the Agreed Product Direction

The application is a single-owner, phone-first plastic factory
management system with:

-   Configurable raw materials and expected production yield per KG.
-   Raw-material purchases and stock tracking.
-   Daily production entries recording material consumption and actual
    finished output.
-   Automatic expected-versus-actual production loss calculations.
-   Finished-product stock tracking.
-   Sales and customer records.
-   One AFN cash balance; USD sale and purchase payments are converted
    to AFN using the saved rate for each transaction or payment.
-   A daily 6 AM exchange-rate reminder, skipped if today's rate is
    already entered.
-   Automatic use of the saved daily rate in transactions that need
    conversion.
-   Historical transaction-specific exchange-rate snapshots.
-   Purchase and sales totals reported in AFN equivalents.
-   Business expenses recorded in AFN only.
-   A separate personal expense tracker.
-   Individual dashboards, graphs, summary figures, and searchable
    history lists for sales, purchases, production, and expenses.
-   Daily production reminder at 4 PM by default, excluding Fridays,
    with configurable timing and days.
-   Low raw-material stock notifications.
-   Authentication, settings, security, backups, and potential offline
    synchronization.
-   Reports with date filters, drill-down into source transactions, and
    export options.

This document records the current product requirements and agreed
decisions; update it when the product direction changes.
