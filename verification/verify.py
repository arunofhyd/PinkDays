from playwright.sync_api import sync_playwright
import datetime

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # 1. Load Page
        print("Loading page...")
        page.goto("http://localhost:8000")

        try:
            page.locator("#offline-btn").click(timeout=5000)
        except:
            print("Offline button not found.")

        page.locator("#app-wrapper").wait_for(state="visible")

        # Close Welcome Modal
        try:
            if page.locator("#welcome-modal").is_visible(timeout=2000):
                page.locator("#close-welcome-btn").click()
        except:
            pass

        # Toggle Dark Mode
        print("Toggling Dark Mode...")
        page.locator("button[data-tab='settings']").click()
        page.wait_for_timeout(500)
        page.locator("#dark-mode-toggle").click()

        # 2. Log Today (Mood + Symptom + Flow)
        print("Logging Today...")
        page.locator("button[data-tab='calendar']").click()
        page.wait_for_timeout(500)
        page.locator("#log-period-btn").click()
        page.locator("#log-period-modal").wait_for(state="visible")

        page.select_option("select[data-type='mood']", "Happy")
        page.check("input[value='Cramps']")

        # Select Flow: Medium
        # The buttons are generated. Need to find the one for today.
        # Since range is today-today, there is only one row.
        page.locator("button[data-flow='medium']").click()

        page.locator("#save-log-btn").click()
        page.wait_for_timeout(1000)

        page.screenshot(path="verification/calendar_today.png")

        # 3. Log Past Period (Last Month)
        print("Logging Past Period...")
        # Go to previous month
        page.locator("#prev-month-btn").click()
        page.wait_for_timeout(500)

        # Click day 15
        page.locator("text='15'").first.click()
        page.locator("#log-period-modal").wait_for(state="visible")

        # Select Flow: Medium
        page.locator("button[data-flow='medium']").click()

        page.locator("#save-log-btn").click()
        page.wait_for_timeout(1000)

        # 4. Check Stats for Chart
        print("Go to Stats...")
        page.locator("button[data-tab='stats']").click()

        print("Opening Detailed Analysis...")
        page.locator("#show-analysis-btn").click()
        page.wait_for_timeout(1000)

        page.screenshot(path="verification/stats_chart_final.png")

        browser.close()

if __name__ == "__main__":
    run()
