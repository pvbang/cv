"""
Convert every CV HTML in html/ to a PDF in files/ using Playwright (Chromium headless).

Usage:
    python convert_pdf.py              # build all html/*.html
    python convert_pdf.py AIEngineer   # build only files whose name contains "AIEngineer"
Requirements: pip install playwright && python -m playwright install chromium
"""
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).parent


async def convert(name_filter: str = ""):
    html_files = sorted(p for p in (ROOT / "html").glob("*.html") if name_filter in p.name)
    if not html_files:
        print(f"ERROR: no HTML file in {ROOT / 'html'} matches '{name_filter}'")
        sys.exit(1)

    out_dir = ROOT / "files"
    out_dir.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch()
        except Exception as e:
            print(f"ERROR: Failed to launch Chromium: {e}")
            print("Run: python -m playwright install chromium")
            sys.exit(1)
        page = await browser.new_page()

        for html_path in html_files:
            pdf_path = out_dir / (html_path.stem + ".pdf")
            await page.goto(f"file:///{html_path.resolve().as_posix()}", wait_until="networkidle")
            # A4, no browser header/footer
            await page.pdf(
                path=str(pdf_path),
                format="A4",
                margin={"top": "12mm", "right": "13mm", "bottom": "12mm", "left": "13mm"},
                print_background=True,
                display_header_footer=False,
            )
            print(f"PDF generated successfully: {pdf_path.resolve()}")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(convert(sys.argv[1] if len(sys.argv) > 1 else ""))
