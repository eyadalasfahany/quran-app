from pathlib import Path

html = Path(r"d:\projects\quran-app\quran-app-screens.html").read_text(encoding="utf-8")
start = html.find('id="SibhaResetDialog"')
end = html.find('id="SibhaResetDialogDark"')
Path(r"d:\projects\quran-app\tmp\sibha-reset-dialog.html").write_text(html[start - 20 : end], encoding="utf-8")
print("wrote", end - start, "chars")
