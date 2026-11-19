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
-   Multi-currency cash management
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
-   Current AFN cash.
-   Current USD cash.
-   Combined cash value in AFN using the latest saved rate.
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

Purchases record raw materials bought for the factory. The owner has
stated that supplier payments are cash-only. Purchases may be
priced/recorded in AFN or USD.

### 6.1 Purchase section dashboard

The purchase section should include summary figures, a graph, and a list
of purchase records.

Suggested summary figures:

-   Total purchases (AFN equivalent).
-   Purchases today.
-   Total KG of raw material purchased.
-   Supplier balances/outstanding amounts, if credit or partial
    settlement is supported.
-   Purchase totals by material.
-   Purchase totals by supplier.

The total purchase figure should include AFN purchases directly and USD
purchases converted to AFN using the exchange rate saved with each
transaction. Historical AFN equivalents must not change when the daily
rate changes.

### 6.2 Purchase currency entry

When entering the purchase section, present two separate currency
choices:

-   USD
-   AFN

Selecting a currency opens the corresponding purchase form.

### 6.3 Purchase form fields

Common fields:

-   Supplier.
-   Purchase date.
-   Material type.
-   Quantity in KG.
-   Price per KG in the selected transaction currency.
-   Calculated line total.
-   Optional multiple materials/items in one purchase.
-   Notes or reference number.
-   Payment details and payment status.

The form should clearly show the selected transaction currency and the
calculated total.

### 6.4 Payment currency and cash handling

The owner described a payment flow in which the app asks whether payment
was received/paid in the original transaction currency. The
corresponding cash-account logic is detailed in Section 10.

The same general principles should apply to purchases, with cash
outflows rather than inflows. The precise treatment of mixed payments,
partial payments, and any supplier credit should be confirmed before
implementation.

### 6.5 Purchase posting

When a purchase is posted:

-   Increase the relevant raw-material inventory by the purchased KG.
-   Record the purchase in purchase history.
-   Record the actual cash payment against the correct currency cash
    account(s).
-   Preserve original currency, amount, daily exchange rate used, and
    AFN equivalent.
-   Link the stock movement and cash movement to the purchase record.

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

Although the owner described supplier payments as cash-only, whether
purchases are always paid in full immediately or may be settled in
multiple cash payments remains to be confirmed.

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
-   Sales trend graph.
-   Sales by customer.
-   Sales by period.
-   Sales history list.

Total sales should be based on posted sales/invoices, not just cash
received. Partial or unpaid sales must still be represented as sales
while the unpaid portion remains a receivable.

### 8.2 Sale currency entry

When entering the sales section, present two separate currency choices:

-   USD
-   AFN

Selecting one opens its corresponding sales form.

### 8.3 Sales form

Fields should include:

-   Customer.
-   Sale date.
-   Finished product quantity in KG.
-   Price per KG in the selected transaction currency.
-   Calculated total.
-   Payment received and payment currency.
-   Notes/reference.
-   Payment status and remaining balance.

### 8.4 Payment currency

The app should distinguish the currency in which the sale is priced from
the currency physically received. The owner described asking whether the
customer pays in the original transaction currency. The detailed cash
conversion rules are in Section 10.

Support for mixed-currency payments and multiple/partial payments is
recommended, but the exact form behavior should be confirmed.

### 8.5 Sale posting and inventory

When a sale is posted:

-   Decrease finished-product inventory by the quantity sold.
-   Record the sale and its line items.
-   Record actual payment(s) in the appropriate cash account(s).
-   Record any unpaid amount as a customer receivable.
-   Preserve original sale currency, amount, and transaction-day
    exchange rate/AFN equivalent.
-   Link stock and cash movements to the sale.

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

## 10. Multi-Currency Cash Management and Exchange-Rate Rules

This is a core part of the application. The owner wants two separate
physical cash balances:

-   AFN cash.
-   USD cash.

The app should also display a combined total cash value in AFN.

### 10.1 Separate cash balances

Never merge the physical balances into one account.

Display:

-   AFN cash balance.
-   USD cash balance.
-   USD balance converted to AFN using the latest saved daily rate.
-   Combined cash value in AFN.

Example:

-   AFN cash: ؋100,000.
-   USD cash: \$500.
-   Current rate: 1 USD = ؋72.
-   USD equivalent: ؋36,000.
-   Combined cash value: ؋136,000.

Changing the current rate changes the displayed AFN valuation of USD
cash, not the physical USD amount or historical transactions.

### 10.2 Daily exchange rate

-   Daily reminder proposed at 6:00 AM.
-   Owner enters one USD-to-AFN rate for the day.
-   New buy/sell transactions use the current saved rate automatically
    whenever conversion is required.
-   No need to ask for the rate separately in every form when a valid
    rate exists.
-   Rate history must be retained.
-   A rate edited during the day applies to new transactions only.
-   Every transaction saves a snapshot of the rate it actually used.

### 10.3 Transaction currency versus payment currency

The currency selected for a sale or purchase is the transaction/original
currency. The currency actually received from a customer or paid to a
supplier determines which physical cash account changes.

The forms should ask whether the payment is made/received in the
original transaction currency. If not, use the saved daily exchange rate
to convert.

### 10.4 USD transaction paid in USD

The owner's stated rule:

-   Add the whole-dollar portion to USD cash.
-   Convert any fractional remainder (cents) to AFN using the daily
    rate.
-   Add that converted remainder to AFN cash.

Illustrative example at 72 AFN/USD:

-   USD payment: \$100.50.
-   USD cash increases by \$100.
-   AFN cash increases by ؋36 (the \$0.50 remainder converted at 72).

If the amount is a whole-dollar amount, all of it is added to USD cash
and no AFN cash is added.

### 10.5 USD transaction paid in AFN

-   Convert the payment value to AFN using the daily rate.
-   Add the resulting AFN amount to AFN cash.
-   Do not increase USD cash.

The exact rounding policy for AFN minor units should be defined. AFN
amounts are expected to be handled as whole Afghanis in the current
workflow.

### 10.6 AFN transaction paid in AFN

-   Add the entire AFN amount to AFN cash.
-   No exchange rate is required.
-   No USD cash is added.

The owner stated that AFN payments are always fixed/whole amounts and do
not require a fractional remainder conversion when paid in AFN.

### 10.7 AFN transaction paid in USD

The owner's stated rule:

-   Convert the AFN payment value to USD using the daily rate.
-   Add the whole-dollar portion to USD cash.
-   Convert the remaining AFN value into AFN cash and add it to AFN
    cash.

Illustrative example:

-   AFN amount: ؋10,000.
-   Rate: 72 AFN/USD.
-   Mathematical conversion: \$138.88...
-   USD cash increases by \$138.
-   Remaining value of ؋64 stays in AFN cash.

The exact rounding convention should be confirmed (for example, truncate
to whole dollars rather than round to the nearest dollar), because it
changes the allocation between the two cash accounts.

### 10.8 Combined cash value

The dashboard's combined cash value is:

`AFN cash + (USD cash × latest saved USD-to-AFN rate)`

This is a display valuation only. It does not physically convert USD
cash into AFN.

### 10.9 Purchases and sales totals in AFN

Each section must show totals in AFN even when the underlying
transactions are in USD.

Recommended historical reporting rule:

-   AFN transaction: AFN equivalent equals its AFN amount.
-   USD transaction: AFN equivalent is calculated using the
    daily/transaction rate saved with that transaction.
-   Preserve the original amount and currency.
-   Do not recalculate historical transaction equivalents when a new
    daily rate is entered.

Thus, total sales and total purchases can be shown in AFN by adding the
AFN equivalents of all relevant posted transactions.

### 10.10 Cash versus sales/purchase totals

Keep these concepts separate:

-   Sales total: based on posted sales, including unpaid amounts.
-   Purchase total: based on posted purchases, not merely cash paid.
-   Cash balance: based only on actual money received or paid.
-   Receivables: customer amounts still owed.
-   Payables: supplier amounts still owed, if supplier credit is
    supported.

A credit sale increases sales and customer receivables but does not
increase cash until payment is received. A purchase paid later increases
purchases and may create a supplier payable, while cash decreases only
when payment is made.

### 10.11 Currency exchange transactions

If the owner physically exchanges USD for AFN or AFN for USD, record it
as a separate currency-exchange transaction:

-   Source currency and amount.
-   Destination currency and amount.
-   Actual exchange rate.
-   Date.
-   Optional fees.
-   Cash account decreases in the source currency and increases in the
    destination currency.

A currency exchange is not a sale, purchase, or business expense.

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
-   Reduce the relevant business cash account.
-   Record the corresponding personal inflow if the owner wants it
    reflected in personal finance.
-   Do not classify the withdrawal as a business operating expense.

When the owner adds personal money to the factory:

-   Record an owner contribution.
-   Increase the relevant business cash account.
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

-   Sales (AFN equivalent).
-   Purchases (AFN equivalent).
-   Business expenses (AFN).
-   Production quantities and costs.
-   Cash balances by currency.
-   Combined cash valuation in AFN.
-   Customer receivables.
-   Supplier payables, if supported.
-   Owner withdrawals and contributions separately.

Do not label sales minus purchases as profit. A proper profit report
must account for cost of goods sold, inventory valuation, business
expenses, and other relevant costs.

### 12.6 Drill-down behavior

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
-   Currency exchange.
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

-   Cash accounts (AFN and USD).
-   Financial transactions.
-   Currency rates and rate history.
-   Currency exchange transactions.
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
5.  **Currency rounding:** For AFN paid in USD, should the USD amount
    always be truncated to whole dollars, with the remainder retained in
    AFN? Confirm the exact rounding rule.
6.  **USD cents:** Does the owner actually receive/pay cents, or should
    the app only accept whole-dollar cash amounts?
7.  **Mixed payments:** Can one sale or purchase be settled through
    multiple payments in AFN and USD, or should each transaction have
    only one payment currency at a time?
8.  **Partial payment:** Can customers pay later or in installments?
    Supplier purchases were described as cash-only, but it remains
    unclear whether suppliers can be paid partially.
9.  **Personal finance currency:** Should personal transactions support
    both AFN and USD, or AFN only?
10. **Daily rate fallback:** If the owner misses the 6 AM rate entry,
    should the previous rate remain usable with a warning, or should
    conversion transactions be blocked until a new rate is entered?
11. **Daily production completion:** If several production runs happen
    in one day, should the 4 PM reminder be skipped after the first
    entry, or only after the owner confirms all of today's production
    has been recorded?
12. **Offline use:** Must the app work fully offline, or is internet
    usually available?
13. **Language:** Is the app required in Dari, English, or both?
14. **Finished-stock threshold:** Should finished product also have a
    minimum-stock alert?
15. **Production overhead:** Should electricity, fuel, and maintenance
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
-   Separate AFN and USD physical cash balances.
-   A combined cash valuation displayed in AFN using the latest daily
    rate.
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

**No implementation has been started or specified by this document.**
This is the planning and requirements baseline for discussion and
approval before development.
