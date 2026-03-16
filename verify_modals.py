import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.goto("http://localhost:3000")

        # Hide the auth screen forcefully
        await page.evaluate("""() => {
            const authContainer = document.getElementById('auth-container');
            if(authContainer) authContainer.classList.add('hidden');
        }""")

        # Wait a bit for transition
        await page.wait_for_timeout(500)

        # Unhide the welcome modal forcefully
        await page.evaluate("""() => {
            const el = document.getElementById('welcome-modal');
            if(el) el.classList.remove('hidden');
        }""")

        await page.wait_for_timeout(500)
        await page.screenshot(path="welcome_modal_real.png")

        # Hide the welcome modal
        await page.evaluate("""() => {
            const el = document.getElementById('welcome-modal');
            if(el) el.classList.add('hidden');
        }""")

        # Unhide the log period modal forcefully
        await page.evaluate("""() => {
            const el = document.getElementById('log-period-modal');
            if(el) el.classList.remove('hidden');
        }""")

        await page.wait_for_timeout(500)
        await page.screenshot(path="log_period_modal_real.png")

        await browser.close()

asyncio.run(main())
